import { GoogleGenAI, Type } from "@google/genai";
import { GameMode, PlayStyle, StrategyResponse, SensitivityResponse } from "../types";

const apiKey = process.env.API_KEY;

let genAI: GoogleGenAI | null = null;

// Initialize safely to avoid instant crashes if env is missing,
// though the prompt guarantees it's there.
try {
  if (apiKey) {
    genAI = new GoogleGenAI({ apiKey });
  }
} catch (e) {
  console.error("Failed to initialize Gemini client", e);
}

export const generateTacticalBrief = async (mode: GameMode, style: PlayStyle): Promise<StrategyResponse> => {
  if (!genAI) {
    throw new Error("AI client not initialized. Missing API Key.");
  }

  const prompt = `Generate a detailed Free Fire (mobile game) tactical brief for a player.
  Game Mode: ${mode}
  Play Style: ${style}

  Provide:
  1. A cool, tactical operation name (Title).
  2. The best 4-character skill combination for this specific role and mode.
  3. Recommended primary and secondary weapon loadout.
  4. A concise paragraph of tactical advice on how to execute this playstyle effectively in the chosen mode.
  `;

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A tactical operation name, e.g., 'Operation Silent Fury'" },
            characterCombination: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of 4 character names suitable for the strategy."
            },
            weaponLoadout: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Recommended primary and secondary weapons."
            },
            tacticalAdvice: { type: Type.STRING, description: "Concise strategic advice paragraph." }
          },
          required: ["title", "characterCombination", "weaponLoadout", "tacticalAdvice"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as StrategyResponse;
    }
    throw new Error("No data received from AI Command.");

  } catch (error) {
    console.error("Strategy generation failed:", error);
    throw new Error("Tactical Uplink Failed. Try again.");
  }
};

export const generateHeadshotConfig = async (deviceModel: string): Promise<SensitivityResponse> => {
  if (!genAI) {
    throw new Error("AI client not initialized.");
  }

  // Default to a generic "high-end" if empty, though UI should prevent this.
  const model = deviceModel.trim() || "Generic High-End Phone";

  const prompt = `Generate "Auto Headshot" style sensitivity settings for Free Fire on a '${model}'.
  These settings should be high-performance, optimized for drag headshots (optimistic, slightly exaggerated for "hacker" feel).
  Provide values between 0-200 for sensitivities (matching Free Fire Max scale).
  Provide an optimal fire button size (usually between 40-60).
  Provide a recommended DPI value (e.g., 400-1440 depending on device class).
  Provide a short, "pro" tip note.
  `;

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            deviceName: { type: Type.STRING },
            settings: {
              type: Type.OBJECT,
              properties: {
                general: { type: Type.NUMBER, description: "General sensitivity (150-200 range)" },
                redDot: { type: Type.NUMBER, description: "Red Dot sensitivity (140-200 range)" },
                scope2x: { type: Type.NUMBER, description: "2x Scope sensitivity (130-200 range)" },
                scope4x: { type: Type.NUMBER, description: "4x Scope sensitivity (120-180 range)" },
                sniperScope: { type: Type.NUMBER, description: "Sniper Scope sensitivity (80-150 range)" },
                freeLook: { type: Type.NUMBER, description: "Free Look sensitivity (100-180 range)" }
              },
              required: ["general", "redDot", "scope2x", "scope4x", "sniperScope", "freeLook"]
            },
            fireButtonSize: { type: Type.NUMBER, description: "Recommended fire button percentage size" },
            dpi: { type: Type.NUMBER, description: "Recommended device DPI setting" },
            notes: { type: Type.STRING, description: "Short pro-tip for headshots on this device." }
          },
          required: ["deviceName", "settings", "fireButtonSize", "dpi", "notes"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as SensitivityResponse;
    }
    throw new Error("Config generation failed.");

  } catch (error) {
    console.error("Headshot config generation failed:", error);
    throw new Error("Failed to acquire device profile.");
  }
};