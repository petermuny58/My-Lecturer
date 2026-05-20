import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, Mic, MicOff, Loader2, BrainCircuit } from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import './LiveSession.css';
import { UserProfile, ChatBookContext } from '../types';
import { AssistantConfig, queueGenerativeRequest } from '../lib/gemini';

const PODCAST_GREETINGS = [
  "Please introduce yourself warmly as my lecturer, outline what we will cover today, and ask if I'd like you to start explaining the study material.",
  "Pretend we are hosting a popular radio educational talk show. Start the session with a high-energy welcome, explain your role as my lecturer, and ask me if I'm ready to dive into the study module.",
  "Start this session by posing an intriguing question or thought experiment related to my major, introduce yourself, and ask how you can help me unpack the uploaded book/module.",
  "Give a motivational, inspiring introduction. Remind me of the value of learning, introduce yourself as my lecturer, and ask if we should get started with the study materials.",
  "Welcome me to a cozy, laid-back study session. Introduce yourself, invite me to relax and learn, and ask if I want an overview of the uploaded PDF/book.",
  "Pretend this is a highly professional, academic symposium podcast. Open with a formal introduction of yourself, state our goal of mastering this course material, and ask what section we should analyze.",
  "Start the podcast by sharing a quick, interesting fact or tip about effective studying, greet me, and ask how you can help guide me through our study files today.",
  "Imagine we are doing a quick review session before a big exam. Start with a focused, encouraging check-in, introduce yourself, and ask which concepts from the study guide we should review first.",
  "Open with a friendly, conversational 'office hours' vibe. Say hello, introduce yourself, and ask if there's a specific part of the uploaded book or module I'd like you to explain.",
  "Start with a quick story-style hook: explain why the subject we are studying matters in the real world, introduce yourself as my lecturer, and ask if you should walk me through the study module.",
  "Give a short, energetic 'bootcamp' style introduction. Encourage me to stay focused and 'lock in', introduce yourself, and ask if you should start explaining the module.",
  "Pretend we are starting a late-night study podcast. Open with a calm, reassuring, low-key voice. Introduce yourself and ask if we should explore the uploaded study module.",
  "Open the session by asking me to reflect on my study goals today. Introduce yourself, set a positive tone, and ask if you should start dissecting the uploaded PDF or book.",
  "Start the podcast with a structured agenda. Introduce yourself, state that we will tackle the main ideas of the module together, and ask if you should give a summary of the first section.",
  "Create a sense of curiosity: start by describing a mystery or common misconception in our field of study, introduce yourself, and ask if you should clarify it using the uploaded material.",
  "Open like a modern educational YouTube video. Start with a catchy greeting, introduce yourself as my tutor, and ask if we should jump straight into the study guide.",
  "Start the session with a quick breathing or focusing exercise to help me prepare for studying. Introduce yourself and ask if you should begin explaining the uploaded course book.",
  "Pretend this is a collaborative masterclass. Open by emphasizing that we are a team, introduce yourself, and ask if you should break down the key takeaways from the study guide.",
  "Start with a brief, high-level overview of why this major is so exciting. Introduce yourself as my academic guide, and ask if we should dive into the details of the uploaded module.",
  "Open with a classic, warm, paternal/maternal professor greeting. Welcome me to today's tutorial, introduce yourself, and ask how we should approach the study module."
];

interface LiveSessionProps {
  profile: UserProfile;
  exehEnabled: boolean;
  kopalaEnabled: boolean;
  language: string;
  pdfContent: string | null;
  bookContext?: ChatBookContext | null;
  onClose: () => void;
}

