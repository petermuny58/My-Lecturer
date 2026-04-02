import React from 'react';
import { Flame } from 'lucide-react';
import { UserProfile } from '../types';
import './Home.css';

interface HomeProps {
  profile: UserProfile;
  exehEnabled: boolean;
  onExehChange: (on: boolean) => void;
  kopalaEnabled: boolean;
  onKopalaChange: (on: boolean) => void;
}

export default function Home({ profile, exehEnabled, onExehChange, kopalaEnabled, onKopalaChange }: HomeProps) {
  const firstName = profile.displayName?.split(/\s+/)[0] || 'Student';

  return (
    <div className="home-scroll">
      <section className="home-greeting">
        <h2>Good to see you, {firstName}</h2>
        <p>
          {profile.university} · {profile.major}. Ready when you are — Library, Lecture Hall, and your streak are all here.
        </p>
      </section>

      <section className="home-streak" aria-labelledby="streak-heading">
        <div className="home-streak-header">
          <div className="home-streak-icon-wrap">
            <Flame size={28} strokeWidth={2.25} aria-hidden />
          </div>
          <div>
            <h3 id="streak-heading">My Study Streak</h3>
            <p>Keep the fire — open the app daily to grow your streak.</p>
          </div>
        </div>
      </section>

      <section className="home-vibe" aria-label="Vibe Check">
        <div className="home-vibe-text">
          <strong>AI Persona</strong>
          <span>Toggle Exeh or Kopala vibes for the AI. If both are off, it uses standard English.</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <label className="toggle" style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', marginRight: '0.5rem' }}>Exeh</span>
            <div style={{ position: 'relative' }}>
              <input
                type="checkbox"
                checked={exehEnabled}
                onChange={(e) => onExehChange(e.target.checked)}
              />
              <span className="toggle-slider" />
            </div>
          </label>
          <label className="toggle" style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', marginRight: '0.5rem' }}>Kopala</span>
            <div style={{ position: 'relative' }}>
              <input
                type="checkbox"
                checked={kopalaEnabled}
                onChange={(e) => onKopalaChange(e.target.checked)}
              />
              <span className="toggle-slider" />
            </div>
          </label>
        </div>
      </section>
    </div>
  );
}
