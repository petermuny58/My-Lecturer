import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Mic, MoreVertical, Paperclip, GraduationCap, Trash2 } from 'lucide-react';
import { UserProfile, Message, ChatBookContext } from '../types';
import { db } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { getGeminiResponse } from '../lib/gemini';
import { translateToZedStyle } from '../lib/zedStyle';
import PDFUpload from './PDFUpload';
import LiveSession from './LiveSession';
import './Chat.css';

interface ChatProps {
  profile: UserProfile;
  zedVibeEnabled: boolean;
  chatBookContext: ChatBookContext | null;
  onClearBookContext: () => void;
}

export default function Chat({ profile, zedVibeEnabled, chatBookContext, onClearBookContext }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [pdfContent, setPdfContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLiveSession, setShowLiveSession] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);

  /* ── Visual Viewport: float input above keyboard on mobile ── */
  const updateInputPosition = useCallback(() => {
    if (!inputBarRef.current) return;
    const vv = window.visualViewport;
    if (!vv) return;
    // Gap from bottom of visual viewport to bottom of layout viewport
    const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop;
    // Nav pill is fixed at ~108px from bottom; input sits 20px above it
    // When keyboard opens, shift input up by keyboard height
    const baseBottom = 108;
    const newBottom = keyboardHeight > 50 ? keyboardHeight + 16 : baseBottom;
    inputBarRef.current.style.bottom = `${newBottom}px`;
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    vv.addEventListener('resize', updateInputPosition);
    vv.addEventListener('scroll', updateInputPosition);
    return () => {
      vv.removeEventListener('resize', updateInputPosition);
      vv.removeEventListener('scroll', updateInputPosition);
    };
  }, [updateInputPosition]);

  const displayAiText = (raw: string) =>
    zedVibeEnabled ? translateToZedStyle(raw) : raw;

  const clearChat = async () => {
    try {
      const q = query(collection(db, 'users', profile.uid, 'sessions', 'default', 'messages'));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();

      setPdfContent(null);
      setResetKey((prev) => prev + 1);
      setShowMenu(false);
      setConfirmClear(false);
      onClearBookContext();
    } catch (error) {
      console.error('Failed to clear chat:', error);
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, 'users', profile.uid, 'sessions', 'default', 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Message));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [profile.uid]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMsg = inputText;
    setInputText('');
    setIsLoading(true);

    try {
      await addDoc(collection(db, 'users', profile.uid, 'sessions', 'default', 'messages'), {
        text: userMsg,
        sender: 'user',
        timestamp: serverTimestamp(),
      });

      const history = messages.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

      const aiResponse = await getGeminiResponse(
        profile,
        userMsg,
        history,
        pdfContent || undefined,
        chatBookContext
      );

      await addDoc(collection(db, 'users', profile.uid, 'sessions', 'default', 'messages'), {
        text: aiResponse,
        sender: 'ai',
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-root">
      <div className="chat-header">
        <div className="chat-header-main">
          <div className="chat-header-icon">
            <GraduationCap size={24} />
          </div>
          <div>
            <h2>My Lecturer ({profile.vibe})</h2>
            <p>Online • {profile.university}</p>
          </div>
        </div>
        <div className="chat-header-actions">
          <button type="button" className="chat-header-btn" onClick={() => setShowLiveSession(true)}>
            <Mic size={20} />
            <span style={{ fontSize: '11px', fontWeight: 800 }}>LIVE</span>
          </button>
          <button
            type="button"
            className="chat-header-btn"
            onClick={() => {
              setShowMenu(!showMenu);
              setConfirmClear(false);
            }}
          >
            <MoreVertical size={20} />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="chat-menu"
              >
                {!confirmClear ? (
                  <button type="button" onClick={() => setConfirmClear(true)}>
                    <Trash2 size={16} />
                    Clear Chat History
                  </button>
                ) : (
                  <div className="chat-menu-confirm">
                    <p>Clear everything (messages, books, AI memory)?</p>
                    <div className="chat-menu-confirm-row">
                      <button type="button" className="chat-menu-confirm-yes" onClick={clearChat}>
                        Yes, Clear
                      </button>
                      <button
                        type="button"
                        className="chat-menu-confirm-no"
                        onClick={() => {
                          setConfirmClear(false);
                          setShowMenu(false);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {chatBookContext && (
        <div className="chat-book-banner">
          <div>
            <strong>Library book</strong>
            {chatBookContext.title}
          </div>
          <button type="button" onClick={onClearBookContext}>
            Remove
          </button>
        </div>
      )}

      <div ref={scrollRef} className="chat-scroll">
        <div key={resetKey} className="chat-pdf-slot">
          <PDFUpload
            onUpload={(text, _name) => {
              setPdfContent(text);
            }}
            onRemove={() => {
              setPdfContent(null);
            }}
          />
        </div>

        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-icon">
              <GraduationCap size={40} />
            </div>
            <p>
              {profile.vibe === 'Local/Slang'
                ? 'Exeh! Upload your module mwana, let\'s start butah-ing those concepts!'
                : 'Good day. Please upload your course material to begin our academic session.'}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`chat-row ${msg.sender === 'user' ? 'chat-row--user' : 'chat-row--ai'}`}
          >
            <div className={`chat-bubble ${msg.sender === 'user' ? 'chat-bubble--user' : 'chat-bubble--ai'}`}>
              <p>{msg.sender === 'ai' ? displayAiText(msg.text) : msg.text}</p>
              <time>
                {msg.timestamp?.toDate
                  ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '...'}
              </time>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="chat-typing">
            <div className="chat-typing-inner">
              <span className="chat-dot" />
              <span className="chat-dot" />
              <span className="chat-dot" />
            </div>
          </div>
        )}
      </div>

      <div className="chat-input-bar" ref={inputBarRef}>
        <button type="button" className="chat-attach" aria-label="Attach">
          <Paperclip size={24} />
        </button>
        <div className="chat-input-wrap">
          <input
            type="text"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
        </div>
        <button
          type="button"
          className="chat-send"
          onClick={handleSend}
          disabled={!inputText.trim() || isLoading}
        >
          <Send size={20} />
        </button>
      </div>

      <AnimatePresence>
        {showLiveSession && (
          <LiveSession
            profile={profile}
            pdfContent={pdfContent}
            bookContext={chatBookContext}
            onClose={() => setShowLiveSession(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
