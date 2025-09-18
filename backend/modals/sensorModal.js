const mongoose = require('mongoose');

const GpsSchema = new mongoose.Schema({
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
});

const SensorDataSchema = new mongoose.Schema({
    node_id: {
        type: String,
        required: true,
        trim: true,
    },
    current: {
        type: Number,
        required: true,
    },
    voltage_present: {
        type: Boolean,
        required: true,
    },
    relay_status: {
        type: String,
        enum: ['ON', 'OFF', 'FAULT'],
        required: true,
    },
    gps: {
        type: GpsSchema,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('SensorData', SensorDataSchema);