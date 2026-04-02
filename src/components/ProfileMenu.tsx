import React, { useState, useEffect } from 'react';
import { X, Globe, User, BookOpen, Flame } from 'lucide-react';
import './ProfileMenu.css';

interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  exehEnabled: boolean;
  onExehChange: (on: boolean) => void;
  kopalaEnabled: boolean;
  onKopalaChange: (on: boolean) => void;
}

const LANGUAGES = ['English', 'Chinyanja', 'Ichibemba', 'Lozi', 'Chitonga'];

export default function ProfileMenu({ isOpen, onClose, exehEnabled, onExehChange, kopalaEnabled, onKopalaChange }: ProfileMenuProps) {
  const [persona, setPersona] = useState(() => localStorage.getItem('userPersona') || '');
  const [language, setLanguage] = useState(() => localStorage.getItem('userLanguage') || 'English');

  useEffect(() => {
    localStorage.setItem('userPersona', persona);
  }, [persona]);

  useEffect(() => {
    localStorage.setItem('userLanguage', language);
  }, [language]);

  if (!isOpen) return null;

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-header">
          <h2>Profile & Settings</h2>
          <button type="button" className="profile-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="profile-content">
          <section className="profile-section">
            <div className="profile-section-title">
              <BookOpen size={20} />
              <h3>About Us</h3>
            </div>
            <p className="profile-about-text">
              <strong>My Lecturer</strong> is your personalized AI tutor with that Zed Spice! 🇿🇲 We bring the lecture hall to you, blending academic rigor with local slang to make learning both effective and engaging.
            </p>
          </section>

          <section className="profile-section">
            <div className="profile-section-title">
              <User size={20} />
              <label htmlFor="persona-input"><h3>Who are you?</h3></label>
            </div>
            <p className="profile-hint">Tell us about yourself so My Lecturer can personalize your sessions.</p>
            <textarea
              id="persona-input"
              className="profile-textarea"
              placeholder="e.g., I'm a first-year biology student struggling with anatomy..."
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              rows={3}
            />
          </section>

          <section className="profile-section">
            <div className="profile-section-title">
              <Globe size={20} />
              <label htmlFor="language-select"><h3>Language Prefernce</h3></label>
            </div>
            <p className="profile-hint">Choose the language My Lecturer should use.</p>
            <div className="profile-select-wrapper">
              <select
                id="language-select"
                className="profile-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
          </section>

          <section className="profile-section">
            <div className="profile-section-title">
              <Flame size={20} />
              <h3>AI Persona & Slang 🌶️</h3>
            </div>
            <p className="profile-hint">Choose how My Lecturer speaks (mutually exclusive). If neither is selected, Standard Academic English is used.</p>
            
            <div className="profile-vibe-row">
              <p className="profile-hint" style={{ margin: 0, flex: 1 }}>
                <strong>Exeh Language</strong> (Lusaka slang)
              </p>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={exehEnabled}
                  onChange={(e) => onExehChange(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="profile-vibe-row" style={{ marginTop: '1rem' }}>
              <p className="profile-hint" style={{ margin: 0, flex: 1 }}>
                <strong>Kopala Vibes</strong> (Copperbelt slang)
              </p>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={kopalaEnabled}
                  onChange={(e) => onKopalaChange(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
