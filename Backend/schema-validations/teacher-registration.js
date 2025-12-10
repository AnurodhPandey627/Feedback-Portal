// validators/teacherRegistration.js
const Joi = require('joi');

const teacherRegistrationSchema = Joi.object({
  school: Joi.string()
    .trim()
    .required(),

  tname: Joi.string()
    .trim()
    .required(),

  tphone: Joi.string()
    .pattern(/^\d{10}$/)     // exactly 10 digits
    .required(),

  aadhar_no: Joi.string()
    .pattern(/^\d{12}$/)     // exactly 12 digits
    .required(),

  highest_qualifications: Joi.string()
    .trim()
    .required(),

  village: Joi.string()
    .trim()
    .required(),

  state: Joi.string()
    .trim()
    .required(),

  district: Joi.string()
    .trim()
    .required(),

  country: Joi.string()
    .trim()
    .required()
});

module.exports = teacherRegistrationSchema;
