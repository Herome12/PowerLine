
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.log(' Email configuration error:', error);
    } else {
        console.log(' Email server ready to send messages');
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
        console.log(' Breakdown alert emails sent successfully');
        console.log(' Message ID:', info.messageId);
        console.log(' Emails sent to:', gmails);
        
        return true;
    } catch (error) {
        console.error(' Error sending breakdown alert emails:', error.message);
        return false;
    }
}

module.exports = {
    sendBreakdownAlerts
};