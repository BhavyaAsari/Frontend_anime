const isLocalhost = window.location.hostname === 'localhost';

export const BASE_URL = isLocalhost
  ? 'http://localhost:3000' // Your local backend
  : 'https://animehub-server.onrender.com';