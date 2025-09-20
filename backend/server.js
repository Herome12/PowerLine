// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const mqtt = require('mqtt');
const nodemailer = require('nodemailer');
const { sendBreakdownAlert, checkTwilioStatus } = require('./services/sms');
require('dotenv').config();
const http = require('http');
const { Server } = require("socket.io");

const apiRoutes = require('./routes/apiroutes');
const { SensorData, Authority, Breakdown_data } = require('./modals/sensorModal');
const { sendBreakdownAlerts } = require('./services/mail');

// --- App Configuration ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log(' MongoDB connected successfully.'))
    .catch(err => console.error(' MongoDB connection error:', err));

// --- MQTT Client Setup (Updated for HiveMQ Cloud) ---
const mqttOptions = {
  username: process.env.HIVEMQ_USERNAME,
  password: process.env.HIVEMQ_PASSWORD,
  port: process.env.HIVEMQ_PORT
};

// Use `mqtts://` for a secure TLS connection
const mqttClient = mqtt.connect(`mqtts://${process.env.HIVEMQ_URL}`, mqttOptions);

const TOPICS = {
    SENSOR_DATA: 'powerline/sensor/data',
    BREAKDOWN: 'powerline/breakdown'
};

mqttClient.on('connect', () => {
    console.log(' MQTT client connected securely to HiveMQ Cloud.');
    mqttClient.subscribe(TOPICS.SENSOR_DATA, (err) => {
        if (!err) console.log(` Subscribed to topic: ${TOPICS.SENSOR_DATA}`);
    });
    mqttClient.subscribe(TOPICS.BREAKDOWN, (err) => {
        if (!err) console.log(` Subscribed to topic: ${TOPICS.BREAKDOWN}`);
    });
});

mqttClient.on('error', (error) => {
    console.error('MQTT Connection Error:', error);
});


mqttClient.on('message', async (topic, message) => {
    const payload = message.toString();
    console.log(`Received message from topic [${topic}]: ${payload}`);

    if (topic === TOPICS.SENSOR_DATA) {
        try {
            const data = JSON.parse(payload);
            const newData = new SensorData(data);
            await newData.save();
            console.log('Saved data from MQTT to database.');
        } catch (error) {
            console.error('Error processing MQTT message:', error.message);
        }
    } else {
        try {
            const data = JSON.parse(payload);
            const newData = new Breakdown_data(data);
            await newData.save();

            console.log('Saved Breakdown data from MQTT to database.');
            
            io.emit('new-breakdown', newData); 
            
            console.log('Emitted "new-breakdown" event to website clients.');
            
            const authorities = await Authority.find({ node_id: data.node_id });
            const gmails = authorities.map(auth => auth.gmail);
            const numbers = authorities.map(auth => auth.number);
            const emailSent = await sendBreakdownAlerts(gmails, newData);
            const smsResults = await sendBreakdownAlert(numbers, newData);

            if (emailSent) {
                console.log(' Breakdown alerts sent successfully to all authorities');
            } else {
                console.log(' Failed to send breakdown alerts');
            }
        } catch (error) {
            console.error('Error processing MQTT message:', error.message);
        }
    }
});

io.on('connection', (socket) => {
    console.log('A user connected to the website dashboard');
});

// --- API Routes ---
app.use('/api', apiRoutes);

// --- Root Endpoint ---
app.get('/', (req, res) => {
    res.send('Powerline Monitoring Backend is running! ⚡');
});

// --- Start Server ---
server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});