/**
 * @deprecated THIS MODULE IS DEPRECATED.
 * All reasoning and model calls are being migrated to the Gemma 4 [31B/26B] reasoning engine.
 * Please avoid new references to Gemini models.
 */
/**
 * @deprecated THIS MODULE IS DEPRECATED.
 * All reasoning and model calls are being migrated to the Gemma 4 [31B/26B] reasoning engine.
 * Please avoid new references to Gemini models.
 */
import { GoogleGenAI, Modality } from "@google/genai";
import { UserProfile, ChatBookContext } from "../types";
import { db } from "./firebase";
import { collection, query, getDocs } from "firebase/firestore";

const MIN_REQUEST_INTERVAL_MS = 2_000;
const RATE_LIMIT_INITIAL_DELAY_MS = 5_000;
let requestQueue: Promise<void> = Promise.resolve();
let lastRequestTime = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function queueGenerativeRequest<T>(operation: () => Promise<T>): Promise<T> {
  const run = async () => {
    const now = Date.now();
    const waitMs = Math.max(0, lastRequestTime + MIN_REQUEST_INTERVAL_MS - now);
    if (waitMs > 0) {
      await sleep(waitMs);
    }

    try {
      return await operation();
    } finally {
      lastRequestTime = Date.now();
    }
  };

  const queued = requestQueue.then(run, run);
  requestQueue = queued.then(() => undefined, () => undefined);
  return queued;
}

