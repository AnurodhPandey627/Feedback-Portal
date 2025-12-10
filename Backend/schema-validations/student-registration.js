// validators/studentRegistration.js
const Joi = require('joi');

const studentRegistrationSchema = Joi.object({
  school: Joi.string()
    .trim()
    .required(),

  roll_no: Joi.number()
    .integer()
    .min(1)
    .required(),

  class: Joi.string()
    .trim()
    .required(),

  sname: Joi.string()
    .trim()
    .required(),

  sphone_no: Joi.string()
    .pattern(/^\d{10}$/)           // must be 10 digits if provided
    .allow('', null),

  parent_phone_no: Joi.string()     // required, 10 digits
    .pattern(/^\d{10}$/)
    .required(),

  dob: Joi.date()
    .iso()
    .max('now')                    // cannot be a future date
    .required(),

  aadhar_no: Joi.string()
    .pattern(/^\d{12}$/)           // exactly 12 digits
    .required(),

  village: Joi.string()
    .trim()
    .required(),

  district: Joi.string()
    .trim()
    .required(),

  state: Joi.string()
    .trim()
    .required(),

  country: Joi.string()
    .trim()
    .required()
});

module.exports = studentRegistrationSchema;
