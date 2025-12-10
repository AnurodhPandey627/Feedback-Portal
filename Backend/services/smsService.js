const client = require('../config/twilio');

exports.sendOtp = async (phoneNumber, otp) => {
  const message = `Your OTP is ${otp}. It will expire in 5 minutes.`;
  try {
    const response = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
    console.log('Twilio response:', response);
    return response;
  } catch (error) {
    console.error('Error in sendOtp:', error);
    throw error;
  }
};
