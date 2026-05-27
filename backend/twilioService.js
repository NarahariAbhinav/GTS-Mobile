const twilio = require('twilio');
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;

let client;
if (accountSid && authToken) {
    client = twilio(accountSid, authToken);
}

const sendWhatsAppNotification = async (toPhoneNumber, message) => {
    if (!client) {
        console.warn('Twilio is not configured. Missing account credentials in .env');
        return false;
    }

    if (!toPhoneNumber) {
        console.warn('No phone number provided for notification.');
        return false;
    }

    // Twilio WhatsApp numbers must be prefixed with 'whatsapp:'
    const to = `whatsapp:${toPhoneNumber}`;
    const from = `whatsapp:${twilioWhatsAppNumber}`;

    try {
        const response = await client.messages.create({
            body: message,
            from: from,
            to: to
        });
        console.log(`WhatsApp message sent successfully. SID: ${response.sid}`);
        return true;
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        return false;
    }
};

module.exports = {
    sendWhatsAppNotification
};
