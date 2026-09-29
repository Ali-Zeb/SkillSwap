import { useState } from 'react'
import api from '../api/axios'

/**
 * Shared "resend verification email" action for the check-inbox, verify
 * and login pages. The server always replies with the same generic
 * message, so this only distinguishes sent / rate-limited / failed.
 */
const useResendVerification = function() {
    const [status,  setStatus]  = useState('idle')   // idle | sending | sent | error
    const [message, setMessage] = useState(null)

    const resend = async function(email) {
        if (!email) return
        setStatus('sending')
        setMessage(null)
        try {
            const { data } = await api.post('/auth/resend-verification', { email })
            setStatus('sent')
            setMessage(data.message)
        } catch (err) {
            setStatus('error')
            setMessage(err.response?.data?.message || 'Could not send the email. Please try again.')
        }
    }

    return { resend, status, message }
}

export default useResendVerification
