import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, Mic, MicOff, Loader2, GraduationCap, BrainCircuit } from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import './LiveSession.css';
import { UserProfile, ChatBookContext } from '../types';
import { AssistantConfig } from '../lib/gemini';

interface LiveSessionProps {
  profile: UserProfile;
  exehEnabled: boolean;
  kopalaEnabled: boolean;
  pdfContent: string | null;
  bookContext?: ChatBookContext | null;
  onClose: () => void;
}

export default function LiveSession({ profile, exehEnabled, kopalaEnabled, pdfContent, bookContext, onClose }: LiveSessionProps) {
  const [mode, setMode] = useState<'selection' | 'live' | 'podcast'>('selection');
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);

  const startSession = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const ai = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY! });
      
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: AssistantConfig.getSystemInstruction(profile, exehEnabled, kopalaEnabled, pdfContent || undefined, bookContext ?? undefined),
        },
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            if (audioContextRef.current?.state === 'suspended') {
              audioContextRef.current.resume();
            }
            startMicrophone();
            
            // Proactive AI greeting moved to useEffect to avoid race condition with sessionRef.current
          },
          onmessage: async (message) => {
            if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
              const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
              const binary = atob(base64Audio);
              const pcmData = new Int16Array(binary.length / 2);
              for (let i = 0; i < pcmData.length; i++) {
                pcmData[i] = (binary.charCodeAt(i * 2) | (binary.charCodeAt(i * 2 + 1) << 8));
              }
              audioQueueRef.current.push(pcmData);
              if (!isPlayingRef.current) {
                playNextInQueue();
              }
            }
            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
            }
          },
          onclose: () => {
            cleanup();
            // Don't call onClose() automatically to prevent modal from vanishing
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

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      }
      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
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

  const playNextInQueue = async () => {
    if (audioQueueRef.current.length === 0 || !audioContextRef.current) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const pcmData = audioQueueRef.current.shift()!;
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 0x7FFF;
    }

    if (!audioContextRef.current) return;
    const audioContext = audioContextRef.current;
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const buffer = audioContext.createBuffer(1, floatData.length, 16000);
    buffer.getChannelData(0).set(floatData);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.onended = () => playNextInQueue();
    source.start();
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
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
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
      sessionRef.current.sendRealtimeInput({
        text: "I want to start a study podcast session. Please introduce yourself as my lecturer and ask if I'd like you to explain the uploaded study module/book."
      });
    }
  }, [isActive, mode]);

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
            <GraduationCap size={48} className="live-selection-icon" />
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
            <div className="live-session-avatar">
              <GraduationCap size={80} className="live-session-cap" />
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
