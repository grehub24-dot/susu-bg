const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const WIGAL_API_KEY = process.env.WIGAL_API_KEY;
const WIGAL_USERNAME = process.env.WIGAL_USERNAME;
const WIGAL_SENDER_ID = process.env.WIGAL_SENDER_ID || 'SUSUBG';
const WIGAL_SMS_URL = 'https://frogapi.wigal.com.gh/api/v3/sms/send';
const WIGAL_OTP_GENERATE_URL = 'https://frogapi.wigal.com.gh/api/v3/sms/otp/generate';
const WIGAL_OTP_VERIFY_URL = 'https://frogapi.wigal.com.gh/api/v3/sms/otp/verify';

const getHeaders = () => ({
    'Content-Type': 'application/json',
    'API-KEY': WIGAL_API_KEY,
    'USERNAME': WIGAL_USERNAME
});

const ensureWigalConfig = () => {
    if (!WIGAL_API_KEY || !WIGAL_USERNAME) {
        throw new Error('Missing WIGAL_API_KEY or WIGAL_USERNAME');
    }
};

class WigalService {
    static async sendSMS(phoneNumber, message) {
        try {
            ensureWigalConfig();
            const msgId = uuidv4().substring(0, 10);
            
            const postData = {
                senderid: WIGAL_SENDER_ID,
                destinations: [{
                    destination: phoneNumber,
                    message: message,
                    msgid: msgId,
                    smstype: 'text'
                }],
            };

            const response = await axios.post(WIGAL_SMS_URL, postData, { headers: getHeaders() });

            return response.data;
        } catch (error) {
            console.error('Wigal SMS Error:', error.response?.data || error.message);
            throw new Error('Failed to send SMS via Wigal');
        }
    }

    static async sendTransactionAlert(phoneNumber, type, amount, newBalance) {
        const message = `Susu-BG Alert: ${type} of GHS ${amount} was successful. New balance is GHS ${newBalance}. Thank you for saving with us!`;
        return this.sendSMS(phoneNumber, message);
    }

    static async generateOTP(phoneNumber, options = {}) {
        try {
            ensureWigalConfig();
            const expiry = Number(options.expiry || process.env.WIGAL_OTP_EXPIRY_MINUTES || 10);
            const length = Number(options.length || process.env.WIGAL_OTP_LENGTH || 6);
            const messageTemplate =
                options.messageTemplate ||
                process.env.WIGAL_OTP_TEMPLATE ||
                "Hello, your OTP is : %OTPCODE%. It will expire after %EXPIRY% mins";
            const type = options.type || process.env.WIGAL_OTP_TYPE || "ALPHANUMERIC";

            const postData = {
                number: phoneNumber,
                expiry,
                length,
                messagetemplate: messageTemplate,
                type,
                senderid: WIGAL_SENDER_ID
            };

            const response = await axios.post(WIGAL_OTP_GENERATE_URL, postData, { headers: getHeaders() });
            return response.data;
        } catch (error) {
            console.error('Wigal OTP Generate Error:', error.response?.data || error.message);
            throw new Error('Failed to generate OTP via Wigal');
        }
    }

    static async verifyOTP(phoneNumber, otpCode) {
        try {
            ensureWigalConfig();
            const postData = {
                otpcode: otpCode,
                number: phoneNumber
            };
            const response = await axios.post(WIGAL_OTP_VERIFY_URL, postData, { headers: getHeaders() });
            return response.data;
        } catch (error) {
            console.error('Wigal OTP Verify Error:', error.response?.data || error.message);
            throw new Error('Failed to verify OTP via Wigal');
        }
    }

    static async sendOTP(phoneNumber, otp) {
        const message = `Your Susu-BG verification code is ${otp}. Do not share this code with anyone.`;
        return this.sendSMS(phoneNumber, message);
    }
}

module.exports = WigalService;
