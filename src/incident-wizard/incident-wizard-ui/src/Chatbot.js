import React, { useState, useEffect } from "react";
import "./App.css";
import logo from "./Capital_One-Logo.wine.png";

// Function to detect user's operating system and browser
function getBrowserAndOS() {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;

  let os = "Unknown OS";
  let browser = "Unknown Browser";

  if (/Win/.test(platform)) os = "Windows";
  else if (/Mac/.test(platform)) os = "MacOS";
  else if (/Linux/.test(platform)) os = "Linux";
  else if (/Android/.test(userAgent)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(userAgent)) os = "iOS";

  if (/Chrome/.test(userAgent) && !/Edge|OPR/.test(userAgent)) browser = "Chrome";
  else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) browser = "Safari";
  else if (/Firefox/.test(userAgent)) browser = "Firefox";
  else if (/Edg/.test(userAgent)) browser = "Edge";
  else if (/OPR/.test(userAgent)) browser = "Opera";

  return { os, browser };
}

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "system",
      content: `
You are an Incident Wizard. You need to gather these fields for a ServiceNow incident:
1. short_description
2. description
3. category
4. subcategory
5. service
6. service_offering
7. configuration_item
8. state
9. impact
10. urgency

**Important**:
- Ask the user one question at a time until you have enough info.
- Once you have all fields or the user explicitly says they're done, respond with ONLY the final JSON and no extra text:

{
  "short_description": "...",
  "description": "...",
  "category": "...",
  "subcategory": "...",
  "service": "...",
  "service_offering": "...",
  "configuration_item": "...",
  "state": "...",
  "impact": "...",
  "urgency": "..."
}

If the user doesn't have or doesn't know a field, set it to "N/A".
`
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // On mount, detect user's OS & browser and insert into system context
  useEffect(() => {
    const { os, browser } = getBrowserAndOS();
    setMessages((prev) => {
      const newSystemMsg = {
        role: "system",
        content: `User environment details: OS = ${os}, Browser = ${browser}.`
      };
      const updated = [...prev];
      // Insert system info as second message
      updated.splice(1, 0, newSystemMsg);
      return updated;
    });
  }, []);

  // Toggle chat window visibility
  const toggleChat = () => setIsOpen((prev) => !prev);

  // Handle sending a new message from the user
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Append the user's message to the conversation
    const userMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      // Call the backend chat endpoint with the conversation history
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await response.json();

      if (data.success) {
        let botReply = data.reply;
        let botMessage = { role: "assistant", content: botReply };

        // Attempt to parse the bot's reply as JSON if it starts with '{'
        let incidentFields;
        try {
          const curlyIndex = botReply.indexOf("{");
          if (curlyIndex !== -1) {
            const jsonPart = botReply.slice(curlyIndex).trim();
            incidentFields = JSON.parse(jsonPart);
          }
        } catch (err) {
          console.error("Failed to parse JSON:", err);
        }

        // If a valid final JSON payload is detected, auto-create the incident.
        if (incidentFields && incidentFields.short_description) {
          console.log("Parsed incident fields:", incidentFields);
          // Get OS and Browser details again for the payload
          const { os, browser } = getBrowserAndOS();

          // Build the payload ensuring any missing fields are set to "N/A"
          const payload = {
            short_description: incidentFields.short_description || "N/A",
            description: incidentFields.description || "N/A",
            category: incidentFields.category || "N/A",
            subcategory: incidentFields.subcategory || "N/A",
            service: incidentFields.service || "N/A",
            service_offering: incidentFields.service_offering || "N/A",
            configuration_item: incidentFields.configuration_item || "N/A",
            state: incidentFields.state || "N/A",
            impact: incidentFields.impact || "N/A",
            urgency: incidentFields.urgency || "N/A",
            u_operating_system: os,
            u_browser: browser
          };

          try {
            const createIncidentResponse = await fetch("http://localhost:5000/create_incident", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });

            const createData = await createIncidentResponse.json();

            if (createIncidentResponse.ok) {
              // Incident created successfully
              botMessage = {
                role: "assistant",
                content: `Incident created! Number: ${createData.number}, Sys_ID: ${createData.sys_id}`
              };
            } else {
              botMessage = {
                role: "assistant",
                content: `Sorry, incident creation failed:\n${createData.details}`
              };
            }
          } catch (err) {
            console.error("Error calling /create_incident:", err);
            botMessage = {
              role: "assistant",
              content: "Error: Could not create incident."
            };
          }
        }

        // Append the bot's reply to the conversation
        setMessages((prev) => [...prev, botMessage]);
      } else {
        const errorMsg = {
          role: "assistant",
          content: data.error || "Error: Unable to get a response from the bot."
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (error) {
      const errorMsg = {
        role: "assistant",
        content: "Error: Failed to connect to server."
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="header-title">IT Support Chatbot</h1>
      </header>

      {/* When the chat window is closed, show a button to open it */}
      {!isOpen && (
        <button onClick={toggleChat} className="small-button" aria-label="Open Chat">
          <img src={logo} alt="Open Chat" />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="chat-container">
          {/* Chat window header */}
          <div className="header" style={{ padding: "10px", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <img src={logo} alt="Chat Logo" style={{ height: "40px", marginRight: "10px" }} />
              <h2>Incident Wizard Chat</h2>
            </div>
            <button onClick={toggleChat} style={{ fontSize: "18px", background: "none", border: "none", cursor: "pointer" }}>
              ✕
            </button>
          </div>

          {/* Message display area */}
          <div className="messages-container">
            {messages.map((msg, index) => {
              // Hide system messages from user display
              if (msg.role === "system") return null;
              return (
                <div
                  key={index}
                  className={`message ${msg.role === "user" ? "user-message" : "bot-message"}`}
                >
                  {msg.content}
                </div>
              );
            })}
            {loading && <div className="status">Bot is typing...</div>}
          </div>

          {/* Input area */}
          <div className="input-form">
            <input
              type="text"
              className="input-field"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Check if the Enter key is pressed
                if (e.key === "Enter") {
                  // Optionally, prevent default behavior if necessary:
                  // e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type a message..."
              disabled={loading}
            />
            <button className="send-button" onClick={handleSendMessage} disabled={loading}>
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
