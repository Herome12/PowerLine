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
    Alert_status:{
        type:Boolean,
        required:true,

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

const AuthoritySchema = new mongoose.Schema({
    entity_id: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    number: {
        type: String,
        required: true,
    },
    gmail: {
        type: String,
        required: true,
    },
    pole_id: {
        type: String,
        required: true,
    }
}, 
   
);

const BreakdownSchema = new mongoose.Schema({
    node_id: {
        type: String,
        required: true,
    },
    breakdown_message: {
        type: String,
        required: true,
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
}, {
    timestamps: true
});


module.exports = {
    SensorData: mongoose.model('SensorData', SensorDataSchema),
    Authority: mongoose.model('Authority', AuthoritySchema),
    Breakdown_data: mongoose.model('Breakdown_data', BreakdownSchema)
};