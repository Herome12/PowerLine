// routes/api.routes.js
const express = require('express');
const router = express.Router();
const SensorData = require('../modals/sensorModal');

// --- POST Endpoint to receive data from Gateway ---
// URL: POST /api/data
router.post('/data', async (req, res) => {
    try {
        console.log('Received data via HTTP POST:', req.body);
        const newData = new SensorData(req.body);
        const savedData = await newData.save();
        res.status(201).json(savedData);
    } catch (error) {
        console.error("Error saving data:", error);
        res.status(400).json({ message: 'Invalid data format', error: error.message });
    }
});

// --- GET Endpoint for the Frontend to fetch data ---
// URL: GET /api/data?limit=10
router.get('/data', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20; // Default to 20 latest entries
        const data = await SensorData.find()
            .sort({ timestamp: -1 }) // Get the most recent data first
            .limit(limit);
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching data', error: error.message });
    }
});

module.exports = router;