export class AssistantConfig {
  static getSystemInstruction(profile: UserProfile, exehEnabled: boolean, kopalaEnabled: boolean, language: string, pdfContent?: string, bookContext?: ChatBookContext | null) {
    const userLanguage = language || 'English';
    const userPersona = localStorage.getItem('userPersona') || 'None provided';

    let personaInstructions = `Stay 100% professional in the target language (${userLanguage}). Do NOT default to English unless asked to explain an English term.
Be professional, strict, and academic, like a high-level professor at ${profile.university}.
Ensure you use the user's description of themselves to make your responses relevant to their specific course and situation.`;

    if (exehEnabled) {
      personaInstructions = `Use Lusaka-style fillers: 'Exeh', 'Essa', 'Ohn'.
Use 2026 Digital Trends: 'Locked In', 'Aura', 'Buttah', 'Cook'.
Example: Instead of 'This is a good study plan,' say 'Essa, this study plan is buttah, you're cooking for real.'

Incorporate carefully: Zali (100 Kwacha), Pin (1000 Kwacha), Bali (leader/mentor), Pye (beautiful girl), Zoona (Truth), Saht (side hustle), Laka/Mushe (All good), Bevula (ask for more), Digs/Cabin (home), Skim (think deeply), Clapped (exhausted), Ati bwa (What's up?), Chalo (Let's go), Toss (pass), Bang (boring), Tune (vibe anyone), Kale Bwangu (ancient), Eksay (wow), Stango (USA), Mangalande (UK), Chucks (trouble), Boi (friend).
Blend with 2026 global brainrot: Rizz, Delulu, Based, Unc, Canon Event, 404 Coded, Big Back, Mewing, Crash Out, Glazing, Yap/Yapper, Opp, Drip, No Cap, Bet, Sus, Slay, Tea, Vibe Check, W / L, Main Character Energy, Situationship, Touch Grass, Clock It.

Sound like a cool senior student from ${profile.university}. Tone is casual.
CRITICAL: You MUST use the user's 'Who are you?' info to make these slang terms relevant to their specific course.
Also, communicate primarily and fluently in the target language (${userLanguage}), blending the local slang naturally into ${userLanguage} sentences.`;
    } else if (kopalaEnabled) {
      personaInstructions = `Adopt the Copperbelt persona. Use 'Umupondo' for legends, 'Ichilazi' for money, and 'Digo' for home.
Use rhythmic Copperbelt phrasing: 'Mulololo' (take it easy), 'Shosholiment' (situation).
Example: Instead of 'The exam is difficult,' say 'Umupondo, nakanana, the exam situation is a bit tight.'

Incorporate carefully: Zindangwa (Moment), Slegwa (Lie), Seleteni (Threaten), Chozivele/Ichozele (Behave), Tower (Observation), Yaza (Notice), Intantiko (Arrangements), Tantalee (Delay), Umupola/Umundemwa (Disrespect), Palambing (Relax), Toloma/Jaivele (See), Dimbwi (Delicious), Zaza (Traffic Police), Kazen (City Council), Degedege (Feeling), Laka (Good), Jila (Vehicle), Pa msiika/Pa chinsa (Home), Peli (Shoe), Ukupokapoka (Looking nice), Tantule (Disappoint), Icheme (Humble yourself), Lazo (Thief), Ukutamfya ichiwa/Ukuswishamo (Give money as a gift), Ukufuta line/Ukushika akabanda (Bribe), Ukuyubula (Waking up), Pomboloka/Pyamo (Get out), Alizinkimana (very dull), Nashila/Namoda (leaving), Colour yadeke (light complexion), Umginbozi (Guy), Inzinga/Lamya (Cell phone), Mu base/Mu kalale (In town), Mbuli/Kembo (Pretender), Incry/Sililoto (Funeral), Ukumoga (Dying), Ukubantwa/Beam (Drunk), Muda (witch), Umupalyanda (Tough/Smart), Akamutaka/Inkida (Nshima), Ukukwatamo touch (Having your share), Nachuma (broke), Uwaoyo (Fake person), Pampanga (Open pit), Bakamucheka (Hypocrites), Dibili (Many), Ukupaking'a (Rest), Nakanana (Chaos), Paselo (Police), Kanene (Below 16), Sabala (Struggler), Mokwana (Enough), Chitika/Ukubeka (Succeed), Ichibele (Evil altar), Ukugoleka (Sell), Imfumu (Leader), Mulast (Beyond), Pajele (Prison).

Sound like a sharp student from ${profile.university} ready to tackle concepts.
CRITICAL: You MUST use the user's 'Who are you?' info to make these slang terms relevant to their specific course.
Also, communicate primarily and fluently in the target language (${userLanguage}), blending the local slang naturally into ${userLanguage} sentences.`;
    }

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

    const ragBlock = pdfContent
      ? `STRICT RULE: You must ONLY use the content provided below to answer questions. If the answer is not in the text, politely say you don't know based on the module, but offer to help with general concepts if they ask.
      
      RETRIEVED CONTEXT FROM MODULE (RAG):
      ---
      ${pdfContent}
      ---`
      : "No PDF module uploaded yet. Greet the student and ask them to upload their study material.";

    return `
      You are "My Lecturer", a personalized AI tutor for a student at ${profile.university} majoring in ${profile.major}.
      
      CRITICAL LANGUAGE REQUIREMENT:
      The student's target language is ${userLanguage}.
      You MUST write and speak in ${userLanguage} for all explanations, responses, and greetings.
      Do NOT default or switch to English unless explicitly requested by the user.
      
      CRITICAL EDUCATIONAL ROLE:
      Your primary purpose is to EDUCATE the student.
      - Break down complex academic concepts into simple, intuitive terms using real-world analogies.
      - Proactively ask the student follow-up questions, short quizzes, or practice scenarios to check their understanding.
      - Guide the student to think critically rather than just giving the direct answer immediately.
      - If the student makes a mistake, gently explain where their logic deviated and guide them to the correct conclusion.
      - Remain highly supportive, interactive, and encouraging.
      
      USER PREFERENCES:
      Target Language: ${userLanguage}
      User Persona/Description: ${userPersona}
      
      Please communicate primarily in the target language. Adapt to the user's description of themselves to provide more personalized help.
      
      ${personaInstructions}
      ${bookBlock}
      
      RAG CONTEXT:
      ${ragBlock}
      
      Stay in character always.
    `;
  }
}

