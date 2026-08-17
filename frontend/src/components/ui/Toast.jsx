import { useEffect, useState } from 'react'

const ICONS = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
}

const STYLES = {
    success: 'border-green-500/30 bg-green-500/10 text-green-300',
    error: 'border-error/30 bg-error/10 text-red-300',
    warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
    info: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
}

const Toast = ({ message, type = 'info', duration = 4000, onClose }) => {
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false)
            setTimeout(onClose, 300)
        }, duration)
        return () => clearTimeout(timer)
    }, [duration, onClose])

    return (
        <div
            className={`
                flex items-start gap-3 px-4 py-3 rounded-xl border
                shadow-modal text-sm font-medium max-w-sm w-full
                transition-all duration-300
                ${STYLES[type]}
                ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
            `}
        >
            <span className="text-base flex-shrink-0">{ICONS[type]}</span>
            <p className="flex-1 leading-snug">{message}</p>
            <button
                onClick={() => {
                    setVisible(false)
                    setTimeout(onClose, 300)
                }}
                className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
                ✕
            </button>
        </div>
    )
}

// ─── Toast Container ──────────────────────────────────────────────────────────
// Renders all active toasts in the bottom-right corner.
// Usage: import { useToast } from the ToastContext below.

export const ToastContainer = ({ toasts, removeToast }) => {
    if (toasts.length === 0) return null

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    )
}

export default Toast