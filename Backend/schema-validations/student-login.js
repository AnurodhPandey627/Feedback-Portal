// validators/studentLogin.js
const Joi = require('joi');

const studentLoginSchema = Joi.object({
  school: Joi.string()
    .trim()
    .required(),

  class: Joi.string()
    .trim()
    .required(),

  roll_no: Joi.number()      // roll_no is an integer
    .integer()
    .min(1)
    .required()
});

module.exports = studentLoginSchema;
