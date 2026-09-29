import { useState, useCallback, createContext, useContext } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import { ToastContainer } from '../ui/Toast'

const ToastContext = createContext(null)

export const useToast = () => {
    const context = useContext(ToastContext)
    if (!context) throw new Error('useToast must be used inside Layout')
    return context
}

const Layout = ({ children }) => {
    const [toasts, setToasts] = useState([])

    const showToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = 'toast_' + Date.now() + '_' + Math.random()
        setToasts((prev) => [...prev, { id, message, type, duration }])
    }, [])

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ showToast }}>
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>

                {/* Fixed top navbar — see Navbar.jsx for why position:fixed
                    rather than sticky */}
                <Navbar />

                {/* Page content — paddingTop reserves the 64px the fixed
                    navbar occupies, since it no longer takes up layout
                    flow space itself */}
                <main style={{ flex: 1, paddingTop: 64 }}>
                    {children}
                </main>

                {/* Shared site footer */}
                <Footer />

                {/* Global toast notifications */}
                <ToastContainer toasts={toasts} removeToast={removeToast} />
            </div>
        </ToastContext.Provider>
    )
}

export default Layout