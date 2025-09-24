const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const mqtt = require('mqtt');
const http = require('http');
const path = require('path');
const { Server } = require("socket.io");
require('dotenv').config();

// --- Import Custom Modules ---
const apiRoutes = require('./routes/apiroutes');
const { SensorData, Authority, Breakdown_data, DataHistory } = require('./modals/sensorModal');
const { sendBreakdownAlerts } = require('./services/mail');
const { sendBreakdownAlert } = require('./services/sms');

// --- App & Server Configuration ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:3000', '*'], // Allow React dev server
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB connected.'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// --- MQTT Client Setup ---
const mqttOptions = {
    username: process.env.HIVEMQ_USERNAME,
    password: process.env.HIVEMQ_PASSWORD,
    port: process.env.HIVEMQ_PORT
};
const mqttClient = mqtt.connect(`mqtts://${process.env.HIVEMQ_URL}`, mqttOptions);

const TOPICS = {
    SENSOR_DATA: 'powerline/sensor/data',
    BREAKDOWN: 'powerline/breakdown',
    COMMAND: 'powerline/command' // FIX: Added the missing command topic
};

// --- Helper Functions for MQTT Logic ---
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

// 🔥 ADD HISTORY UPDATE FUNCTION
const updateCurrentHistory = async (nodeId, currentValue) => {
    try {
        const result = await DataHistory.findOneAndUpdate(
            { nodeId: nodeId },
            {
                $push: { current: currentValue }
            },
            { 
                upsert: true,  // Create if not exists
                new: true      // Return updated document
            }
        );
        
        console.log(`📊 History updated for node: ${nodeId} with current: ${currentValue}`);
        return result;
        
    } catch (error) {
        console.error('❌ Error updating history:', error);
        throw error;
    }
};

// --- Mail Cooldown Logic ---
const lastMailSent = {}; // { nodeId: Date }
const MAIL_COOLDOWN = 5 * 60 * 1000; // 5 minutes

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
                console.log(`🗑 Deleted ${deleteResult.deletedCount} existing record(s) for nodeId: ${nodeId}`);
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
            
            // 🔥 STEP 3: UPDATE HISTORY (NEW ADDITION)
            if (data.current !== undefined && data.current !== null) {
                await updateCurrentHistory(nodeId, data.current);
            }
            
            // 🔍 VERIFICATION: Count should always be 1
            const finalCount = await SensorData.countDocuments({ nodeId: nodeId });
            console.log(`✅ Final count for nodeId '${nodeId}': ${finalCount}`);
            
            if (finalCount !== 1) {
                console.warn(`⚠ Unexpected count: ${finalCount} (should be 1)`);
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
            
            const nodeId = data.nodeId;
            const now = Date.now();

            // 🔥 Check cooldown
            if (!lastMailSent[nodeId] || (now - lastMailSent[nodeId]) > MAIL_COOLDOWN) {
                const gmails=["raghavdhiman2005@gmail.com"];
                const emailSent = await sendBreakdownAlerts(gmails, data);
                
                if (emailSent) {
                    lastMailSent[nodeId] = now; // update last sent time
                    console.log(`📧 Breakdown email alerts sent successfully for node ${nodeId}. Next mail allowed after ${MAIL_COOLDOWN/60000} minutes.`);
                } else {
                    console.log('❌ Failed to send breakdown email alerts');
                }
            } else {
                console.log(`⏳ Mail suppressed for node ${nodeId}. Still in cooldown.`);
            }
            
        } catch (error) {
            console.error('❌ Error processing breakdown MQTT message:', error.message);
        }
    }
});

// --- Socket.IO Connection Handler ---
io.on('connection', (socket) => {
    console.log(`✅ User connected to dashboard: ${socket.id}`);

    socket.on('resolve-fault', (data) => {
        const { inNodeId ,outNodeId} = data;
        console.log(`✅ Received resolve command for node: ${inNodeId}`);
        const commandPayload = JSON.stringify({ outNodeID:outNodeId, inNodeID: inNodeId, status: 1 });
        console.log(commandPayload);
        mqttClient.publish(TOPICS.COMMAND, commandPayload);
    });

    socket.on('disconnect', () => console.log(`🔌 User disconnected: ${socket.id}`));
});

// --- API Routes & Static File Serving ---
app.use('/api', apiRoutes);

// --- Serve React App (for Production) ---
app.use(express.static(path.join(__dirname, 'build')));

// FIX: Use a regular expression for a more robust catch-all route
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// --- Start Server ---
server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`🕒 Current time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
});
