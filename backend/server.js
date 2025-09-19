// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const mqtt = require('mqtt');
const nodemailer = require('nodemailer');
const { sendBreakdownAlert, checkTwilioStatus } = require('./services/sms');
require('dotenv').config();

const apiRoutes = require('./routes/apiroutes');
const {SensorData,Authority,Breakdown_data} = require('./modals/sensorModal');
const { sendBreakdownAlerts } = require('./services/mail');





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
.then(() => console.log(' MongoDB connected successfully.'))
.catch(err => console.error(' MongoDB connection error:', err));

// --- MQTT Client Setup ---
const mqttClient = mqtt.connect('mqtt://broker.hivemq.com'); // Using a public broker for example

const TOPICS = {
    SENSOR_DATA: 'powerline/sensor/data',
    BREAKDOWN: 'powerline/breakdown'
};


 

mqttClient.on('connect', () => {
    console.log(' MQTT client connected.');
    mqttClient.subscribe(TOPICS.SENSOR_DATA, (err) => {
        if (!err) {
            console.log(` Subscribed to topic: ${TOPICS.SENSOR_DATA}`);
        }
    });
     mqttClient.subscribe(TOPICS.BREAKDOWN, (err) => {
        if (!err) {
            console.log(` Subscribed to topic: ${TOPICS.BREAKDOWN}`);
        }
    })
});

mqttClient.on('message', async (topic, message) => {
    // message is a Buffer, so convert it to a string
    const payload = message.toString();
    console.log(`Received message from topic [${topic}]: ${payload}`);
    
    if(topic === TOPICS.SENSOR_DATA){
    
    try {
        const data = JSON.parse(payload);
        const newData = new SensorData(data);
        await newData.save();
        console.log('Saved data from MQTT to database.');
    } catch (error) {
        console.error('Error processing MQTT message:', error.message);
    }
}
else{
    try {
        const data = JSON.parse(payload);
        
        const newData = new Breakdown_data(data);
        await newData.save();
        
        console.log('Saved  Breakdown data from MQTT to database.');
        const authorities = await Authority.find({ node_id: data.node_id });
        const gmails = authorities.map(auth => auth.gmail);
        const numbers = authorities.map(auth => auth.number);
        const emailSent = await sendBreakdownAlerts(gmails, data);

        const smsResults = await sendBreakdownAlert(numbers, data);
                
                if (emailSent ) {
                    console.log(' Breakdown alerts sent successfully to all authorities');
                } else {
                    console.log(' Failed to send breakdown alerts');
                }

    } catch (error) {
        console.error('Error processing MQTT message:', error.message);
    }

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
