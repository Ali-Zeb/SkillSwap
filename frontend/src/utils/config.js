/**
 * Central configuration constants derived from environment variables.
 *
 * All files that previously hard-coded 'http://localhost:5000' should
 * import API_BASE_URL from here instead.  Vite exposes any variable
 * prefixed with VITE_ at build time via import.meta.env.
 *
 * .env (development)
 *   VITE_API_URL=http://localhost:5000
 *   VITE_SOCKET_URL=http://localhost:5000
 *
 * .env.production
 *   VITE_API_URL=https://your-production-domain.com
 *   VITE_SOCKET_URL=https://your-production-domain.com
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
export const SOCKET_URL   = import.meta.env.VITE_SOCKET_URL || API_BASE_URL