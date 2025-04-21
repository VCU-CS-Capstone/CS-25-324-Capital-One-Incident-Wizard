# app.py

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import openai
import os
import json
import requests

load_dotenv()  # Load .env environment variables

# --- ServiceNow Credentials & Instance ---
SN_INSTANCE = os.getenv("SN_INSTANCE")
USERNAME = "admin"
PASSWORD = os.getenv("PASSWORD")

# Verify that the required environment variables are set
if not SN_INSTANCE or not USERNAME or not PASSWORD:
    raise ValueError("ServiceNow credentials (SN_INSTANCE, USERNAME, PASSWORD) must be set in .env")

# --- OpenAI API Key ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("Missing OpenAI API Key. Check .env file.")

# --- Flask Setup ---
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

        # Expecting an array of messages with roles: "system", "assistant", or "user"
        # Example:
        # [
        #   { "role": "system", "content": "You are a helpful assistant..." },
        #   { "role": "assistant", "content": "Hello" },
        #   { "role": "user", "content": "Hi, can you gather OS details?" }
        # ]
        messages = data.get("messages", [])
        if not messages:
            return jsonify({"success": False, "error": "No messages provided."}), 400

        # Call the openai Chat Completion endpoint
        response = openai.ChatCompletion.create(
    model="gpt-3.5-turbo",
    messages=messages
)

        # Extract the assistant's reply
        reply = response.choices[0].message.content
        return jsonify({"success": True, "reply": reply}), 200

    except Exception as e:
        # Log error server-side
        print(f"Server Error in /api/chat: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ServiceNow integration
@app.route('/create_incident', methods=['POST'])
def create_incident():
    """
    Expects a JSON payload with at least:
    {
      "short_description": "...",
      "description": "..."
      // Optionally:
      // "urgency": "1",
      // "impact": "1",
      // etc.
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON payload provided"}), 400
        short_description = data.get('short_description', 'No short description provided')
        description = data.get('description', 'No description provided')
        category = data.get('category')
        impact = data.get('impact')
        urgency = data.get('urgency')
        version = data.get('u_version')
        clickstream = data.get("u_clickstream_data")
        correlation_id = data.get("correlation_id")
        html_of_page = data.get("u_html_of_page")
        related_issues = data.get("u_related_issues")



        # You can optionally include more fields, like urgency, impact, or custom fields.
        # For example, you might do:
        # urgency = data.get('urgency', '1')
        # impact = data.get('impact', '2')

        # Prepare the payload to create an incident in ServiceNow
        payload = {
            "short_description": short_description,
            "description": description,
            "category" : category,
            "impact": impact,
            "urgency": urgency,
            "u_version" : version,
            "correlation_id" : correlation_id,
            "u_clickstream_data" : clickstream,
            "u_html_of_page" : html_of_page,
            "u_related_issues" : related_issues


        }

        # The URL for creating new incidents via the ServiceNow Table API
        url = f"{SN_INSTANCE}"

        # Required headers for the ServiceNow API
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        # Make the POST request to ServiceNow with Basic Auth
        response = requests.post(
            url,
            auth=(USERNAME, PASSWORD),
            headers=headers,
            data=json.dumps(payload)
        )

        # Check response status from ServiceNow
        if response.status_code == 201:
            # 201 = Created
            result = response.json().get('result', {})
            return jsonify({
                "message": "Incident created successfully",
                "sys_id": result.get('sys_id'),
                "number": result.get('number')
            }), 201
        else:
            # Something went wrong; return the details for debugging
            return jsonify({
                "error": "Failed to create incident",
                "status_code": response.status_code,
                "details": response.text
            }), response.status_code

    except Exception as e:
        print(f"Server Error in /create_incident: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/incidents', methods=['GET'])
def get_incidents():
    """
    Query ServiceNow for existing incidents.

    Optional query parameters:
      • limit – max rows to return               (default 50)
      • since – sys_created_on>=value (YYYY‑MM‑DD) filter
      • state – filter by incident state number  (e.g. 1 = New)

    Response: 200
    [
      {
        "number"        : "INC0010004",   # (remove if not needed)
        "description"   : "...",
        "correlation_id": "123e4567‑e89b‑12d3‑a456‑426614174000"
      },
      ...
    ]
    """
    try:
        limit = int(request.args.get("limit", 50))
        since = request.args.get("since")   # YYYY‑MM‑DD
        state = request.args.get("state")   # numeric state code

        # ---- build sysparm_query ----
        query_parts = []
        if since:
            query_parts.append(f"sys_created_on>={since} 00:00:00")
        if state:
            query_parts.append(f"state={state}")
        sysparm_query = "^".join(query_parts) if query_parts else ""

        fields = ",".join(
            [
                "number",          # keep for reference; delete if unwanted
                "description",
                "correlation_id",
            ]
        )

        url = (
            f"{SN_INSTANCE}"
            f"?sysparm_query={sysparm_query}"
            f"&sysparm_fields={fields}"
            f"&sysparm_limit={limit}"
        )
        headers = {"Accept": "application/json"}

        sn_res = requests.get(url, auth=(USERNAME, PASSWORD), headers=headers)
        if sn_res.status_code != 200:
            return (
                jsonify(
                    {
                        "error": "Failed to pull incidents",
                        "status_code": sn_res.status_code,
                        "details": sn_res.text,
                    }
                ),
                sn_res.status_code,
            )

        results = sn_res.json().get("result", [])
        return jsonify(results), 200

    except Exception as e:
        print(f"Server Error in /incidents: {e}")
        return jsonify({"error": str(e)}), 500
    

if __name__ == '__main__':
    # For local development:
    app.run(debug=True, host='0.0.0.0', port=5000)