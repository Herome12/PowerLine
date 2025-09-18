// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const mqtt = require('mqtt');
require('dotenv').config();

const apiRoutes = require('./routes/apiroutes');
const SensorData = require('./modals/sensorModal');

// --- App Configuration ---
const app = express(); 
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Enable JSON body parsing

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully.'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// --- MQTT Client Setup ---
const mqttClient = mqtt.connect('mqtt://broker.hivemq.com'); // Using a public broker for example
const MQTT_TOPIC = 'powerline/sensor/data';
 
mqttClient.on('connect', () => {
    console.log('✅ MQTT client connected.');
    mqttClient.subscribe(MQTT_TOPIC, (err) => {
        if (!err) {
            console.log(`📡 Subscribed to topic: ${MQTT_TOPIC}`);
        }
    });
});

mqttClient.on('message', async (topic, message) => {
    // message is a Buffer, so convert it to a string
    const payload = message.toString();
    console.log(`Received message from topic [${topic}]: ${payload}`);
    
    try {
        const data = JSON.parse(payload);
        const newData = new SensorData(data);
        await newData.save();
        console.log('Saved data from MQTT to database.');
    } catch (error) {
        console.error('Error processing MQTT message:', error.message);
    }
});

// --- API Routes ---
app.use('/api', apiRoutes);

// --- Root Endpoint ---
app.get('/', (req, res) => {
    res.send('Powerline Monitoring Backend is running! ⚡');
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});