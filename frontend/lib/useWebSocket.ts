import { useEffect, useRef, useState } from "react";

export type WSMessage = {
  type: string;
  [key: string]: unknown;
};

const WS_BASE_URL = "ws://127.0.0.1:8000";

export function useWebSocket(onMessage: (msg: WSMessage) => void) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const socket = new WebSocket(`${WS_BASE_URL}/ws?token=${token}`);
    socketRef.current = socket;

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessageRef.current(data);
      } catch {
        // ignore malformed messages
      }
    };

    return () => {
      socket.close();
    };
  }, []);

  return { connected };
}
