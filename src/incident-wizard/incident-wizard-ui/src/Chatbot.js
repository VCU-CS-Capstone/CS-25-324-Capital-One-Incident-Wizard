// Chatbot.jsx  –  duplicate‑aware (updated)
import React, { useState, useEffect } from "react";
import { useGlobalStore } from "./GlobalStoreContext";
import { v4 as uuidv4 } from "uuid";
import "./App.css";
import logo from "./Capital_One-Logo.wine.png";

/* -------- util: quick OS / browser detection -------- */
function detectBrowserAndOS() {
  const ua = navigator.userAgent;
  let os = "Unknown";
  if (ua.includes("Win")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";

  let browser = "Unknown";
  if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  return { os, browser };
}

/* -------- util: log click‑stream events -------- */
const makeLogger = dispatch => (event, details = {}) =>
  dispatch({
    type: "ADD_CLICKSTREAM_EVENT",
    payload: { ts: new Date().toISOString(), event, ...details }
  });

export default function Chatbot() {
  /* -------- global store -------- */
  const { state, dispatch } = useGlobalStore();
  const logEvent = makeLogger(dispatch);

  const {
    clientCorrelationId,
    metadata: {
      version    = "1.0.0",
      page       = window.location.href,
      os         = "Unknown",
      browser    = "Unknown",
      htmlOfPage = ""
    } = {},
    clickstream = []
  } = state;

  /* -------- local state -------- */
  const [isOpen, setIsOpen]     = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "system",
      content: `You are an Incident Wizard. You need to gather these fields for a ServiceNow incident:
1. short_description
2. description
3. category

Important:
• Ask the user one question at a time until you have enough info.
• When you have all fields or when the user says you're done, respond with ONLY the final JSON and no extra text:

{
  "short_description": "...",
  "description": "...",
  "category": "..."
}

If the user doesn't have or doesn't know a field, set that field to "N/A".`
    }, {
      role: "assistant",
      content: "Hello! 👋 I’m here to help you with filing a ServiceNow incident. How can I assist you today?"
    }
  ]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);

  /* -------- enrich store on mount -------- */
  useEffect(() => {
    if (!clientCorrelationId) {
      const id = uuidv4();
      dispatch({ type: "SET_CORRELATION_ID", payload: id });
      logEvent("correlation_id_set", { id });
    }
    const { os: o, browser: b } = detectBrowserAndOS();
    dispatch({ type: "SET_METADATA", payload: { os: o, browser: b } });

    if (!htmlOfPage) {
      const html = document.documentElement.outerHTML;
      dispatch({ type: "SET_METADATA", payload: { htmlOfPage: html } });
    }
    logEvent("chatbot_mounted", { page });
    // eslint‑disable‑next‑line react-hooks/exhaustive-deps
  }, []);

  /* -------- helpers -------- */
  const toggleChat = () => {
    setIsOpen(p => {
      const next = !p;
      logEvent(next ? "chat_opened" : "chat_closed");
      return next;
    });
  };

  /* -- main send routine ------------------------------------------------ */
  async function handleSendMessage() {
    if (!input.trim()) return;
    logEvent("user_message_sent", { textLen: input.length });

    const conversation = [...messages, { role: "user", content: input }];
    setMessages(conversation);
    setInput("");
    setLoading(true);

    try {
      /* ---- 1. get LLM reply ---- */
      const chatRes = await fetch("http://localhost:5000/api/chat", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ messages: conversation })
      });
      const chatData = await chatRes.json();
      if (!chatData.success) throw new Error(chatData.error || "Model error");

      let assistantReply = chatData.reply;
      let assistantMsg   = { role: "assistant", content: assistantReply };
      logEvent("assistant_reply_received", { textLen: assistantReply.length });

      /* ---- 2. parse JSON block if present ---- */
      let parsed = null;
      try {
        const idx = assistantReply.indexOf("{");
        if (idx !== -1) parsed = JSON.parse(assistantReply.slice(idx));
      } catch {/* ignore */ }

      /* ---- 3. if we have all fields, run duplicate check ---- */
