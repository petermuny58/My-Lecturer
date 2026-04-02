import React from 'react';
import { Flame } from 'lucide-react';
import { UserProfile } from '../types';
import './Home.css';

interface HomeProps {
  profile: UserProfile;
}

export default function Home({ profile }: HomeProps) {
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
    </div>
  );
}
