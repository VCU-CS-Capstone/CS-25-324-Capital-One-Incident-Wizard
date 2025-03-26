import React, { useState, useEffect } from "react";
import logo from "./Capital_One-Logo.wine.png"; // Make sure the path is correct

// A simple function to detect basic OS & browser
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

export default function Chatbot() {
  // Keep track of whether the chat is open
  const [isOpen, setIsOpen] = useState(false);

  // The system message dynamically updated after detecting environment details
  const [messages, setMessages] = useState([
    {
      role: "system",
      content: `You are a helpful assistant gathering structured data about incidents. 
        Your goal is to collect OS, browser, environment details, error codes, user interactions, 
        or any relevant incident context. Retain all important info so we can fill out a form later.`
    },
    {
      role: "assistant",
      content: "Hello! How can I assist you today?"
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // On first load, detect OS/Browser and store it in the conversation
  useEffect(() => {
    const { os, browser } = getBrowserAndOS();
    // Insert an additional system message for environment details
    setMessages((prev) => {
      const newSystemMsg = {
        role: "system",
        content: `User environment details: OS = ${os}, Browser = ${browser}.`
      };
      const updated = [...prev];
      // Insert it right after the first system message
      updated.splice(1, 0, newSystemMsg);
      return updated;
    });
  }, []);

  // Toggles the chat window open/closed
  const toggleChat = () => {
    setIsOpen((prev) => !prev);
  };

  // Handles sending a message
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await response.json();

      if (data.success) {
        const botMessage = { role: "assistant", content: data.reply };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        const errorMsg = {
          role: "assistant",
          content: data.error || "Error: Unable to get a response from the bot."
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (error) {
      const errorMsg = { role: "assistant", content: "Error: Failed to connect to server." };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating circular button (uses the logo) to open the chat */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-4 right-4 w-14 h-14 rounded-full
                     bg-white border border-gray-200 shadow-lg
                     flex items-center justify-center"
        >
          <img
            src={logo}
            alt="Open Chat"
            className="object-contain"
            style={{ height: '32px', width: 'auto' }}
          />
        </button>
      )}

      {/* Chat container, only shown if isOpen is true */}
      {isOpen && (
        <div
          className="fixed bottom-20 right-4 w-full max-w-md
                     bg-white border border-gray-300 shadow-2xl
                     rounded-xl flex flex-col z-50"
          style={{ maxHeight: "80vh" }}
        >
          {/* Header with close button (also uses the same logo) */}
          <div className="flex items-center justify-between py-2 px-4 bg-blue-600 rounded-t-xl">
            <div className="flex items-center gap-2">
              <img
                src={logo}
                alt="Chat Logo"
                style={{ height: '32px', width: 'auto' }}
                className="object-contain"
              />
              <h2 className="text-white font-semibold text-lg">
                Incident Wizard Chat
              </h2>
            </div>
            <button
              onClick={toggleChat}
              className="text-white p-1 text-xl font-bold bg-transparent border-none"
            >
              ✕
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((msg, index) => {
              // Hide system messages from UI
              if (msg.role === "system") return null;
              const isUser = msg.role === "user";
              return (
                <div
                  key={index}
                  className={`p-2 rounded-lg text-sm max-w-[80%]
                             ${isUser
                                ? "bg-blue-500 text-white ml-auto"
                                : "bg-gray-200 text-black mr-auto"
                              }`}
                >
                  {msg.content}
                </div>
              );
            })}
            {loading && (
              <div className="text-sm text-gray-500">
                Bot is typing...
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-2 border-t border-gray-300 flex">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 mr-2 border border-gray-300 p-2 rounded"
              disabled={loading}
            />
            <button
              onClick={handleSendMessage}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}