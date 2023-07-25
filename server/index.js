const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { Kafka, logLevel } = require('kafkajs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['localhost:9092'], // Replace with your Kafka broker address
  logLevel: logLevel.ERROR, // Set logLevel to ERROR to avoid noisy logs
});

const consumer = kafka.consumer({ groupId: 'test-group' });
const topic = 'testing1'; // Replace 'your_topic_name' with your Kafka topic

const runConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log('Received data from Kafka:', message.value.toString());
      io.emit('data', { message: message.value.toString() }); // Emit the received data as an object
    },
  });
};

runConsumer().catch((error) => {
  console.error('Error running Kafka consumer:', error);
});

const producer = kafka.producer();

const runProducer = async () => {
  try {
    await producer.connect();
    console.log('Kafka producer connected');
  } catch (error) {
    console.error('Error connecting to Kafka producer:', error);
  }
};

const sendToKafka = async (topic, message) => {
  try {
    await producer.send({
      topic,
      messages: [{ value: message }],
    });
    console.log('Message sent to Kafka:', message);
  } catch (error) {
    console.error('Error sending message to Kafka:', error);
  }
};

runProducer();

// Enable CORS for regular HTTP endpoints
app.use(cors());

// Parse incoming request body as JSON
app.use(express.json());

// Endpoint to receive data from the client
app.post('/send-data', async (req, res) => {
  const { data } = req.body;
  try {
    // Send the data to Kafka topic
    await sendToKafka(topic, data); // Replace 'testing1' with your Kafka topic
    res.status(200).json({ message: 'Data received and sent to Kafka successfully' });
  } catch (error) {
    console.error('Error sending data to Kafka:', error);
    res.status(500).json({ message: 'Error sending data to Kafka' });
  }
});

const port = 3001;

server.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});
