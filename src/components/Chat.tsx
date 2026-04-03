import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Mic, MoreVertical, Paperclip, GraduationCap, Trash2, X } from 'lucide-react';
import { UserProfile, Message, ChatBookContext } from '../types';
import { db } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { getGeminiResponse, FileAttachment } from '../lib/gemini';
import PDFUpload from './PDFUpload';
import LiveSession from './LiveSession';
import './Chat.css';

interface ChatProps {
  profile: UserProfile;
  exehEnabled: boolean;
  kopalaEnabled: boolean;
  chatBookContext: ChatBookContext | null;
  onClearBookContext: () => void;
}

export default function Chat({ profile, exehEnabled, kopalaEnabled, chatBookContext, onClearBookContext }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [pdfContent, setPdfContent] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLiveSession, setShowLiveSession] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [attachments, setAttachments] = useState<(FileAttachment & { name: string, previewUrl?: string })[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Removed translateToZedStyle, AI now naturally uses styles based on gemini prompt

  const clearChat = async () => {
    try {
      const q = query(collection(db, 'users', profile.uid, 'sessions', 'default', 'messages'));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();

      // Also clear module if user confirms full clear
      await handleClearModule();
      
      setResetKey((prev) => prev + 1);
      setShowMenu(false);
      setConfirmClear(false);
      onClearBookContext();
    } catch (error) {
      console.error('Failed to clear chat:', error);
    }
  };

  const handleClearModule = async () => {
    try {
      // 1. Clear Firestore Vector Chunks
      const q = query(collection(db, 'users', profile.uid, 'chunks'));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));
      await batch.commit();

      // 2. Clear IndexedDB persistence
      const { deleteModule } = await import('../lib/db');
      await deleteModule(profile.uid);

      // 3. Reset Local State
      setPdfContent(null);
      setPdfFileName(null);
      setResetKey(prev => prev + 1);
    } catch (error) {
      console.warn("Failed to clear module:", error);
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

  // Load existing module from IndexedDB on mount
  useEffect(() => {
    const loadSavedModule = async () => {
      try {
        const { getModule } = await import('../lib/db');
        const saved = await getModule(profile.uid);
        if (saved) {
          setPdfContent(saved.text);
          setPdfFileName(saved.fileName);
        }
      } catch (err) {
        console.warn("Failed to load saved module:", err);
      }
    };
    loadSavedModule();
  }, [profile.uid]);

  // Proactive Messaging ('AI Speaks First')
  useEffect(() => {
    if (messages.length === 0 && !isLoading) {
      const initGreeting = async () => {
        setIsLoading(true);
        let greetingText = "Hello! Welcome to your digital lecture hall. What would you like to study today?";
        if (exehEnabled) {
          greetingText = "Laka? What are we working on today my guy?";
        } else if (kopalaEnabled) {
          greetingText = "Mudala, what are we studying? Let's get to it sharp sharp.";
        }
        
        try {
          await addDoc(collection(db, 'users', profile.uid, 'sessions', 'default', 'messages'), {
            text: greetingText,
            sender: 'ai',
            timestamp: serverTimestamp(),
          });
        } catch (error) {
          console.error('Failed to send proactive message:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      initGreeting();
    }
  }, [messages.length, exehEnabled, kopalaEnabled, profile.uid]);

  const handleSend = async () => {
    if ((!inputText.trim() && attachments.length === 0) || isLoading) return;

    const userMsg = inputText.trim();
    const currentAttachments = [...attachments];
    
    setInputText('');
    setAttachments([]);
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
        exehEnabled,
        kopalaEnabled,
        pdfContent || undefined,
        chatBookContext,
        currentAttachments.map(a => ({ mimeType: a.mimeType, data: a.data }))
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        
        let inferredType = file.type;
        if (!inferredType) {
          const ext = file.name.split('.').pop()?.toLowerCase();
          if (ext === 'pdf') inferredType = 'application/pdf';
          else if (ext === 'ppt') inferredType = 'application/vnd.ms-powerpoint';
          else if (ext === 'pptx') inferredType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          else if (ext === 'doc') inferredType = 'application/msword';
          else if (ext === 'docx') inferredType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          else if (ext === 'png') inferredType = 'image/png';
          else if (ext === 'jpg' || ext === 'jpeg') inferredType = 'image/jpeg';
          else inferredType = 'application/octet-stream';
        }

        setAttachments(prev => [...prev, {
          mimeType: inferredType,
          data: base64Data,
          name: file.name,
          previewUrl: inferredType.startsWith('image/') ? result : undefined
        }]);
      };
      reader.readAsDataURL(file);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

          {pdfContent && (
            <button 
              type="button" 
              className="chat-header-btn chat-header-btn--danger"
              onClick={handleClearModule}
              title="Clear Study Module"
            >
              <Trash2 size={20} />
              <span style={{ fontSize: '11px', fontWeight: 800 }}>CLEAR</span>
            </button>
          )}

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
                  <>
                    <button type="button" onClick={() => setConfirmClear(true)}>
                      <Trash2 size={16} />
                      Clear Chat History
                    </button>
                    {pdfContent && (
                      <button 
                        type="button" 
                        onClick={() => {
                          handleClearModule();
                          setShowMenu(false);
                        }}
                        style={{ color: '#ff4444' }}
                      >
                        <X size={16} />
                        Clear Study Module
                      </button>
                    )}
                  </>
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
            uid={profile.uid}
            onUpload={(text, name) => {
              setPdfContent(text);
              setPdfFileName(name);
            }}
            onRemove={handleClearModule}
            initialFileName={pdfFileName}
          />
        </div>

        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-icon">
              <GraduationCap size={40} />
            </div>
            <p>Gathering your course materials...</p>
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
              <p>{msg.text}</p>
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
        {attachments.length > 0 && (
          <div className="chat-attachments-preview">
            {attachments.map((att, idx) => (
              <div key={idx} className="chat-attachment-item">
                {att.previewUrl ? (
                  <img src={att.previewUrl} alt={att.name} />
                ) : (
                  <div className="chat-attachment-doc">
                    <Paperclip size={14} />
                    <span>{att.name}</span>
                  </div>
                )}
                <button type="button" onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="chat-input-row">
          <input 
            type="file" 
            id="chat-file-upload"
            ref={fileInputRef} 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
            multiple
            accept="image/*,.pdf,.ppt,.pptx"
          />
          <label htmlFor="chat-file-upload" className="chat-attach" aria-label="Attach" style={{ cursor: 'pointer' }}>
            <Paperclip size={24} />
          </label>
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
            disabled={(!inputText.trim() && attachments.length === 0) || isLoading}
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showLiveSession && (
          <LiveSession
            profile={profile}
            exehEnabled={exehEnabled}
            kopalaEnabled={kopalaEnabled}
            pdfContent={pdfContent}
            bookContext={chatBookContext}
            onClose={() => setShowLiveSession(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
