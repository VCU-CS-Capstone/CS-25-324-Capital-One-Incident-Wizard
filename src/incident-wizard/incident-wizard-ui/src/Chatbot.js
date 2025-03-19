import React, { useState } from "react";

const Chatbot = () => {
  const [messages, setMessages] = useState([
    { text: "Hello! How can I assist you today?", sender: "bot" },
  ]);
  const [input, setInput] = useState("");

  const handleSendMessage = () => {
    if (input.trim() === "") return;
    const newMessages = [...messages, { text: input, sender: "user" }];
    setMessages(newMessages);
    setInput("");
    
    // Placeholder for API call integration
    setTimeout(() => {
      setMessages((prev) => [...prev, { text: "(Bot response coming soon...)", sender: "bot" }]);
    }, 1000);
  };

  return (
    <div className="w-full max-w-md mx-auto shadow-md rounded-lg p-4 bg-white">
      <div className="h-96 overflow-y-auto border-b p-2">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`mb-2 p-2 max-w-[80%] rounded-lg text-sm ${
              msg.sender === "user" ? "bg-blue-500 text-white ml-auto" : "bg-gray-200 text-black"
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>
      <div className="flex items-center p-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 mr-2 border p-2 rounded"
        />
        <button onClick={handleSendMessage} className="bg-blue-500 text-white px-4 py-2 rounded">
          Send
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
