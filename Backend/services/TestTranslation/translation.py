from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from threading import Lock

translate_lock = Lock()

# Load the model and tokenizer
model_name = "facebook/nllb-200-distilled-600M"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

# Supported language codes (English and Hindi here)
lang_code_en = "eng_Latn"
lang_code_hi = "hin_Deva"

#add source language
tokenizer.src_lang = lang_code_en

# Example: Translate English → Hindi
# batch_sentences = [
#     """Q1. What is the capital of India?
#     (a) Mumbai
#     (b) Delhi
#     (c) Kolkata
#     (d) Chennai
#     Answer: Option (b)""",
#     """Q1. What is the capital of India?
#     (a) Mumbai
#     (b) Delhi
#     (c) Kolkata
#     (d) Chennai
#     Answer: Option (b)""",
#     """Q1. What is the capital of India?
#     (a) Mumbai
#     (b) Delhi
#     (c) Kolkata
#     (d) Chennai
#     Answer: Option (b)"""
# ]

def split_for_translation(text):
    # Split paragraph into individual non-empty lines
    return [line.strip() for line in text.splitlines() if line.strip()]


def translate_text_block(text,batch_size=4):
    lines = split_for_translation(text)
    translated_lines = []

    for i in range(0,len(lines),batch_size):
        batch = lines[i:i+batch_size]
        if not batch or all(b.strip() == "" for b in batch):
            continue  # Skip this batch

        # Tokenize input
        encoded_inputs = tokenizer(batch, return_tensors="pt",padding=True,truncation=True)
        #print(encoded_inputs)

        # Generate translation
        translated_tokens = model.generate(
            **encoded_inputs,
            forced_bos_token_id=tokenizer.convert_tokens_to_ids(lang_code_hi), 
            max_length=512,
            num_beams=5
            )
        translated_texts = tokenizer.batch_decode(translated_tokens, skip_special_tokens=True)
        translated_lines.extend(translated_texts)

    return "\n".join(translated_lines)

if __name__ == "__main__":
    text = """
    Q1. What is the capital of India?
    (a) Mumbai
    (b) Delhi
    (c) Kolkata
    (d) Chennai
    Answer: Option (b)

    Q2. Who wrote the national anthem?
    Answer: Rabindranath Tagore

    Q3. Write a short paragraph about the importance of education.
    Answer: Education is essential for both individual and societal advancement. It equips individuals with knowledge, skills, and critical thinking abilities, opening doors to better job opportunities and a more fulfilling life. Furthermore, education fosters personal growth, promotes equality, and drives economic development. 
    """
    translated_output = translate_text_block(text)
    print("\nHINDI TRANSLATION")
    print(translated_output)
    # for src, tgt in zip(text, translated_texts):
    #     print(f"\nENGLISH: {src}\nHINDI: {tgt}")

    # for tgt in translated_texts:
    #     print(tgt)