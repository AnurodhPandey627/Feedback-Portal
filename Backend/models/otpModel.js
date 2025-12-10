const getConnection = require('../config/db');

let connection;

(async () => {
  connection = await getConnection();
})();

exports.saveOtp = async (phoneNumber, otp, expiresAt) => {
  const query = 'INSERT INTO otp_verifications (phone_number, otp, expires_at) VALUES (?, ?, ?)';
  const values = [phoneNumber, otp, new Date(expiresAt)];

  try {
    const [result] = await connection.query(query, values);
    return result;
  } catch (error) {
    console.error('Error saving OTP:', error);
    throw error;
  }
};


// /**
//  * Retrieve OTP details for a given phone number.
//  * This can be used in your verification step.
//  * @param {string} phoneNumber - The student's phone number.
//  */
exports.getOtpDetails = async (phoneNumber) => {
  const query = 'SELECT * FROM otp_verifications WHERE phone_number = ? ORDER BY created_at DESC LIMIT 1';
  try {
    const [rows] = await connection.query(query, [phoneNumber]);
    return rows[0];
  } catch (error) {
    console.error('Error fetching OTP details:', error);
    throw error;
  }
};

// /**
//  * Delete OTP details (optional) after verification or expiration.
//  * @param {string} phoneNumber - The student's phone number.
//  */
exports.deleteOtp = async (phoneNumber) => {
  const query = 'DELETE FROM otp_verifications WHERE phone_number = ?';
  try {
    const [result] = await connection.query(query, [phoneNumber]);
    return result;
  } catch (error) {
    console.error('Error deleting OTP details:', error);
    throw error;
  }
};
