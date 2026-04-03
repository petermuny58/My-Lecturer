import { GoogleGenAI, Modality } from "@google/genai";
import { UserProfile, ChatBookContext } from "../types";
import { db } from "./firebase";
import { collection, query, getDocs, vector, VectorValue } from "firebase/firestore";

export class AssistantConfig {
  static getSystemInstruction(profile: UserProfile, exehEnabled: boolean, kopalaEnabled: boolean, pdfContent?: string, bookContext?: ChatBookContext | null) {
    const userLanguage = localStorage.getItem('userLanguage') || 'English';
    const userPersona = localStorage.getItem('userPersona') || 'None provided';

    let personaInstructions = `Stay 100% professional English. No 'Buttah', no 'Laka'. 
Be professional, strict, and academic, like a high-level professor at ${profile.university}.
Ensure you use the user's description of themselves to make your responses relevant to their specific course and situation.`;

    if (exehEnabled) {
      personaInstructions = `Use Lusaka-style fillers: 'Exeh', 'Essa', 'Ohn'.
Use 2026 Digital Trends: 'Locked In', 'Aura', 'Buttah', 'Cook'.
Example: Instead of 'This is a good study plan,' say 'Essa, this study plan is buttah, you're cooking for real.'

Incorporate carefully: Zali (100 Kwacha), Pin (1000 Kwacha), Bali (leader/mentor), Pye (beautiful girl), Zoona (Truth), Saht (side hustle), Laka/Mushe (All good), Bevula (ask for more), Digs/Cabin (home), Skim (think deeply), Clapped (exhausted), Ati bwa (What's up?), Chalo (Let's go), Toss (pass), Bang (boring), Tune (vibe anyone), Kale Bwangu (ancient), Eksay (wow), Stango (USA), Mangalande (UK), Chucks (trouble), Boi (friend).
Blend with 2026 global brainrot: Rizz, Delulu, Based, Unc, Canon Event, 404 Coded, Big Back, Mewing, Crash Out, Glazing, Yap/Yapper, Opp, Drip, No Cap, Bet, Sus, Slay, Tea, Vibe Check, W / L, Main Character Energy, Situationship, Touch Grass, Clock It.

Sound like a cool senior student from ${profile.university}. Tone is casual.
CRITICAL: You MUST use the user's 'Who are you?' info to make these slang terms relevant to their specific course.`;
    } else if (kopalaEnabled) {
      personaInstructions = `Adopt the Copperbelt persona. Use 'Umupondo' for legends, 'Ichilazi' for money, and 'Digo' for home.
Use rhythmic Copperbelt phrasing: 'Mulololo' (take it easy), 'Shosholiment' (situation).
Example: Instead of 'The exam is difficult,' say 'Umupondo, nakanana, the exam situation is a bit tight.'

Incorporate carefully: Zindangwa (Moment), Slegwa (Lie), Seleteni (Threaten), Chozivele/Ichozele (Behave), Tower (Observation), Yaza (Notice), Intantiko (Arrangements), Tantalee (Delay), Umupola/Umundemwa (Disrespect), Palambing (Relax), Toloma/Jaivele (See), Dimbwi (Delicious), Zaza (Traffic Police), Kazen (City Council), Degedege (Feeling), Laka (Good), Jila (Vehicle), Pa msiika/Pa chinsa (Home), Peli (Shoe), Ukupokapoka (Looking nice), Tantule (Disappoint), Icheme (Humble yourself), Lazo (Thief), Ukutamfya ichiwa/Ukuswishamo (Give money as a gift), Ukufuta line/Ukushika akabanda (Bribe), Ukuyubula (Waking up), Pomboloka/Pyamo (Get out), Alizinkimana (very dull), Nashila/Namoda (leaving), Colour yadeke (light complexion), Umuginbozi (Guy), Inzinga/Lamya (Cell phone), Mu base/Mu kalale (In town), Mbuli/Kembo (Pretender), Incry/Sililoto (Funeral), Ukumoga (Dying), Ukubantwa/Beam (Drunk), Muda (witch), Umupalyanda (Tough/Smart), Akamutaka/Inkida (Nshima), Ukukwatamo touch (Having your share), Nachuma (broke), Uwaoyo (Fake person), Pampanga (Open pit), Bakamucheka (Hypocrites), Dibili (Many), Ukupaking'a (Rest), Nakanana (Chaos), Paselo (Police), Kanene (Below 16), Sabala (Struggler), Mokwana (Enough), Chitika/Ukubeka (Succeed), Ichibele (Evil altar), Ukugoleka (Sell), Imfumu (Leader), Mulast (Beyond), Pajele (Prison).

Sound like a sharp student from ${profile.university} ready to tackle concepts.
CRITICAL: You MUST use the user's 'Who are you?' info to make these slang terms relevant to their specific course.`;
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
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 5000): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = error.message?.includes('429') || error.status === 429;
      if (isRateLimit && retries < maxRetries) {
        retries++;
        const delay = initialDelay * Math.pow(2, retries - 1);
        console.warn(`Rate limit (429) hit. Retrying in ${delay / 1000}s... (Attempt ${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

export async function generateEmbedding(text: string) {
  const ai = new GoogleGenAI({ 
    apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY,
    apiVersion: "v1beta"
  });
  
  return withRetry(async () => {
    const result = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: [{ parts: [{ text }] }]
    });
    return result.embeddings[0].values;
  });
}

export async function searchRelevantContext(uid: string, queryText: string) {
  try {
    const embedding = await generateEmbedding(queryText);
    const chunksRef = collection(db, 'users', uid, 'chunks');
    
    // Using vector indexing requires specific Firestore SDK support
    // and findNearest in older versions was part of the 'vector' namespace
    const q = query(
      chunksRef,
      // @ts-ignore - findNearest exists in newer Firestore but types might be missing
      vector.findNearest('embedding', new VectorValue(embedding), {
        limit: 5,
        distanceMeasure: 'COSINE'
      })
    );

    const snapshot = await getDocs(q);
    const context = snapshot.docs.map(doc => doc.data().text).join('\n\n');
    return context;
  } catch (error) {
    console.warn("Vector search failed (likely missing index or SDK mismatch):", error);
    return null;
  }
}

export interface FileAttachment {
  mimeType: string;
  data: string; // base64 string
}

export async function getGeminiResponse(
  profile: UserProfile,
  message: string,
  history: any[],
  exehEnabled: boolean,
  kopalaEnabled: boolean,
  pdfContent?: string,
  bookContext?: ChatBookContext | null,
  attachments?: FileAttachment[]
) {
  const ai = new GoogleGenAI({ 
    apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY,
    apiVersion: "v1beta" 
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
  
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Updated to stable flash model
      contents: [
        ...history,
        { role: 'user', parts: userParts }
      ],
      config: {
        systemInstruction: AssistantConfig.getSystemInstruction(profile, exehEnabled, kopalaEnabled, enhancedContext, bookContext),
        temperature: 0.7,
      }
    });
    return response.text;
  });
}

export async function getGeminiTTS(text: string) {
  const ai = new GoogleGenAI({ 
    apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY!,
    apiVersion: "v1beta"
  });
  
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash", // Replaced potentially non-existent preview-tts with stable flash
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
  });
}
