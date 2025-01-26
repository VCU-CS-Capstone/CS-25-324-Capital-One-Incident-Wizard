# app.py
from flask import Flask, jsonify
import requests
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return "Flask backend running!"

@app.route('/api/example-data', methods=['GET'])
def get_example_data():
    try:
        # Fetch multiple bank items from the Random Data API
        response = requests.get("https://random-data-api.com/api/v2/banks?size=5")
        response.raise_for_status()

        data = response.json()  # This should be a list of bank objects
        return jsonify({
            "success": True,
            "banks": data
        }), 200

    except requests.exceptions.RequestException as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)