import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: false,
})

api.interceptors.request.use(function(config) {
  const token = sessionStorage.getItem('skillswap_token')
  if (token) {
    config.headers.Authorization = 'Bearer ' + token
  }
  return config
})

// Server-side sign-outs: a deactivated account, or a token revoked by a
// password reset, is signed out on its next API call.
const SIGN_OUT_CODES = {
  ACCOUNT_DEACTIVATED: 'deactivated=1',
  TOKEN_REVOKED:       'expired=1',
}

api.interceptors.response.use(
  function(response) { return response },
  function(error) {
    const code = error.response?.data?.code
    if (error.response?.status === 401 && SIGN_OUT_CODES[code]) {
      sessionStorage.removeItem('skillswap_token')
      sessionStorage.removeItem('skillswap_user')
      if (window.location.pathname !== '/login') {
        window.location.assign('/login?' + SIGN_OUT_CODES[code])
      }
    }
    return Promise.reject(error)
  }
)

export default api