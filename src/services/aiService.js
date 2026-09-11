import { tripCorrections } from "../data/tripData.js";

export const GEMINI_MODEL = "gemini-2.5-flash";

const unsupportedMessage = "I'm your Bali Trip Planner AI. I can only help manage this Bali trip.";
const invalidJsonMessage = "I couldn't understand that request.";
const missingKeyMessage = "Gemini API key is missing. Add VITE_GEMINI_API_KEY to your local .env file to enable Travel AI.";
const geminiErrorMessage = "Gemini could not process that request right now. Please try again in a moment.";

const supportedTypes = new Set([
  "add_place",
  "remove_place",
  "move_place",
  "change_time",
  "optimize_day",
  "suggestion",
  "unsupported",
  "error"
]);

const tripSignals = [
  "add",
  "remove",
  "delete",
  "move",
  "time",
  "optimize",
  "route",
  "restaurant",
  "cafe",
  "coffee",
  "beach",
  "viewpoint",
  "nightlife",
  "activity",
  "shopping",
  "spa",
  "rain",
  "budget",
  "transport",
  "grab",
  "packing",
  "reservation",
  "itinerary",
  "bali",
  "day",
  "sunset",
  "sunrise",
  "temple",
  "club",
  "dinner",
  "lunch",
  "trip",
  "travel"
];

const unrelatedSignals = [
  "code",
  "coding",
  "program",
  "javascript",
  "react",
  "python",
  "math",
  "homework",
  "essay",
  "joke",
  "recipe",
  "politics",
  "medical",
  "doctor",
  "general knowledge",
  "write me"
];

export async function travelAI(prompt, tripContext) {
  const cleanPrompt = String(prompt || "").trim();

  if (!cleanPrompt || !isTripPrompt(cleanPrompt)) {
    return normalizeAIResult({ type: "unsupported", message: unsupportedMessage, actions: [] });
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return normalizeAIResult({ type: "error", message: missingKeyMessage, actions: [] });
  }

  try {
    const response = await fetch(geminiEndpoint(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildGeminiPrompt(cleanPrompt, tripContext) }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      return normalizeAIResult({ type: "error", message: geminiErrorMessage, actions: [] });
    }

    const data = await response.json();
    const rawText = extractGeminiText(data);
    const parsed = parseGeminiJson(rawText);
    if (!parsed) {
      return normalizeAIResult({ type: "error", message: invalidJsonMessage, actions: [] });
    }

    return normalizeAIResult(parsed);
  } catch {
    return normalizeAIResult({ type: "error", message: geminiErrorMessage, actions: [] });
  }
}

function getGeminiApiKey() {
  return import.meta.env?.VITE_GEMINI_API_KEY?.trim() || "";
}

function geminiEndpoint(apiKey) {
  const model = encodeURIComponent(GEMINI_MODEL);
  const key = encodeURIComponent(apiKey);
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
}

function buildGeminiPrompt(prompt, tripContext) {
  return JSON.stringify({
    systemPrompt: [
      "You are an AI Bali Travel Concierge.",
      "You ONLY help manage the user's Bali itinerary.",
      "You NEVER answer unrelated questions.",
      "You ALWAYS return valid JSON.",
      "You understand existing itinerary, route order, travel time, budget, opening hours, sunset, sunrise, weather, transportation, group size, and Google Maps locations.",
      "When the user asks to add or move places, optimize the itinerary to minimize unnecessary travel.",
      "Never return Markdown.",
      "Never explain yourself.",
      "Return JSON only.",
      `If the request is unrelated to the Bali itinerary, return exactly: {"type":"unsupported","message":"${unsupportedMessage}","actions":[]}`,
      "Use the current itinerary context before recommending, adding, moving, removing, or changing anything.",
      "Protect original itinerary items. Removal, moving, and time changes may be requested, but the frontend will only apply them to custom or AI-added places.",
      "AI-created places must be represented in action payloads with enough data for the frontend to create a trip activity.",
      ...tripCorrections.map((correction) => `Known correction: ${correction}`)
    ],
    responseContract: {
      type: "add_place | remove_place | move_place | change_time | optimize_day | suggestion | unsupported | error",
      message: "Short human-readable trip-planner message.",
      actions: [
        {
          action: "add_place | remove_place | move_place | update_place",
          payload: {}
        }
      ]
    },
    actionPayloads: {
      add_place: {
        day: "number",
        insertAfter: "optional existing place title",
        place: {
          title: "string",
          area: "string",
          time: "optional string",
          travelFrom: "optional string",
          travelTime: "optional string",
          type: "food | tour | temple | transport | beach | shopping | other",
          estimatedCostTHB: "estimated per-person THB number",
          estimatedDuration: "optional duration/travel text",
          mapsUrl: "Google Maps URL",
          photo: "photo URL if known, otherwise empty string",
          notes: "why this fits the itinerary",
          lat: "number or null",
          lng: "number or null"
        }
      },
      remove_place: { title: "place title or close match" },
      move_place: { title: "place title or close match", day: "target day number" },
      update_place: { title: "place title or close match", time: "new time if changing time", notes: "optional", travelTime: "optional" }
    },
    tripContext,
    userPrompt: prompt
  });
}

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((part) => part?.text || "").join("").trim();
}

function parseGeminiJson(text) {
  if (!text || typeof text !== "string") return null;
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function normalizeAIResult(result) {
  const value = typeof result === "object" && result ? result : {};
  const type = supportedTypes.has(value.type) ? value.type : "error";
  const actions = Array.isArray(value.actions)
    ? value.actions.filter((item) => item && typeof item === "object")
    : [];

  return {
    type,
    message: normalizeMessage(type, value.message),
    actions
  };
}

function normalizeMessage(type, message) {
  if (type === "unsupported") return unsupportedMessage;
  if (typeof message === "string" && message.trim()) return message.trim();
  if (type === "error") return invalidJsonMessage;
  return "I can help with that Bali trip update.";
}

function isTripPrompt(prompt) {
  const lower = prompt.toLowerCase();
  if (unrelatedSignals.some((signal) => lower.includes(signal))) return false;
  return tripSignals.some((signal) => lower.includes(signal));
}
