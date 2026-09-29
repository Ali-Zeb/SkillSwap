/**
 * Records a SkillSwap session as one composed video: a canvas that draws
 * the shared screen or remote participant large with camera overlays, plus
 * a Web Audio mix of every available audio track (local mic + remote).
 *
 * It never touches the peer connection. Media is read through getters each
 * frame, so streams that appear, change, or disappear mid-recording (remote
 * user leaving/rejoining, screen share toggled) are picked up automatically.
 *
 * Usage:
 *   const rec = createSessionRecorder({ getSources, fileName, onError, onStop })
 *   await rec.start(); ... rec.stop()   // stop() downloads the file
 *
 * getSources() must return:
 *   { localStream, remoteStream, screenStream,
 *     localVideoOff, remoteVideoOff, remoteSharing, remoteConnected,
 *     localName, remoteName }
 */

const WIDTH  = 1280
const HEIGHT = 720
const FPS    = 30

const MIME_CANDIDATES = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
]

export const pickMimeType = function() {
    if (typeof MediaRecorder === 'undefined') return null
    return MIME_CANDIDATES.find(function(t) { return MediaRecorder.isTypeSupported(t) }) || null
}

export const isRecordingSupported = function() {
    return typeof MediaRecorder !== 'undefined' &&
        typeof HTMLCanvasElement !== 'undefined' &&
        typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
        pickMimeType() !== null
}

// A worker-driven tick keeps drawing when the tab is in the background,
// where requestAnimationFrame stops and main-thread timers are throttled.
const createTicker = function(onTick) {
    const src = 'let id=null;onmessage=function(e){if(e.data.start){clearInterval(id);id=setInterval(function(){postMessage(0)},e.data.ms)}else{clearInterval(id)}}'
    let worker = null
    let fallbackId = null
    try {
        const url = URL.createObjectURL(new Blob([src], { type: 'application/javascript' }))
        worker = new Worker(url)
        URL.revokeObjectURL(url)
        worker.onmessage = onTick
        worker.postMessage({ start: true, ms: Math.round(1000 / FPS) })
    } catch {
        fallbackId = setInterval(onTick, Math.round(1000 / FPS))
    }
    return function stopTicker() {
        if (worker) { worker.postMessage({ start: false }); worker.terminate() }
        if (fallbackId) clearInterval(fallbackId)
    }
}

// Hidden <video> element per source stream, owned by the recorder so page
// re-renders (which remount the visible video elements) can't interrupt it.
const createVideoSource = function() {
    const el = document.createElement('video')
    el.muted       = true
    el.playsInline = true
    el.autoplay    = true
    let current = null
    return {
        el,
        // Returns true when there is a live, enabled video frame to draw.
        update: function(stream) {
            const track = stream ? stream.getVideoTracks()[0] : null
            if (!track || track.readyState !== 'live') {
                if (current) { el.srcObject = null; current = null }
                return false
            }
            if (current !== stream) {
                current = stream
                el.srcObject = stream
                el.play().catch(function() {})
            }
            return track.enabled && el.readyState >= 2 && el.videoWidth > 0
        },
        // Resolves once the element has a decodable frame (or after timeoutMs).
        ready: function(timeoutMs) {
            if (!current || (el.readyState >= 2 && el.videoWidth > 0)) return Promise.resolve()
            return new Promise(function(resolve) {
                const done = function() { el.removeEventListener('loadeddata', done); clearTimeout(t); resolve() }
                const t = setTimeout(done, timeoutMs)
                el.addEventListener('loadeddata', done)
            })
        },
        destroy: function() { el.srcObject = null; current = null },
    }
}

const WARMUP_MS = 1500