if (parsed?.description) {
  logEvent("incident_fields_collected");

  let possibleDuplicate = null;
  let currentRelated    = "";
  const threshold       = 0.8;   // 80 % similarity cut-off
  let bestScore         = 0;

  try {
    // 3a. get the 20 most-recent incidents
    const incRes = await fetch("http://localhost:5000/incidents?limit=20", {
      headers: { Accept: "application/json" }
    });
    const recent = await incRes.json();

    // 3b. compare descriptions
    for (const inc of recent) {
      try {
        const cmpRes = await fetch("http://localhost:5000/compare_descriptions", {
          method : "POST",
          headers: { "Content-Type": "application/json" },
          body   : JSON.stringify({
            description1: parsed.description,
            description2: inc.description
          })
        });
        const { success, similarity } = await cmpRes.json();
        if (success && similarity > bestScore) {
          bestScore        = similarity;
          possibleDuplicate = inc;
        }
      } catch (err) {
        console.error("Similarity check failed for", inc.number, err);
      }
    }

    // 3c. accept as duplicate only if similarity ≥ threshold
    if (possibleDuplicate && bestScore >= threshold) {
      logEvent("duplicate_detected", {
        number: possibleDuplicate.number,
        score : bestScore.toFixed(2)
      });
      currentRelated = (possibleDuplicate.u_related_issues || "").trim();
    } else {
      logEvent("no_duplicate_found", { bestScore: bestScore.toFixed(2) });
      possibleDuplicate = null;   // fall through to normal create-flow
    }
  } catch (err) {
    console.error("Could not fetch incidents:", err);
  }

  /* 3d. merge and PATCH when duplicate found */
  if (possibleDuplicate) {
    setMessages(prev => [
      ...prev,
      {
        role   : "assistant",
        content: `This looks very similar to existing incident ${possibleDuplicate.number}. Updating its related issues…`
      }
    ]);

    const shortDesc  = parsed.short_description || parsed.description;
    const newEntry   = `Description: "${shortDesc}", Correlation ID: ${clientCorrelationId}`;
    const updatedRel = currentRelated ? `${currentRelated}\n${newEntry}` : newEntry;

    try {
      const patchRes = await fetch(
        `http://localhost:5000/update_incident/${possibleDuplicate.number}`,
        {
          method : "PATCH",
          headers: { "Content-Type": "application/json" },
          body   : JSON.stringify({ u_related_issues: updatedRel })
        }
      );
      if (!patchRes.ok) throw new Error(`status ${patchRes.status}`);

      setMessages(prev => [
        ...prev,
        {
          role   : "assistant",
          content: `✅ Incident ${possibleDuplicate.number} updated with related issues.`
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role   : "assistant",
          content: `❌ Failed to update incident ${possibleDuplicate.number}: ${err.message}`
        }
      ]);
    }

    setLoading(false);
    return;   // stop the flow – no new incident created
  }




        /* ---- 4. create incident (no duplicate) ---- */
        const payload = {
          short_description  : parsed.short_description || "N/A",
          description        : parsed.description       || "N/A",
          category           : parsed.category          || "N/A",
          impact             : parsed.impact            || "N/A",
          urgency            : parsed.urgency           || "N/A",
          u_version          : version,
          correlation_id     : clientCorrelationId,
          u_clickstream_data : clickstream,
          u_html_of_page     : htmlOfPage
        };

        try {
          const snRes = await fetch("http://localhost:5000/create_incident", {
            method : "POST",
            headers: { "Content-Type": "application/json" },
            body   : JSON.stringify(payload)
          });
          const snData = await snRes.json();

          assistantMsg = snRes.ok
            ? {
                role   : "assistant",
                content: `Incident created successfully.\nNumber: ${snData.number}\nSys_ID: ${snData.sys_id}`
              }
            : {
                role   : "assistant",
                content: `Incident creation failed (${snRes.status}).\nDetails: ${snData.details}`
              };
        } catch (err) {
          assistantMsg = {
            role   : "assistant",
            content: `Network error while creating incident: ${err.message}`
          };
        }
      }

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message}` }
      ]);
    } finally {
      setLoading(false);
    }
  }

  /* -------- UI (unchanged except file name) -------- */
  return (
    <div className="app-container">
      

      {!isOpen && (
        <button onClick={toggleChat} className="small-button" aria-label="Open Chat">
          <img src={logo} alt="Open Chat" />
        </button>
      )}

      {isOpen && (
        <div className="chat-container">
          <div className="header" style={{ padding: "10px", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <img src={logo} alt="Chat Logo" style={{ height: "40px", marginRight: "10px" }} />
              <h2>Incident Wizard Chat</h2>
            </div>
            <button
              onClick={toggleChat}
              className="close-button"
              aria-label="Close Chat"
              title="Close"
            >
              ×
            </button>
          </div>

          <div className="messages-container">
            {messages.map((m, i) =>
              m.role === "system" ? null : (
                <div key={i} className={`message ${m.role === "user" ? "user-message" : "bot-message"}`}>
                  {m.content}
                </div>
              )
            )}
            {loading && <div className="status">Bot is typing…</div>}
          </div>

          <div className="input-form">
            <input
              type="text"
              className="input-field"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") handleSendMessage();
              }}
              placeholder="Type a message…"
              disabled={loading}
            />
            <button className="send-button" onClick={handleSendMessage} disabled={loading}>
              {loading ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
