// validators/studentQuestionnaire.js
const Joi = require('joi');

const studentQuestionnaireSchema = Joi.object({
  answers: Joi.array()
    .items(Joi.string().trim())
    .min(1)
    .required(),

  q_texts: Joi.array()
    .items(Joi.string().trim())
    .min(1)
    .required(),

  correct_answers: Joi.array()
    .items(Joi.string().trim().valid("A", "B", "C", "D"))
    .min(1)
    .required()
});

module.exports = studentQuestionnaireSchema;
