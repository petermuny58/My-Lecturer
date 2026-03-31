import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { db, auth } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { GraduationCap, BookOpen, Zap, ChevronRight, ChevronLeft } from 'lucide-react';
import './Onboarding.css';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

const UNIVERSITIES = ['UNZA', 'CBU', 'DMI', 'Mulungushi', 'Cavendish', 'ZCAS', 'Other'];
const VIBES = [
  { id: 'Strict', label: 'Strict Professor', desc: 'Formal, academic, and direct.', icon: GraduationCap },
  { id: 'Local/Slang', label: 'Local/Slang', desc: 'Zed Spice! "Exeh, butah, ba guy".', icon: Zap },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [university, setUniversity] = useState('');
  const [major, setMajor] = useState('');
  const [vibe, setVibe] = useState<'Strict' | 'Local/Slang'>('Local/Slang');

  const handleFinish = async () => {
    if (!auth.currentUser) return;

    const profile: UserProfile = {
      uid: auth.currentUser.uid,
      university,
      major,
      vibe,
      displayName: auth.currentUser.displayName || 'Student',
      email: auth.currentUser.email || '',
      photoURL: auth.currentUser.photoURL || undefined,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', profile.uid), profile);
    onComplete(profile);
  };

  const steps = [
    {
      title: 'Which Uni are you at?',
      content: (
        <div className="onboarding-grid">
          {UNIVERSITIES.map((uni) => (
            <button
              key={uni}
              type="button"
              className={`onboarding-uni-btn ${university === uni ? 'onboarding-uni-btn--sel' : ''}`}
              onClick={() => {
                setUniversity(uni);
                setStep(1);
              }}
            >
              {uni}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "What's your Major?",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="onboarding-field-wrap">
            <BookOpen size={20} />
            <input
              type="text"
              placeholder="e.g. Computer Science, Law..."
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              className="onboarding-input"
            />
          </div>
          <button
            type="button"
            disabled={!major}
            onClick={() => setStep(2)}
            className="onboarding-next"
          >
            Next <ChevronRight size={20} />
          </button>
        </div>
      ),
    },
    {
      title: "Choose your Lecturer's Vibe",
      content: (
        <div className="onboarding-vibe">
          {VIBES.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVibe(v.id as 'Strict' | 'Local/Slang')}
              className={`onboarding-vibe-btn ${vibe === v.id ? 'onboarding-vibe-btn--sel' : ''}`}
            >
              <div className="onboarding-vibe-icon">
                <v.icon size={24} />
              </div>
              <div>
                <h3>{v.label}</h3>
                <p>{v.desc}</p>
              </div>
            </button>
          ))}
          <button type="button" onClick={handleFinish} className="onboarding-start">
            Start Learning
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="onboarding">
      <div className="onboarding-inner">
        <div className="onboarding-top">
          <div style={{ width: 40, display: 'flex', justifyContent: 'flex-start' }}>
            {step > 0 && (
              <button type="button" className="onboarding-back" onClick={() => setStep(step - 1)}>
                <ChevronLeft size={24} />
              </button>
            )}
          </div>
          <div className="onboarding-dots">
            {steps.map((_, i) => (
              <div key={i} className={`onboarding-dot ${i <= step ? 'onboarding-dot--on' : ''}`} />
            ))}
          </div>
          <div style={{ width: 40 }} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="onboarding-step"
          >
            <h1>{steps[step].title}</h1>
            {steps[step].content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
