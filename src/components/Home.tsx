import React from 'react';
import { Flame } from 'lucide-react';
import { UserProfile } from '../types';
import './Home.css';

interface HomeProps {
  profile: UserProfile;
  zedVibeEnabled: boolean;
  onZedVibeChange: (on: boolean) => void;
}

export default function Home({ profile, zedVibeEnabled, onZedVibeChange }: HomeProps) {
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
          <strong>Vibe Check</strong>
          <span>When on, AI replies get the Zed-style rewrite (minibus &amp; Kantemba spice).</span>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={zedVibeEnabled}
            onChange={(e) => onZedVibeChange(e.target.checked)}
          />
          <span className="toggle-slider" />
        </label>
      </section>
    </div>
  );
}