// Draws `video` into the box, letterboxed to preserve aspect ratio.
const drawContain = function(ctx, video, x, y, w, h) {
    const vr = video.videoWidth / video.videoHeight
    const br = w / h
    let dw = w, dh = h
    if (vr > br) dh = w / vr
    else dw = h * vr
    ctx.drawImage(video, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

const drawPlaceholder = function(ctx, name, x, y, w, h, small) {
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(x, y, w, h)
    const r = Math.min(w, h) * (small ? 0.22 : 0.12)
    ctx.fillStyle = '#334155'
    ctx.beginPath()
    ctx.arc(x + w / 2, y + h / 2 - (small ? 8 : 20), r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#e2e8f0'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '600 ' + Math.round(r) + 'px Inter, system-ui, sans-serif'
    ctx.fillText((name || '?').charAt(0).toUpperCase(), x + w / 2, y + h / 2 - (small ? 8 : 20))
    ctx.font = '500 ' + (small ? 14 : 24) + 'px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#cbd5e1'
    ctx.fillText(name || 'Participant', x + w / 2, y + h / 2 + r + (small ? 6 : 10))
}

const drawLabel = function(ctx, text, x, y) {
    ctx.font = '500 14px Inter, system-ui, sans-serif'
    const w = ctx.measureText(text).width + 16
    ctx.fillStyle = 'rgba(15,23,42,0.7)'
    ctx.fillRect(x, y, w, 24)
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x + 8, y + 12)
}

export const createSessionRecorder = function({ getSources, fileName, onError, onStop }) {
    const mimeType = pickMimeType()
    const canvas   = document.createElement('canvas')
    canvas.width   = WIDTH
    canvas.height  = HEIGHT
    const ctx      = canvas.getContext('2d')

    const localCam  = createVideoSource()
    const remoteVid = createVideoSource()
    const screenVid = createVideoSource()

    const AudioCtx  = window.AudioContext || window.webkitAudioContext
    const audioCtx  = new AudioCtx()
    const audioDest = audioCtx.createMediaStreamDestination()
    // Keeps the destination producing (silent) audio even with no inputs,
    // so the recorded file always has a valid audio track.
    const silence   = audioCtx.createConstantSource()
    const silentGain = audioCtx.createGain()
    silentGain.gain.value = 0
    silence.connect(silentGain).connect(audioDest)
    silence.start()
    const audioNodes = new Map()   // track.id -> MediaStreamAudioSourceNode

    let recorder   = null
    let stopTicker = null
    let chunks     = []
    let stopped    = false

    const syncAudio = function(streams) {
        const live = new Map()
        streams.forEach(function(stream) {
            if (!stream) return
            stream.getAudioTracks().forEach(function(t) { if (t.readyState === 'live') live.set(t.id, t) })
        })
        live.forEach(function(track, id) {
            if (audioNodes.has(id)) return
            try {
                const node = audioCtx.createMediaStreamSource(new MediaStream([track]))
                node.connect(audioDest)
                audioNodes.set(id, node)
            } catch (err) {
                console.error('Recorder: could not add audio track', err)
            }
        })
        audioNodes.forEach(function(node, id) {
            if (!live.has(id)) { node.disconnect(); audioNodes.delete(id) }
        })
    }

    const drawFrame = function() {
        const s = getSources()
        const hasLocal  = localCam.update(s.localStream) && !s.localVideoOff
        const hasRemote = s.remoteConnected && remoteVid.update(s.remoteStream) && !s.remoteVideoOff
        const hasScreen = screenVid.update(s.screenStream)
        if (!s.remoteConnected) remoteVid.update(null)

        ctx.fillStyle = '#0f172a'
        ctx.fillRect(0, 0, WIDTH, HEIGHT)

        const PIP_W = 256, PIP_H = 144, M = 16
        const pips = []

        if (hasScreen) {
            // I am sharing: my screen is the stage; both cameras as overlays.
            drawContain(ctx, screenVid.el, 0, 0, WIDTH, HEIGHT)
            drawLabel(ctx, s.localName + ' (screen)', M, M)
            // Own camera stays bottom-right in every layout; partner stacks above it.
            pips.push({ video: hasLocal ? localCam.el : null, name: s.localName })
            if (s.remoteConnected) pips.push({ video: hasRemote ? remoteVid.el : null, name: s.remoteName })
        } else if (s.remoteConnected) {
            // Partner large (their camera, or their screen when they share); me as overlay.
            if (hasRemote) drawContain(ctx, remoteVid.el, 0, 0, WIDTH, HEIGHT)
            else drawPlaceholder(ctx, s.remoteName, 0, 0, WIDTH, HEIGHT, false)
            drawLabel(ctx, s.remoteName + (s.remoteSharing ? ' (screen)' : ''), M, M)
            pips.push({ video: hasLocal ? localCam.el : null, name: s.localName })
        } else {
            // Alone in the room: my camera fills the stage.
            if (hasLocal) drawContain(ctx, localCam.el, 0, 0, WIDTH, HEIGHT)
            else drawPlaceholder(ctx, s.localName, 0, 0, WIDTH, HEIGHT, false)
            drawLabel(ctx, s.localName, M, M)
        }

        pips.forEach(function(p, i) {
            const x = WIDTH - M - PIP_W
            const y = HEIGHT - M - PIP_H - i * (PIP_H + M)
            ctx.fillStyle = '#0f172a'
            ctx.fillRect(x - 2, y - 2, PIP_W + 4, PIP_H + 4)
            if (p.video) drawContain(ctx, p.video, x, y, PIP_W, PIP_H)
            else drawPlaceholder(ctx, p.name, x, y, PIP_W, PIP_H, true)
            drawLabel(ctx, p.name, x + 6, y + PIP_H - 30)
        })

        syncAudio([s.localStream, s.remoteConnected ? s.remoteStream : null, s.screenStream])
    }

    const tick = function() {
        try { drawFrame() } catch (err) { console.error('Recorder frame failed:', err) }
    }

    const cleanup = function() {
        if (stopTicker) { stopTicker(); stopTicker = null }
        audioNodes.forEach(function(node) { node.disconnect() })
        audioNodes.clear()
        try { silence.stop() } catch { /* already stopped */ }
        audioCtx.close().catch(function() {})
        localCam.destroy(); remoteVid.destroy(); screenVid.destroy()
    }

    const download = function() {
        if (chunks.length === 0) return
        const type = mimeType.split(';')[0]
        const blob = new Blob(chunks, { type })
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href     = url
        a.download = fileName + (type === 'video/mp4' ? '.mp4' : '.webm')
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(function() { URL.revokeObjectURL(url) }, 10000)
        chunks = []
    }

    return {
        mimeType,
        // Async: waits (≤1.5 s) for the source videos to decode their first
        // frame so the recording doesn't open with "camera off" placeholders.
        start: async function() {
            const s = getSources()
            localCam.update(s.localStream)
            if (s.remoteConnected) remoteVid.update(s.remoteStream)
            screenVid.update(s.screenStream)
            await Promise.all([localCam.ready(WARMUP_MS), remoteVid.ready(WARMUP_MS), screenVid.ready(WARMUP_MS)])
            if (stopped) return false   // stop() was called during warm-up; cleanup already ran

            tick()   // paint the first frame before the recorder starts
            stopTicker = createTicker(tick)
            await audioCtx.resume().catch(function() {})
            const videoTrack = canvas.captureStream(FPS).getVideoTracks()[0]
            const mixed = new MediaStream([videoTrack, ...audioDest.stream.getAudioTracks()])
            recorder = new MediaRecorder(mixed, { mimeType, videoBitsPerSecond: 2_500_000 })
            recorder.ondataavailable = function(e) { if (e.data && e.data.size > 0) chunks.push(e.data) }
            recorder.onerror = function(e) { if (onError) onError(e.error || new Error('Recording failed')) }
            recorder.onstop = function() {
                videoTrack.stop()
                download()
                cleanup()
                if (onStop) onStop()
            }
            recorder.start(1000)
            return true
        },
        stop: function() {
            if (stopped) return
            stopped = true
            if (recorder && recorder.state !== 'inactive') recorder.stop()
            else { cleanup(); if (onStop) onStop() }
        },
    }
}

// "SkillSwap-React-Basics-2026-09-29" — safe for every OS.
export const recordingFileName = function(sessionTitle) {
    const title = String(sessionTitle || 'Session')
        .normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'Session'
    const d = new Date()
    const pad = function(n) { return String(n).padStart(2, '0') }
    return 'SkillSwap-' + title + '-' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}
