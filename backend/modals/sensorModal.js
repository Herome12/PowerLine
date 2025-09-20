const mongoose = require('mongoose');

const GpsSchema = new mongoose.Schema({
    lat: { type: Number},
    lon: { type: Number },
});

// This schema is now flexible to accept the limited data from the ESP32.
const SensorDataSchema = new mongoose.Schema({
    nodeId: { type: String, required: true, trim: true }, 
    current: { type: Number, required: true },
    voltage: { type: Number },                            
    relay: { type: String, enum: ['ON', 'OFF', 'FAULT'] }, 
    Alert_status: { type: Boolean },                       
    gps: { type: GpsSchema },                               
    timestamp: { type: Date, default: Date.now },
});

const AuthoritySchema = new mongoose.Schema({
    entity_id: { type: String, required: true },
    name: { type: String, required: true },
    number: { type: String, required: true },
    gmail: { type: String, required: true },
    node_id: { type: String, required: true }
});

// This schema remains strict for detailed breakdown alerts.
const BreakdownSchema = new mongoose.Schema({
    node_id: { type: String, required: true },
    breakdown_message: { type: String, required: true },
    current: { type: Number, required: true },
    voltage_present: { type: Boolean, required: true },
    relay_status: { type: String, enum: ['ON', 'OFF', 'FAULT'], required: true },
    gps: { type: GpsSchema, required: true },
    timestamp: { type: Date, default: Date.now },
}, {
    timestamps: true
});

module.exports = {
    SensorData: mongoose.model('SensorData', SensorDataSchema),
    Authority: mongoose.model('Authority', AuthoritySchema),
    Breakdown_data: mongoose.model('Breakdown_data', BreakdownSchema)
};