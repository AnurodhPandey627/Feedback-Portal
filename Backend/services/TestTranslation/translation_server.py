from flask import Flask,request,jsonify
from translation import translate_text_block
import traceback

app = Flask(__name__)

@app.route('/')
def hello_root():
    print("app is listening to port 5000")
    return "<h1>Hello! I am the root server</h1>"

@app.route('/translate',methods=['POST'])
def translate():
    data = request.get_json()
    text = data.get("text","")

    if not text:
        return jsonify({"error":"No text provided"}),400
    
    try:
        translated = translate_text_block(text)
        return jsonify({"translated:":translated})
    except Exception as e:
        traceback.print_exc()
        print(e)
        return jsonify({"error:":e}),500


if __name__ == "__main__":
    app.run(host='0.0.0.0',port=5000)    

