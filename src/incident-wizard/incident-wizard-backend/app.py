from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import openai
import os
import json
import requests

# Load environment variables
load_dotenv()

# Flask setup
app = Flask(__name__)
CORS(app)

# Credentials
SN_INSTANCE = os.getenv("SN_INSTANCE")
USERNAME = os.getenv("USERNAME", "admin")
PASSWORD = os.getenv("PASSWORD")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai.api_key = OPENAI_API_KEY

# Verify credentials
if not all([SN_INSTANCE, USERNAME, PASSWORD, OPENAI_API_KEY]):
    raise ValueError("Missing required environment variables.")

@app.route('/')
def home():
    return "Flask backend running!"

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        user_messages = data.get("messages", [])

        if not user_messages:
            return jsonify({"success": False, "error": "No messages provided."}), 400

        # Add system prompt to guide assistant behavior
        conversation = [
            {
                "role": "system",
                "content": (
                    "You are a helpful IT support assistant. You only help users with application-level issues involving these tools: Outlook, Zoom, Salesforce, Teams, Jira, and ServiceNow. "
                    "When the user says 'submit the incident' or 'create the ticket', respond ONLY with a JSON object including: short_description, description, urgency, impact, caller_id, category, and assignment_group. "
                    "Do not include explanations or text outside the JSON."
                )
            },
            *user_messages
        ]

        # Call OpenAI Chat Completion
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo-1106",
            messages=conversation
        )

        reply_content = response.choices[0].message.content

        # Determine if user wants to trigger incident creation
        trigger_phrases = ["submit incident", "create incident", "submit the ticket", "go ahead", "send to servicenow"]
        last_user_message = user_messages[-1]["content"].lower()

        if any(phrase in last_user_message for phrase in trigger_phrases):
            try:
                incident_json = json.loads(reply_content)

                # Send to ServiceNow
                sn_response = requests.post(
                    f"{SN_INSTANCE}/api/now/table/incident",
                    auth=(USERNAME, PASSWORD),
                    headers={
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    data=json.dumps(incident_json)
                )

                if sn_response.status_code == 201:
                    sn_data = sn_response.json()
                    return jsonify({
                        "success": True,
                        "submitted": True,
                        "servicenow_response": sn_data
                    }), 201
                else:
                    return jsonify({
                        "success": False,
                        "submitted": True,
                        "status_code": sn_response.status_code,
                        "details": sn_response.text
                    }), sn_response.status_code

            except json.JSONDecodeError:
                return jsonify({
                    "success": False,
                    "submitted": False,
                    "error": "Expected JSON from assistant but got malformed content.",
                    "raw": reply_content
                }), 400
        else:
            return jsonify({
                "success": True,
                "submitted": False,
                "reply": reply_content
            }), 200

    except Exception as e:
        print(f"Server Error in /api/chat: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
