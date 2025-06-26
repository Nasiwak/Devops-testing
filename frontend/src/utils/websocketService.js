let socket = null;

export const getWebSocket = (roomName) => {
    if (!socket || socket.readyState === WebSocket.CLOSED) {
        socket = new WebSocket(`ws://192.168.0.121:8000/ws/chat/${roomName}/`);
        console.log("WebSocket Connected to:", roomName);

        socket.onopen = () => console.log("WebSocket connection opened.");
        socket.onclose = () => console.log("WebSocket connection closed.");
        socket.onerror = (error) => console.error("WebSocket Error:", error);
    }
    return socket;
};
