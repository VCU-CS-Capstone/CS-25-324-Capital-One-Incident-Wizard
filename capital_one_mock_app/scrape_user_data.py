# scrape_user_data.py
import requests
import json

BASE_URL = "http://localhost:5050"
LOGIN_URL = f"{BASE_URL}/login"
USER_API = f"{BASE_URL}/api/user"
METADATA_API = f"{BASE_URL}/metadata"

session = requests.Session()

login_payload = {
    "username": "johndoe",
    "password": "test123"
}

print("[*] Logging in...")

# Simulate login via form POST
login_response = session.post(LOGIN_URL, data=login_payload, allow_redirects=False)

if login_response.status_code == 302:
    print("[+] Login successful!")

    # Fetch user data
    print("[*] Fetching user data...")
    user_data = session.get(USER_API).json()

    # Fetch metadata
    print("[*] Fetching app metadata...")
    metadata = session.get(METADATA_API).json()

    # Combine and save
    combined = {
        "user_data": user_data,
        "app_metadata": metadata
    }

    with open("scraped_combined.json", "w") as f:
        json.dump(combined, f, indent=2)

    print("[+] Combined data saved to scraped_combined.json")

else:
    print(f"[!] Login failed. Status code: {login_response.status_code}")
