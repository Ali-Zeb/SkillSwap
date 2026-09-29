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

// A deactivated account is signed out everywhere on its next API call.
api.interceptors.response.use(
  function(response) { return response },
  function(error) {
    const data = error.response?.data
    if (error.response?.status === 401 && data?.code === 'ACCOUNT_DEACTIVATED') {
      sessionStorage.removeItem('skillswap_token')
      sessionStorage.removeItem('skillswap_user')
      if (window.location.pathname !== '/login') {
        window.location.assign('/login?deactivated=1')
      }
    }
    return Promise.reject(error)
  }
)

export default api