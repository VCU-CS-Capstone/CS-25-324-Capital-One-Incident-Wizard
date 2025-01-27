import React, { useEffect } from "react";

const Chatbot = () => {
  useEffect(() => {
    // Check if the script is already added to avoid duplicate scripts
    if (!document.getElementById("openwidget-script")) {
      const script = document.createElement("script");
      script.id = "openwidget-script";
      script.async = true;
      script.type = "text/javascript";
      script.src = "https://cdn.openwidget.com/openwidget.js";

      // Append the script to the document head
      document.head.appendChild(script);

      // Initialize the chatbot configuration
      script.onload = () => {
        window.ow = window.ow || {};
        window.ow.organizationId = "41277a6a-c49c-4136-9e3b-3dddfaccbb1f";
        window.ow.template_id = "8952b9e3-423c-424e-b122-e0462f58ff89";
        window.ow.integration_name = "manual_settings";
        window.ow.product_name = "chatbot";
        if (window.OpenWidget && typeof window.OpenWidget.init === "function") {
          window.OpenWidget.init();
        }
      };
    }
  }, []);

  return (
    <div>
      <h2>Chatbot Integration</h2>
      <p>Your chatbot is now integrated into this React application!</p>
    </div>
  );
};

export default Chatbot;