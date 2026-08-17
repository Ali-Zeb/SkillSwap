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

export default api