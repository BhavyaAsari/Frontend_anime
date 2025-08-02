const isLocalDevelopment = 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1' ||
  window.location.port === '5500';

export const BASE_URL = isLocalDevelopment
  ? 'http://localhost:3000'                    // Your local backend
  : 'https://animehub-server.onrender.com';    // Your deployed backend
