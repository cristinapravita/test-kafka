const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { Kafka, logLevel } = require('kafkajs');

const app = express();
let balanceCurrent = 1000;
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
});

// const kafka = new Kafka({
//   clientId: 'my-app',
//   brokers: ['192.168.10.249:9092','localhost:9092'], // Replace with your Kafka broker address
//   logLevel: logLevel.ERROR, // Set logLevel to ERROR to avoid noisy logs
// });

const brokers = ["localhost:9092", "192.168.10.249:9092"]; // List of Kafka brokers
const clientId = "my-app";
const groupId = "test-group2";
const topic = "testing2";
const messageBuffer = [];

let currentBrokerIndex = 0;
let kafka; // Kafka instance
let consumer;
let producer;
let isProducerConnected = false; // Custom flag to track the producer connection status
const connectKafka = async () => {
  try {
    kafka = new Kafka({
      clientId,
      brokers: [brokers[currentBrokerIndex]],
      logLevel: logLevel.ERROR,
    });
    consumer = kafka.consumer({ groupId });
    producer = kafka.producer(); // Move producer connection here
    isProducerConnected = true;
    await Promise.all([consumer.connect(), producer.connect()]);
    console.log(
      "Kafka consumer and producer connected to broker:",
      brokers[currentBrokerIndex]
    );
    // Add event listeners to handle rebalancing events
    // Add event listeners to handle rebalancing events
    consumer.on(consumer.events.GROUP_JOIN, (e) => {
      console.log("Consumer group joined:", e);
      // Perform actions when the consumer group joins (rebalancing starts)
      // For example, you can resume the consumer after rebalancing is complete
      // await consumer.resume([{ topic }]);
      // console.log("Consumer resumed after rebalancing");
    });

    // Add an event listener to handle disconnections
    consumer.on(consumer.events.DISCONNECT, (e) => {
      console.log("Kafka consumer disconnected:", e);
      switchToNextBroker();
    });
    // Start the consumer after successful connection
    await runConsumer(); // This line is important to start the consumer
  } catch (error) {
    isProducerConnected = false;
    console.error("Error connecting to Kafka:", error);
    switchToNextBroker();
  }
};

connectKafka().catch((error)=>{
  console.log(`error connect to kafka ${error}`);
})

const maxRetryAttempts = 3; // Maximum number of retry attempts
let retryAttempts = 0; // Counter to track the number of retry attempts
const switchToNextBroker = async () => {
  if (retryAttempts < maxRetryAttempts) {
    retryAttempts++;
    // Switch to the next broker in the list
    currentBrokerIndex = (currentBrokerIndex + 1) % brokers.length;
    console.log(
      "Trying to connect to the next broker:",
      brokers[currentBrokerIndex]
    );
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for the retry delay
    await reconnectKafka();
  } else {
    console.log("Max retry attempts reached. Unable to connect to Kafka.");
    // Handle the situation when the maximum retry attempts are reached.
    // You can choose to stop the application or take other appropriate actions.
  }
};

const reconnectKafka = async () => {
  await consumer.disconnect();
  await producer.disconnect();
  // Switch to the next broker in the list
  currentBrokerIndex = (currentBrokerIndex + 1) % brokers.length;
  await connectKafka();
};

const runConsumer = async () => {
  await consumer.subscribe({ topic, fromBeginning: true });

  await consumer.run({
    eachBatch: async ({ batch }) => {
      for (const message of batch.messages) {
        console.log("Received data from Kafka:", message.value.toString());
        messageBuffer.push(message.value.toString()); // Add the message to the buffer
        if (balanceCurrent <= 0) {
          io.emit("data", { balance: balanceCurrent });
        } else {
          balanceCurrent = balanceCurrent - 100;
          io.emit("data", {
            message: message.value.toString(),
            balance: balanceCurrent,
          }); // Emit the received data as an object
        }
      }
    },
  });
};

const getLatestBalance = async () => {
  if (!consumer || !isProducerConnected) {
    consumer = kafka.consumer({ groupId }); // Re-create the consumer if not already present or disconnected
    await consumer.connect();
    await consumer.subscribe({ topic: topic, fromBeginning: false });
  }

  let lastBalance = 0; // To store the last balance value

  await consumer.run({
    eachMessage: async ({ message }) => {
      const messageValue = message.value.toString(); // Convert the message value to a string
      const balanceStartIndex = messageValue.lastIndexOf("balance:") + 9; // +9 to skip "balance: " string
      const balanceEndIndex = messageValue.length;
      const balanceValue = messageValue.substring(
        balanceStartIndex,
        balanceEndIndex
      );

      lastBalance = parseInt(balanceValue, 10); // Parse the balance value to an integer
    },
  });

  return lastBalance; // Return the last balance value
};

runConsumer().catch((error) => {
  console.error("Error running Kafka consumer:", error);
});

const sendToKafka = async (topic, message, balance)=> {
  try {
    if (!producer || !isProducerConnected) {
      // console.log(`check producer `, producer);
      console.log(`producer not connected`);
      await connectKafka(); // Connect the Kafka producer to a broker
    }
    await producer.send({
      topic,
      messages: [{ value: `${message}, balance: ${balance}` }],
    });
    console.log('Message sent to Kafka:', message);
  } catch (error) {
    console.error('Error sending message to Kafka:', error);
  }
};

// Enable CORS for regular HTTP endpoints
app.use(cors());

// Parse incoming request body as JSON
app.use(express.json());

// Endpoint to receive data from the client
app.post('/send-data', async (req, res) => {
  const { data, balance } = req.body;
  try {
    let lastBalance = await getLatestBalance();
    console.log(`lastBalance : ${lastBalance}`);
    // Use the lastBalance to calculate the new balance and include it in the message
    if(balance) {
      lastBalance = lastBalance + parseInt(balance);
      // res.status(200).json({ message: 'Balance updated', balance: balanceCurrent });
    }else{
      lastBalance = lastBalance - 100; 
    }
    // Send the data to Kafka topic case
    console.log(`newBalance : ${lastBalance}`);
    console.log(`data : ${data}`);
    if(data) {
      await sendToKafka(topic, data, lastBalance); // Replace 'testing1' with your Kafka topic
      res.status(200).json({ message: 'Data received and sent to Kafka successfully' });
    }else if (newBalance > 0) {
      await sendToKafka(topic, null, lastBalance); // Replace 'testing1' with your Kafka topic
      res
        .status(200)
        .json({ message: "Data received and sent to Kafka successfully" });
    } else {
      res.status(400).json({ message: "Not Enough Balance" });
    }

    
  } catch (error) {
    console.error('Error sending data to Kafka:', error);
    res.status(500).json({ message: 'Error sending data to Kafka' });
  }
});

// Route to fetch buffered data for a new connection
app.get("/get-buffered-data", (req, res) => {
  res.status(200).json({ data: messageBuffer, balance: balanceCurrent });
});

const port = 3001;

server.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});
