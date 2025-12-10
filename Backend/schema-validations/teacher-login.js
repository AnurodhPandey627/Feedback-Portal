// validators/teacherLogin.js
const Joi = require('joi');

const teacherLoginSchema = Joi.object({
  aadhar_no: Joi.string()
    .pattern(/^\d{12}$/)
    .required(),

  tphone: Joi.string()
    .pattern(/^\d{10}$/)
    .required()
});

module.exports = teacherLoginSchema;
