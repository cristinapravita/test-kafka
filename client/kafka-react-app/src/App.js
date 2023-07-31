import React, { useEffect, useState } from 'react';
import axios from 'axios';
import useSocket from './useSocket';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';

const App = () => {
  const { socket, isConnected } = useSocket('localhost:3001');

  const [data, setData] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [inputTopup, setInputTopup] = useState(0);
  const [balance, setBalance] = useState(1000);

  const swapElements = (arr, i1, i2) => {
    // Step 1
    let temp = arr[i1];
  
    // Step 2
    arr[i1] = arr[i2];
  
    // Step 3
    arr[i2] = temp;
  }
  
  var money = balance.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1.");
  // Fetch buffered data when the connection is established or reestablished
  const fetchData = () => {
    axios
      .get('http://localhost:3001/get-buffered-data')
      .then((response) => {
        const { data, balance } = response.data;
        console.log(`fetch data : ${data}`)
        setData(data);
        setBalance(balance);
      })
      .catch((error) => {
        console.error('Error fetching buffered data:', error);
      });
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('data', (data) => {
      if(data.message) {
        console.log('Received data from server:', data.message);
        setData((prevData) => [...prevData, data.message]);
      }

      console.log('Updated payment from server:', data.balance);
      setBalance(data.balance);
    });

    return () => {
      socket.off('data');
    };
  }, [socket]);

  useEffect(() => {
    console.log('masuk di reconnected socket')
    fetchData();
  }, [isConnected])

  const sendDataToServer = () => {
    if (balance <= 0 || (balance-100 < 0)) return;
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
        setInputValue('');
      })
      .catch((error) => {
        console.error('Error sending data to server:', error);
      });
  };

  const topUpBalance = () => {
    if (inputTopup <= 0) {
      console.error('can\'t top up 0');
      return;
    }
    const url = 'https://localhost:3001/send-data';
    const data = { balance: inputTopup };

    axios
      .post(url, data)
      .then((response) => {
        console.log(response.data.message);
        setBalance(response.data.balance);
        setInputTopup(0);
      })
      .catch((error) => {
        console.error('Error top up to server:', error);
      });
  };

  const handleChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleChangeTopup = (event) => {
    setInputTopup(event.target.value);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      sendDataToServer();
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">Balance: IDR {balance.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1.')} <Button onClick={fetchData} variant="contained">Refresh</Button> </Typography> 
      
      {balance <= 0 && <Alert severity="error">NOT ENOUGH BALANCE</Alert>}
      <Typography variant="h6">Connection Status: {isConnected ? 'Online' : 'Offline'}</Typography>
      <Typography variant="h6">Message Total: {data.length}</Typography>
      <Typography variant="h6">Cost: {data.length * 100}</Typography>

      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <TextField
          id="inputText"
          label="Input Kafka Data"
          variant="outlined"
          value={inputValue}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          fullWidth
        />
        <Button onClick={sendDataToServer} variant="contained" disabled={balance <= 0}>
          Send Data
        </Button>
      </Box>

      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
        <TextField
          type="number"
          id="topUp"
          label="Top Up Balance"
          variant="outlined"
          value={inputTopup}
          onChange={handleChangeTopup}
        />
        <Button onClick={topUpBalance} variant="contained">
          Top Up
        </Button>
      </Box>

      <Typography variant="h6" sx={{ mt: 2 }}>
        Kafka Data:
      </Typography>
      <List>
        {data.map((message, index) => (
          <ListItem key={index} disablePadding>
            <ListItemText primary={message} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default App;