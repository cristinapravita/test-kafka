// useSocket.js
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const useSocket = (serverUrl) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false); // Track connection status

  useEffect(() => {
    const socketInstance = io(serverUrl);
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setIsConnected(true); // Set the connection status to true when connected
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false); // Set the connection status to false when disconnected
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [serverUrl]);

  return { socket, isConnected }; // Return socket and connection status
};

export default useSocket;