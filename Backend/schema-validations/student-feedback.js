// validators/studentFeedback.js
const Joi = require('joi');

const studentFeedbackSchema = Joi.object({
  SID: Joi.number()
    .integer()
    .required(),

  SUBID: Joi.number()
    .integer()
    .required(),

  subject: Joi.string().required(),
    
  class_start_time: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/) // matches "HH:MM"
    .required(),

  class_end_time: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .required(),

  topics: Joi.array()
    .items(Joi.string().trim())
    .min(1)
    .required(),

  understanding: Joi.string()
    .trim()
    .valid("excellent", "good", "average", "poor") // match your frontend options
    .required(),

  interaction: Joi.string()
    .trim()
    .valid("Yes,Solved", "Yes,Unsolved", "No")
    .required(),

  practical_example: Joi.string()
    .trim()
    .valid("Yes", "No")
    .required(),

  prev_hw: Joi.string()
    .trim()
    .valid("Yes", "No")
    .required(),

  curr_hw: Joi.string()
    .trim()
    .valid("Yes", "No")
    .required(),

  additional_feedback: Joi.string()
    .allow("", null)   // optional, can be empty
    .max(500)         // you can adjust max length
});

module.exports = studentFeedbackSchema;
