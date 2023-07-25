// useSocket.js
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const useSocket = (serverUrl) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const socketInstance = io(serverUrl);
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [serverUrl]);

  return socket;
};

export default useSocket;
