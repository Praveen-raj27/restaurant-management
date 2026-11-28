
import { io } from "socket.io-client";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/api/v1";

const SOCKET_URL = new URL(API_BASE_URL).origin;

let socket = null;
let currentAccessToken = null;

export const getRestaurantSocket = (accessToken) => {
  if (!accessToken) {
    return null;
  }

  // Reuse the existing connection when the token is unchanged.
  if (
    socket &&
    currentAccessToken === accessToken
  ) {
    return socket;
  }

  // Replace the connection if the token changes.
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  currentAccessToken = accessToken;

  socket = io(SOCKET_URL, {
    auth: {
      accessToken,
    },
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return socket;
};

export const disconnectRestaurantSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  currentAccessToken = null;
};
