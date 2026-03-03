import { io } from 'socket.io-client';
import { SERVER_URL } from './runtimeConfig';

export const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 10,
});
