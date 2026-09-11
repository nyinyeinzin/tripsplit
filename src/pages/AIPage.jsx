import { useEffect, useState } from "react";
import { Send, Sparkles, Undo2 } from "lucide-react";
import { travelAI } from "../services/aiService";
import { applyAIActions } from "../services/aiActions";
import { buildTripContext } from "../utils/tripContext";
import { airbnbs } from "../data/tripData";
import { STORAGE_KEYS, readStoredJson, writeStoredJson } from "../utils/storage";

// Keep localStorage in check — the transcript is a convenience, not an archive.
const maxStoredMessages = 60;
const initialMessages = [
  { role: "assistant", text: "Ask me to add, move, remove, optimize, or explain Bali trip plans." }
];

export default function AIPage({ activities, currency, onApplyAIActivities, onUndoAI, canUndo }) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState(() => readStoredMessages());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    writeStoredJson(STORAGE_KEYS.aiChat, messages.slice(-maxStoredMessages));
  }, [messages]);

  async function handleSubmit(event) {
    event?.preventDefault();
    const text = prompt.trim();
    if (!text || loading) return;

    setLoading(true);
    setMessages((current) => [...current, { role: "user", text }]);
    setPrompt("");

    try {
      const tripContext = buildTripContext({ activities, airbnbs, currency });
      const result = await travelAI(text, tripContext);
      const updatedActivities = applyAIActions(activities, result);
      const changed = changedActivities(activities, updatedActivities);

      if (changed) onApplyAIActivities(updatedActivities, result);
      setMessages((current) => [...current, { role: "assistant", text: result.message }]);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", text: "I couldn't understand that. Try asking me to add, move, remove, or optimize a Bali trip item." }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page ai-page">
      <header className="page-header"><p className="eyebrow">Trip planner only</p><h1>Travel AI</h1></header>
      <section className="card ai-intro">
        <span className="spark-icon"><Sparkles size={25} /></span>
        <h2>Bali concierge</h2>
        <p>I can only help plan, edit, optimize, and explain this Bali trip.</p>
      </section>
      <section className="chat-list" aria-live="polite">
        {messages.map((message, index) => <div key={message.role + index} className={"chat-bubble " + message.role}>{message.text}</div>)}
        {loading && <div className="chat-bubble assistant">Thinking through the itinerary...</div>}
      </section>
      <button className="undo-button" type="button" onClick={onUndoAI} disabled={!canUndo || loading}><Undo2 size={18} /> Undo last AI action</button>
      <form className="composer" onSubmit={handleSubmit}>
        <input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask me to edit your Bali trip" disabled={loading} />
        <button type="submit" aria-label="Send" disabled={loading}><Send size={20} /></button>
      </form>
    </main>
  );
}

function changedActivities(before, after) {
  if (before.length !== after.length) return true;
  return before.some((item, index) => JSON.stringify(item) !== JSON.stringify(after[index]));
}

function readStoredMessages() {
  const stored = readStoredJson(STORAGE_KEYS.aiChat, null);
  return Array.isArray(stored) && stored.length ? stored : initialMessages;
}
