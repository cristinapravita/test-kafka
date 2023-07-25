import React, { useEffect, useState } from 'react';
import axios from 'axios';
import useSocket from './useSocket';

const App = () => {
  const socket = useSocket('http://localhost:3001'); // Connect to the Express server

  const [data, setData] = useState([]);

  useEffect(() => {
    if (!socket) return;

    // Subscribe to the 'data' event from the server
    socket.on('data', (data) => {
      console.log('Received data from server:', data.message);
      setData((prevData) => [...prevData, data.message]);
    });

    return () => {
      // Clean up the socket listener when the component unmounts
      socket.off('data');
    };
  }, [socket]);

  const [inputValue, setInputValue] = useState('');

  const sendDataToServer = () => {
    if (!inputValue) {
      console.error('Input data is empty. Please enter some data.');
      return;
    }
    const url = 'http://localhost:3001/send-data';
    const data = { data: inputValue };

    axios
      .post(url, data)
      .then((response) => {
        console.log(response.data.message);
        setInputValue(''); // Clear the input field after sending data
      })
      .catch((error) => {
        console.error('Error sending data to server:', error);
      });
  };

  const handleChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      sendDataToServer();
    }
  };

  return (
    <div>
      <div>
        <h1>Input Kafka Data:</h1>
        <input type="text" value={inputValue} onChange={handleChange} onKeyPress={handleKeyPress} />
        <button onClick={sendDataToServer}>Send Data</button>
      </div>
      <div>
        <h1>Kafka Data:</h1>
        <ul>
          {data.map((message, index) => (
            <li key={index}>{message}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default App;