export default function LiveSession({ profile, exehEnabled, kopalaEnabled, language, pdfContent, bookContext, onClose }: LiveSessionProps) {
  const [mode, setMode] = useState<'selection' | 'live' | 'podcast'>('selection');
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const playbackAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);

  const startSession = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const ai = new GoogleGenAI({
        apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY!
      });

      // Initialize playback context at 24kHz (Gemini native audio output rate)
      if (!playbackAudioContextRef.current) {
        playbackAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }

      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: AssistantConfig.getSystemInstruction(profile, exehEnabled, kopalaEnabled, language, pdfContent || undefined, bookContext ?? undefined),
        },
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            if (playbackAudioContextRef.current?.state === 'suspended') {
              playbackAudioContextRef.current.resume();
            }
            startMicrophone();
          },
          onmessage: async (message) => {
            if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
              const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
              const binary = atob(base64Audio);
              const pcmData = new Int16Array(binary.length / 2);
              for (let i = 0; i < pcmData.length; i++) {
                pcmData[i] = (binary.charCodeAt(i * 2) | (binary.charCodeAt(i * 2 + 1) << 8));
              }
              scheduleAudioPlayback(pcmData);
            }
            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
              nextPlayTimeRef.current = 0;
            }
          },
          onclose: () => {
            cleanup();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setError("Connection failed. Check your API key or model access.");
            setIsConnecting(false);
            setIsActive(false);
          }
        }
      });

      sessionRef.current = session;
    } catch (err) {
      console.error("Failed to connect:", err);
      setError("Failed to start live session.");
      setIsConnecting(false);
    }
  };

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Separate AudioContext for mic input at 16kHz (API input rate)
      if (!inputAudioContextRef.current) {
        inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
      }
      const audioContext = inputAudioContextRef.current;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isMuted || !sessionRef.current) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }

        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        sessionRef.current.sendRealtimeInput({
          audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
        });
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
    } catch (err) {
      console.error("Microphone error:", err);
      setError("Microphone access denied.");
    }
  };

  // Gapless scheduled playback at 24kHz (Gemini native audio output rate)
  const scheduleAudioPlayback = (pcmData: Int16Array) => {
    const audioContext = playbackAudioContextRef.current;
    if (!audioContext) return;

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 0x7FFF;
    }

    const buffer = audioContext.createBuffer(1, floatData.length, 24000);
    buffer.getChannelData(0).set(floatData);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);

    // Schedule gaplessly: each chunk starts exactly when the previous one ends
    const now = audioContext.currentTime;
    const startTime = Math.max(now, nextPlayTimeRef.current);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + buffer.duration;
    isPlayingRef.current = true;
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (playbackAudioContextRef.current && playbackAudioContextRef.current.state !== 'closed') {
      playbackAudioContextRef.current.close();
      playbackAudioContextRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    nextPlayTimeRef.current = 0;
    setIsActive(false);
  };

  useEffect(() => {
    if (mode !== 'selection') {
      startSession();
    }
    return () => cleanup();
  }, [mode]);

  // Handle proactive greeting for podcast mode after session is established
  useEffect(() => {
    if (isActive && sessionRef.current && mode === 'podcast') {
      const greetingIndex = parseInt(localStorage.getItem('podcast_greeting_index') || '0', 10);
      const nextIndex = (greetingIndex + 1) % PODCAST_GREETINGS.length;
      localStorage.setItem('podcast_greeting_index', nextIndex.toString());
      
      const greetingRequestText = PODCAST_GREETINGS[greetingIndex];
      const languageInstructionText = language !== 'English' 
        ? ` Please perform the entire greeting, introduction, and following explanation in the target language (${language}).` 
        : '';
      
      sessionRef.current.sendRealtimeInput({
        text: `I want to start a study podcast session. ${greetingRequestText}${languageInstructionText}`
      });
    }
  }, [isActive, mode, language]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="live-session"
    >
      <button type="button" onClick={onClose} className="live-session-close">
        <X size={32} />
      </button>

      {mode === 'selection' ? (
        <div className="live-selection-screen">
          <div className="live-selection-header">
            <img src="/logo.png" alt="Logo" className="live-selection-icon" style={{ borderRadius: '12px', width: '48px', height: '48px', objectFit: 'cover', margin: '0 auto 1rem' }} />
            <h1>Digital Lecture Hall</h1>
            <p>How would you like to study today?</p>
          </div>

          <div className="live-selection-grid">
            <button className="live-selection-card" onClick={() => setMode('live')}>
              <div className="live-card-icon"><Mic size={32} /></div>
              <h3>Live Chat</h3>
              <p>Speak naturally, and I'll answer your questions in real-time.</p>
            </button>

            <button className="live-selection-card live-selection-card--podcast" onClick={() => setMode('podcast')}>
              <div className="live-card-icon"><BrainCircuit size={32} /></div>
              <h3>Podcast Mode</h3>
              <p>Sit back as I guide you through your course material proactively.</p>
            </button>
          </div>
        </div>
      ) : (
        <div className="live-session-main">
          <div className="live-session-glow-wrap">
            <motion.div
              animate={{
                scale: isActive && !isMuted ? [1, 1.2, 1] : 1,
                opacity: isActive && !isMuted ? [0.5, 1, 0.5] : 0.5,
              }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="live-session-pulse"
            />
            <div className="live-session-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/logo.png" alt="Logo" className="live-session-cap" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>

          <div className="live-session-text">
            <h2>{isConnecting ? 'Connecting...' : isActive ? (mode === 'podcast' ? 'Podcast Session' : 'Live Session') : 'Session Ended'}</h2>
            <p>
              {isConnecting
                ? 'Waking up your lecturer...'
                : isMuted
                  ? 'Microphone Muted'
                  : mode === 'podcast'
                    ? 'AI is leading the session...'
                    : "Speak naturally, I'm listening."}
            </p>
            {error && <p className="live-session-error">{error}</p>}
          </div>

          {isActive && (
            <div className="live-session-controls">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`live-session-round ${isMuted ? 'live-session-round--danger' : 'live-session-round--light'}`}
              >
                {isMuted ? <MicOff size={32} /> : <Mic size={32} />}
              </button>
              <button type="button" onClick={onClose} className="live-session-round live-session-round--outline">
                <X size={32} />
              </button>
            </div>
          )}

          {isConnecting && <Loader2 className="live-session-loader" size={40} />}
        </div>
      )}

      {mode !== 'selection' && (
        <div className="live-session-footer">
          <div className="live-session-badge">
            <span className="live-session-dot" />
            {mode === 'podcast' ? 'Podcast in Progress' : 'Real-time Academic Support'}
          </div>
        </div>
      )}
    </motion.div>
  );
}
