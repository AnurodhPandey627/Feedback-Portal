const smsService = require('../services/smsService');
const otpModel = require("../models/otpModel.js");

exports.requestOtp = async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();//6digits


  try {
    await otpModel.saveOtp(phoneNumber, otp, Date.now() + 5 * 60 * 1000);//phone,otp,expiresAt
    
    await smsService.sendOtp(phoneNumber, otp);
   
    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Failed to send OTP. Please try again later.' });
  }
};

exports.verifyOtp = async (req, res) => {
    const { phoneNumber, otp } = req.body;
    
    // Validate input
    if (!phoneNumber || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP are required' });
    }
  
    try {
      // Retrieve the latest OTP record for this phone number
      const otpRecord = await otpModel.getOtpDetails(phoneNumber);
      console.dir("OTP:" + otpRecord);
      
      // If no record found, return error
      if (!otpRecord) {
        return res.status(400).json({ error: 'No OTP found for this phone number.' });
      }

      console.log(otpRecord.otp);
      
      // Check if the OTP has expired
      const currentTime = new Date();
      if (currentTime > new Date(otpRecord.expires_at)) {
        return res.status(400).json({ error: 'OTP has expired.' });
      }
      
      // Compare the provided OTP with the stored OTP
      if (otpRecord.otp !== otp) {
        return res.status(400).json({ error: 'Invalid OTP.' });
      }
      
      // OTP is valid: Optionally, delete the OTP record after verification
      await otpModel.deleteOtp(phoneNumber);
      
      // Respond with success (You could also create a session or return a token here)
      res.status(200).json({ message: 'OTP verified successfully' });
    } catch (error) {
      console.error('Error verifying OTP:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
  
