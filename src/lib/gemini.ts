import { GoogleGenAI, Modality } from "@google/genai";
import { UserProfile, ChatBookContext } from "../types";

export class AssistantConfig {
  static getSystemInstruction(profile: UserProfile, pdfContent?: string, bookContext?: ChatBookContext | null) {
    const slangInstructions = profile.vibe === 'Local/Slang' 
      ? `Use local Zambian slang naturally (e.g., "Exeh", "Butah", "Ba guy", "Mwana", "Kuti"). Sound like a cool senior student from ${profile.university}.`
      : `Be professional, strict, and academic, like a high-level professor at ${profile.university}.`;

    const bookBlock = bookContext
      ? `
      LIBRARY BOOK (student added from Library):
      Title: ${bookContext.title}
      Description:
      ---
      ${bookContext.description}
      ---
      Use this when the student asks about this book. If a question is unrelated, you may still use the PDF rules below.
      `
      : '';

    return `
      You are "My Lecturer", a personalized AI tutor for a student at ${profile.university} majoring in ${profile.major}.
      
      ${slangInstructions}
      ${bookBlock}
      RAG-LITE MODE:
      ${pdfContent ? `The following is the content of the student's study module:
      ---
      ${pdfContent}
      ---
      STRICT RULE: You must ONLY use the content provided above to answer questions. If the answer is not in the text, politely say you don't know based on the module, but offer to help with general concepts if they ask.` : "No PDF module uploaded yet. Greet the student and ask them to upload their study material."}
      
      Always encourage the student and keep the "Zed Spice" alive.
    `;
  }
}

export async function getGeminiResponse(
  profile: UserProfile,
  message: string,
  history: any[],
  pdfContent?: string,
  bookContext?: ChatBookContext | null
) {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      ...history,
      { role: 'user', parts: [{ text: message }] }
    ],
    config: {
      systemInstruction: AssistantConfig.getSystemInstruction(profile, pdfContent, bookContext),
      temperature: 0.7,
    }
  });

  const response = await model;
  return response.text;
}

export async function getGeminiTTS(text: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
}
