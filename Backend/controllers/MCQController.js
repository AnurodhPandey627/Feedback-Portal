const wrapAsync = require("../utils/wrapasync");
const axios = require("axios");

exports.mcqsToTranslationText = function (mcqs) {
  return mcqs
    .map(mcq => {
      const opts = mcq.options.join(", ");
      return `${mcq.question}\n${opts}`;
    })
    .join("\n\n"); // blank line between MCQs
}

exports.translationTextToMCQs = function (hindiText, englishMCQs) {
  const lines = hindiText
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean); // remove empty lines

  const mcqs = [];
  for (let i = 0; i < lines.length; i += 2) {
    const question = lines[i];
    const options = lines[i + 1]?.split(",").map(opt => opt.trim()) || [];

    mcqs.push({
      question,
      options,
      answer: englishMCQs[mcqs.length].answer
    });
  }
  return mcqs;
}

exports.translateFunction = async function (text){
    try{
        const translationReq = await axios.post('http://192.168.30.151:5000/translate',{
              text:text,
        });

        console.dir("transaltionReq: "+translationReq);//translationReq is an array of objects having size 2

        const hindiText = translationReq.data.translated || translationReq.data["translated:"];
        console.log("HINDI TRANSLATION:-\n",hindiText);

        return hindiText;
    }
    catch(error){
        console.log("Error in translation:\n",error);
        return;
    }        
};
