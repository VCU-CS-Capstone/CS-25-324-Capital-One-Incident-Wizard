# Add this import if not already there
from flask import Flask, render_template, jsonify, request, redirect, url_for, session
import json

app = Flask(__name__)
app.secret_key = "mock-capital-one-secret"

with open("metadata.json") as f:
    app_metadata = json.load(f)

# Fake user data
mock_user = {
    "username": "johndoe",
    "password": "test123",  # for demo only
    "name": "John Doe",
    "account": "1234567890",
    "balance": "8,215.67",
    "transactions": [
        {"date": "2025-04-08", "description": "Grocery Store", "amount": "85.23"},
        {"date": "2025-04-06", "description": "Online Subscription", "amount": "15.99"},
        {"date": "2025-04-04", "description": "Coffee Shop", "amount": "4.75"}
    ]
}

@app.route("/")
def home():
    if "logged_in" in session:
        return render_template("index.html", user=mock_user)
    return redirect(url_for("login"))

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        if request.form["username"] == mock_user["username"] and request.form["password"] == mock_user["password"]:
            session["logged_in"] = True
            return redirect(url_for("home"))
        else:
            return "Invalid credentials", 401
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.pop("logged_in", None)
    return redirect(url_for("login"))

@app.route("/metadata")
def metadata():
    return jsonify(app_metadata)

@app.route("/api/user")
def api_user():
    if "logged_in" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(mock_user)

if __name__ == "__main__":
    app.run(debug=True, port=5050)
