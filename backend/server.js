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
const { SensorData, Authority, Breakdown_data, NodeLocation } = require('./modals/sensorModal');
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
    console.log(`📨 MQTT Message: ${payload}`);
    
    if(topic === TOPICS.SENSOR_DATA) {
        try {
            const data = JSON.parse(payload);
            console.log('📋 Parsed data:', data);
            
            if (!data.nodeId) {
                console.error('❌ Missing nodeId');
                return;
            }
            
            const nodeId = String(data.nodeId).trim();
            console.log(`🎯 Processing nodeId: '${nodeId}'`);
            
            // 🔥 STEP 1: Delete existing record if exists
            const deleteResult = await SensorData.deleteMany({ nodeId: nodeId });
            
            if (deleteResult.deletedCount > 0) {
                console.log(`🗑️ Deleted ${deleteResult.deletedCount} existing record(s) for nodeId: ${nodeId}`);
            } else {
                console.log(`📝 No existing records found for nodeId: ${nodeId}`);
            }
            
            // 🔥 STEP 2: Create fresh new record
            const newRecord = new SensorData({
                nodeId: nodeId,
                current: data.current,
                voltage: data.voltage,
                relay: data.relay || 'UNKNOWN',
                timestamp: data.timestamp || new Date().toISOString(),
                createdAt: new Date(),
                updatedAt: new Date()
            });
            
            await newRecord.save();
            
            console.log(`✅ Created fresh record for nodeId: ${nodeId}`, {
                id: newRecord._id,
                current: newRecord.current,
                voltage: newRecord.voltage,
                relay: newRecord.relay
            });
            
            // 🔍 VERIFICATION: Count should always be 1
            const finalCount = await SensorData.countDocuments({ nodeId: nodeId });
            console.log(`✅ Final count for nodeId '${nodeId}': ${finalCount}`);
            
            if (finalCount !== 1) {
                console.warn(`⚠️ Unexpected count: ${finalCount} (should be 1)`);
            }
            
        } catch (error) {
            console.error('❌ MQTT Error:', error.message);
            console.error('❌ Stack:', error.stack);
        }
        
    } else if(topic === TOPICS.BREAKDOWN) {
        // Breakdown logic remains same (always create new for history)
        try {
            const data = JSON.parse(payload);
            const newData = new Breakdown_data(data);
            await newData.save();
            
            io.emit('new-breakdown', newData);
            console.log('Emitted "new-breakdown" event to website clients.');
            
            // Find authorities for this node
            const authorities = await Authority.find({ node_id: data.nodeId });
            
            if (authorities.length === 0) {
                console.log(`⚠️ No authorities found for node: ${data.nodeId}`);
                return;
            }
            
            const gmails = authorities.map(auth => auth.gmail);
            const numbers = authorities.map(auth => auth.number);
            
            // Send alerts
            const emailSent = await sendBreakdownAlerts(gmails, data);
            const smsResults = await sendBreakdownAlert(numbers, data);
            
            if (emailSent) {
                console.log(`📧 Breakdown email alerts sent successfully to ${gmails.length} authorities`);
            } else {
                console.log('❌ Failed to send breakdown email alerts');
            }
            
            if (smsResults) {
                console.log(`📱 Breakdown SMS alerts sent successfully to ${numbers.length} authorities`);
            } else {
                console.log('❌ Failed to send breakdown SMS alerts');
            }
            
        } catch (error) {
            console.error('❌ Error processing breakdown MQTT message:', error.message);
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

// Test endpoint for manual testing
app.post('/test', async (req, res) => {
    try {
        const data = req.body;
        
        // Check if node already exists
        const existingNode = await SensorData.findOne({ nodeId: data.nodeId });
        
        if (existingNode) {
            // Update existing node
            const updatedData = await SensorData.findOneAndUpdate(
                { nodeId: data.nodeId },
                { 
                    $set: {
                        current: data.current,
                        voltage: data.voltage,
                        relay: data.relay,
                        timestamp: data.timestamp,
                        updatedAt: new Date()
                    }
                },
                { 
                    new: true,
                    runValidators: true
                }
            );
            
            console.log(`🔄 Updated existing sensor data for node: ${data.nodeId}`);
            res.json({
                success: true,
                message: 'Data updated successfully',
                operation: 'updated',
                data: updatedData
            });
            
        } else {
            // Create new node
            const newData = new SensorData({
                nodeId: data.nodeId,
                current: data.current,
                voltage: data.voltage,
                relay: data.relay,
                timestamp: data.timestamp,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            
            await newData.save();
            console.log(`✅ Created new sensor data record for node: ${data.nodeId}`);
            
            res.json({
                success: true,
                message: 'New data created successfully',
                operation: 'created',
                data: newData
            });
        }
        
    } catch (error) {
        console.error('❌ Error in /test endpoint:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// --- Start Server ---
server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
