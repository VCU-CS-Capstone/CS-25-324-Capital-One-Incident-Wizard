// Chatbot.jsx  –  duplicate‑aware
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

/* -------- util: text similarity (Jaccard of word sets) -------- */
function jaccard(a, b) {
  const toSet = str =>
    new Set(
      str
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter(Boolean)
    );
  const A = toSet(a);
  const B = toSet(b);
  const inter = [...A].filter(x => B.has(x)).length;
  const union = new Set([...A, ...B]).size || 1;
  return inter / union; // 0..1
}

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
      } catch {/* ignore */}

      /* ---- 3. if we have all fields, run duplicate check ---- */
      if (parsed?.description) {
        logEvent("incident_fields_collected");

        // 3a. pull recent incidents
        let possibleDuplicate = null;
        try {
          const incRes = await fetch("http://localhost:5000/incidents?limit=100", {
            headers: { Accept: "application/json" }
          });
          const oldInc = await incRes.json();

          // 3b. compute similarity against each
          const threshold = 0.8; // 80 % overlap
          let bestScore = 0;
          oldInc.forEach(inc => {
            const score = jaccard(parsed.description, inc.description || "");
            if (score > bestScore) {
              bestScore        = score;
              possibleDuplicate = score >= threshold ? inc : possibleDuplicate;
            }
          });
        } catch (err) {
          console.error("Could not fetch incidents:", err);
        }

        // 3c. if duplicate found, tell user
        if (possibleDuplicate) {
          assistantMsg = {
            role   : "assistant",
            content: `This looks very similar to existing incident ${possibleDuplicate.number}. It may be a duplicate.`
          };
          setMessages(prev => [...prev, assistantMsg]);
          setLoading(false);
          return; // do NOT create a new incident automatically
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
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  /* -------- UI (unchanged except file name) -------- */
  return (
    <div className="app-container">
      <header className="header">
        <h1 className="header-title">IT Support Chatbot</h1>
      </header>

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
              style={{ fontSize: "16px", background: "none", border: "none", cursor: "pointer" }}
              aria-label="Close Chat"
            >
              Close
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