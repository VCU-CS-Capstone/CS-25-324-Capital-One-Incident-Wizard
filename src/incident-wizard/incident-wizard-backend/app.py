# app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import openai
import os

load_dotenv()  # Load .env environment variables

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("Missing OpenAI API Key. Check .env file.")

app = Flask(__name__)
CORS(app)

# Set your OpenAI API key so openai library knows where to auth
openai.api_key = OPENAI_API_KEY

@app.route('/')
def home():
    return "Flask backend running!"

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()

        # Expecting an array of messages with roles: "system" | "assistant" | "user"
        # Example:
        # [
        #   { "role": "system", "content": "You are a helpful assistant..." },
        #   { "role": "assistant", "content": "Hello" },
        #   { "role": "user", "content": "Hi, can you gather OS details?" }
        # ]
        messages = data.get("messages", [])
        if not messages:
            return jsonify({"success": False, "error": "No messages provided."}), 400

        # Call the new openai API method for Chat Completion
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages
        )

        # Extract the assistant's reply
        reply = response.choices[0].message.content

        return jsonify({"success": True, "reply": reply}), 200

    except Exception as e:
        print(f"Server Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)