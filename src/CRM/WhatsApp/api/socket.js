// src/api/socket.js
import { io } from "socket.io-client";
import { config } from "../../../config/env";

export const socket = io(config.WS_URL, {
  transports: ["websocket"],
});
