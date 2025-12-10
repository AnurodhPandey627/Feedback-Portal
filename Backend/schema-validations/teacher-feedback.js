// validators/teacherFeedback.js
const Joi = require('joi');

const teacherFeedbackSchema = Joi.object({
  TID: Joi.number()
    .integer()
    .required(),

  SUBID: Joi.number()
    .integer()
    .required(),

  DAY:  Joi.string().required(),
  
  P_NO: Joi.number().required(),

  class_start_time: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .required(),

  class_end_time: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .required(),

  present_students: Joi.number()
    .integer()
    .min(0)
    .required(),

  topics: Joi.array()
    .items(Joi.string().trim())
    .min(1)
    .required(),

  additional_feedback: Joi.string()
    .allow("", null)
    .max(500),

  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required()
});

module.exports = teacherFeedbackSchema;