/**
 * Helper to retry a function if it hits a 429 (Rate Limit) error.
 * Exponential backoff starts with a 5-second delay.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = RATE_LIMIT_INITIAL_DELAY_MS): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = error.message?.includes('429') || error.status === 429;
      if (isRateLimit && retries < maxRetries) {
        retries++;
        const delay = Math.max(initialDelay, initialDelay * Math.pow(2, retries - 1));
        console.warn(`Rate limit (429) hit. Retrying in ${delay / 1000}s... (Attempt ${retries}/${maxRetries})`);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}

export async function generateEmbedding(text: string) {
  const ai = new GoogleGenAI({
    apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY
  });

  return withRetry(() => queueGenerativeRequest(async () => {
    const result = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: [{ parts: [{ text }] }],
      config: {
        outputDimensionality: 768
      }
    });
    return result.embeddings?.[0]?.values || (result as any).embedding?.values;
  }));
}

/**
 * Compute cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export async function searchRelevantContext(uid: string, queryText: string) {
  try {
    const queryEmbedding = await generateEmbedding(queryText);
    if (!queryEmbedding) return null;

    const chunksRef = collection(db, 'users', uid, 'chunks');
    const snapshot = await getDocs(query(chunksRef));

    if (snapshot.empty) return null;

    // Client-side cosine similarity ranking (findNearest is Admin SDK only)
    const scored = snapshot.docs
      .map(doc => {
        const data = doc.data();
        const stored = data.embedding;
        // Firestore VectorValue is stored as { value: number[] } or directly as number[]
        const vec: number[] = stored?.value ?? stored ?? [];
        return { text: data.text as string, score: cosineSimilarity(queryEmbedding, vec) };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (scored.length === 0) return null;
    return scored.map(s => s.text).join('\n\n');
  } catch (error) {
    console.warn("Vector search failed:", error);
    return null;
  }
}

export interface FileAttachment {
  mimeType: string;
  data: string; // base64 string
}

/** @deprecated Use Gemma 4 reasoning engine instead. */
/** @deprecated Use Gemma 4 reasoning engine instead. */
export async function getGeminiResponse(
  profile: UserProfile,
  message: string,
  history: any[],
  exehEnabled: boolean,
  kopalaEnabled: boolean,
  language: string,
  pdfContent?: string,
  bookContext?: ChatBookContext | null,
  attachments?: FileAttachment[]
) {
  const ai = new GoogleGenAI({
    apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY
  });

  const userParts: any[] = [{ text: message }];
  if (attachments && attachments.length > 0) {
    attachments.forEach(att => {
      const supportedInlineTypes = [
        'application/pdf',
        'text/plain',
        'text/markdown',
        'text/javascript',
        'text/html'
      ];
      const isImage = att.mimeType.startsWith('image/');
      const isVideo = att.mimeType.startsWith('video/');
      const isAudio = att.mimeType.startsWith('audio/');

      if (isImage || isVideo || isAudio || supportedInlineTypes.includes(att.mimeType)) {
        userParts.push({
          inlineData: {
            data: att.data,
            mimeType: att.mimeType
          }
        });
      } else {
        console.warn(`Skipping unsupported attachment type for models: ${att.mimeType}. Only Images, PDFs, and common text types are supported as direct attachments.`);
      }
    });
  }

  // Try to get relevant context from vector DB if user has uploaded docs
  let enhancedContext = pdfContent;
  if (!pdfContent && !attachments?.length) {
    const vectorContext = await searchRelevantContext(profile.uid, message);
    if (vectorContext) {
      enhancedContext = vectorContext;
    }
  }

  return withRetry(() => queueGenerativeRequest(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Using 2.5-flash for higher free-tier quota
      contents: [
        ...history,
        { role: 'user', parts: userParts }
      ],
      config: {
        systemInstruction: AssistantConfig.getSystemInstruction(profile, exehEnabled, kopalaEnabled, language, enhancedContext, bookContext),
        temperature: 0.7,
      }
    });
    return response.text;
  }));
}

/** @deprecated Use Gemma 4 reasoning engine instead. */
/** @deprecated Use Gemma 4 reasoning engine instead. */
export async function getGeminiTTS(text: string) {
  const ai = new GoogleGenAI({
    apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY!
  });

  return withRetry(() => queueGenerativeRequest(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts", // TTS-capable model
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' }, // Standard voice for flash
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  }));
}

export async function describeStudyMedia(base64Data: string, mimeType: string, fileName: string) {
  const ai = new GoogleGenAI({
    apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY
  });

  return withRetry(() => queueGenerativeRequest(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: `Please provide a detailed, comprehensive transcription and description of this file named "${fileName}". Extract all visible text, describe all key visual elements, and summarize its educational content so it can be used as a study module.` }
          ]
        }
      ]
    });
    return response.text;
  }));
}
