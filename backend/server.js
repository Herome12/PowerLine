// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const mqtt = require('mqtt');
const nodemailer = require('nodemailer');
const { sendBreakdownAlert, checkTwilioStatus } = require('./smsService');
require('dotenv').config();

const apiRoutes = require('./routes/apiroutes');
const {SensorData,Authority,Breakdown_data} = require('./modals/sensorModal');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
transporter.verify((error, success) => {
    if (error) {
        console.log('❌ Email configuration error:', error);
    } else {
        console.log('✅ Email server ready to send messages');
    }
});

// Email sending function
async function sendBreakdownAlerts(gmails, breakdownData) {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: gmails.join(', '), // Send to multiple emails
            subject: `🚨 BREAKDOWN ALERT - Node ${breakdownData.node_id}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #d32f2f;">⚡ POWERLINE BREAKDOWN ALERT</h2>
                    
                    <div style="background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 10px 0;">
                        <h3>Breakdown Details:</h3>
                        <p><strong>Node ID:</strong> ${breakdownData.node_id}</p>
                        <p><strong>Message:</strong> ${breakdownData.breakdown_message}</p>
                        <p><strong>Current:</strong> ${breakdownData.current} A</p>
                        <p><strong>Voltage Present:</strong> ${breakdownData.voltage_present ? 'Yes' : 'No'}</p>
                        <p><strong>Relay Status:</strong> ${breakdownData.relay_status}</p>
                        <p><strong>Time:</strong> ${new Date(breakdownData.timestamp).toLocaleString()}</p>
                    </div>
                    
                    <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 10px 0;">
                        <h3>Location:</h3>
                        <p><strong>Latitude:</strong> ${breakdownData.gps.lat}</p>
                        <p><strong>Longitude:</strong> ${breakdownData.gps.lon}</p>
                       
                    </div>
                    
                    <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 10px 0;">
                        <p><strong>⚠️ IMMEDIATE ACTION REQUIRED</strong></p>
                        <p>Please investigate and resolve this issue immediately.</p>
                    </div>
                    
                    <hr>
                    <p style="color: #666; font-size: 12px;">
                        This is an automated alert from Powerline Monitoring System.<br>
                        Generated on: ${new Date().toLocaleString()}
                    </p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Breakdown alert emails sent successfully');
        console.log('📧 Message ID:', info.messageId);
        console.log('📨 Emails sent to:', gmails);
        
        return true;
    } catch (error) {
        console.error('❌ Error sending breakdown alert emails:', error.message);
        return false;
    }
}
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
const TOPICS = {
    SENSOR_DATA: 'powerline/sensor/data',
    BREAKDOWN: 'powerline/breakdown'
};

mqttClient.on('connect', () => {
    console.log('✅ MQTT client connected.');
    mqttClient.subscribe(TOPICS.SENSOR_DATA, (err) => {
        if (!err) {
            console.log(`📡 Subscribed to topic: ${TOPICS.SENSOR_DATA}`);
        }
    });
     mqttClient.subscribe(TOPICS.BREAKDOWN, (err) => {
        if (!err) {
            console.log(`📡 Subscribed to topic: ${TOPICS.BREAKDOWN}`);
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
                    console.log('🚨 Breakdown alerts sent successfully to all authorities');
                } else {
                    console.log('❌ Failed to send breakdown alerts');
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