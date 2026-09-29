import api from '../api/axios'

/**
 * Downloads a server-generated file (e.g. CSV) through the authenticated
 * API client and saves it with the filename from Content-Disposition.
 * Throws an Error with the server's message on failure.
 */
export const downloadFile = async function(path, params, fallbackName) {
    try {
        const response = await api.get(path, { params, responseType: 'blob' })
        const disposition = response.headers['content-disposition'] || ''
        const match = disposition.match(/filename="?([^";]+)"?/)
        const url = URL.createObjectURL(response.data)
        const a = document.createElement('a')
        a.href = url
        a.download = match ? match[1] : fallbackName
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(function() { URL.revokeObjectURL(url) }, 10000)
    } catch (err) {
        // Error bodies arrive as a Blob when responseType is 'blob'.
        let message = 'Download failed'
        const data = err.response?.data
        if (data instanceof Blob) {
            try { message = JSON.parse(await data.text()).message || message } catch { /* not JSON */ }
        }
        throw new Error(message, { cause: err })
    }
}
