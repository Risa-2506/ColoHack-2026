/**
 * =============================================
 *  WardWatch – Centralized API Configuration
 * =============================================
 *
 * HOW TO SWITCH BETWEEN LOCAL AND NGROK:
 *   1. Change BASE_URL to your ngrok URL when using the public tunnel.
 *   2. Leave it as http://localhost:5000/api for local development.
 *
 * Example ngrok URL: https://abc123.ngrok.io/api
 */

// ✏️  EDIT THIS LINE ONLY to switch between local and ngrok
export const BASE_URL = 'http://localhost:5000/api';

// ✏️  EDIT THIS LINE ONLY to switch the WebSocket server
//     It must point to the same host as BASE_URL (without /api)
export const SOCKET_URL = 'http://localhost:5000';
