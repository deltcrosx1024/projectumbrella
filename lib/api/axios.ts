import axios from 'axios';

// Axios instance used for app-level REST communication.
// The baseURL is set to the built-in Next.js API routes.
export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});
