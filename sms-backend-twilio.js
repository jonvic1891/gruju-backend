const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'file://'],
    credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'SMS & Email Backend (Twilio + SendGrid) is running',
        timestamp: new Date().toISOString()
    });
});

// SMS sending endpoint
app.post('/api/sms/send', async (req, res) => {
    try {
        console.log('📤 SMS Send Request:', {
            from: req.body.from,
            to: req.body.to,
            messageLength: req.body.message?.length
        });

        const { accountSid, authToken, from, to, message } = req.body;

        if (!accountSid || !authToken || !from || !to || !message) {
            return res.status(400).json({
                error: 'Missing required fields: accountSid, authToken, from, to, message'
            });
        }

        // Initialize Twilio client
        const client = twilio(accountSid, authToken);

        // Send SMS using Twilio
        const twilioMessage = await client.messages.create({
            body: message,
            from: from,
            to: to
        });

        console.log('✅ SMS Result:', {
            sid: twilioMessage.sid,
            status: twilioMessage.status
        });

        res.json({
            messageId: twilioMessage.sid,
            status: twilioMessage.status,
            to: twilioMessage.to,
            from: twilioMessage.from,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ SMS Error:', error);
        res.status(500).json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Connection test endpoint
app.post('/api/sms/test-connection', async (req, res) => {
    try {
        console.log('🔧 Testing Twilio Connection...');

        const { accountSid, authToken, phoneNumber } = req.body;

        if (!accountSid || !authToken) {
            return res.status(400).json({ 
                error: 'Account SID and Auth Token are required' 
            });
        }

        // Test by creating Twilio client and fetching account info
        const client = twilio(accountSid, authToken);
        
        // Validate credentials by fetching account details
        const account = await client.api.accounts(accountSid).fetch();

        console.log('✅ Twilio Connection Test Successful');
        res.json({
            status: 'Connection successful',
            accountName: account.friendlyName,
            phoneNumber: phoneNumber || 'Not provided',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Connection Test Failed:', error);
        res.status(400).json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Email sending endpoint
app.post('/api/email/send', async (req, res) => {
    try {
        console.log('📧 Email Send Request:', {
            from: req.body.from,
            to: req.body.to,
            subject: req.body.subject
        });

        const { apiKey, from, to, subject, text, html } = req.body;

        if (!apiKey || !from || !to || !subject || (!text && !html)) {
            return res.status(400).json({
                error: 'Missing required fields: apiKey, from, to, subject, and either text or html'
            });
        }

        // Set SendGrid API key
        sgMail.setApiKey(apiKey);

        // Prepare email message
        const msg = {
            to: to,
            from: from,
            subject: subject,
            text: text,
            html: html || text
        };

        // Send email using SendGrid
        const result = await sgMail.send(msg);

        console.log('✅ Email Result:', {
            messageId: result[0].headers['x-message-id'],
            statusCode: result[0].statusCode
        });

        res.json({
            messageId: result[0].headers['x-message-id'],
            status: 'Sent',
            statusCode: result[0].statusCode,
            to: to,
            from: from,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Email Error:', error);
        res.status(500).json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Email connection test endpoint
app.post('/api/email/test-connection', async (req, res) => {
    try {
        console.log('🔧 Testing SendGrid Connection...');

        const { apiKey, fromEmail } = req.body;

        if (!apiKey || !fromEmail) {
            return res.status(400).json({ 
                error: 'API Key and From Email are required' 
            });
        }

        // Set SendGrid API key
        sgMail.setApiKey(apiKey);

        // Test by sending a test email to the from address
        const testMsg = {
            to: fromEmail,
            from: fromEmail,
            subject: 'SendGrid Connection Test - Parent Activity App',
            text: 'This is a test email to verify your SendGrid configuration is working correctly.',
            html: '<p>This is a test email to verify your <strong>SendGrid</strong> configuration is working correctly.</p><p>If you received this email, your setup is ready!</p>'
        };

        const result = await sgMail.send(testMsg);

        console.log('✅ SendGrid Connection Test Successful');
        res.json({
            status: 'Connection successful',
            messageId: result[0].headers['x-message-id'],
            fromEmail: fromEmail,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Email Connection Test Failed:', error);
        res.status(400).json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 SMS & Email Backend Server Started (Twilio + SendGrid)!');
    console.log('📡 Server running on http://localhost:' + PORT);
    console.log('🔗 Health check: http://localhost:' + PORT + '/health');
    console.log('📱📧 Ready to handle SMS and Email requests from Parent Activity App');
    console.log('\n📋 Available endpoints:');
    console.log('  GET  /health - Server health check');
    console.log('  POST /api/sms/send - Send SMS message');
    console.log('  POST /api/sms/test-connection - Test Twilio connection');
    console.log('  POST /api/email/send - Send Email message');
    console.log('  POST /api/email/test-connection - Test SendGrid connection');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down SMS & Email Backend Server...');
    process.exit(0);
});