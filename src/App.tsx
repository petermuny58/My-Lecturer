import React, { useState, useEffect } from 'react';
import { auth, signIn, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile, ChatBookContext } from './types';
import Onboarding from './components/Onboarding';
import Chat from './components/Chat';
import Home from './components/Home';
import Library from './components/Library';
import { LogIn, Loader2, Home as HomeIcon, BookOpen, MessageSquare, User } from 'lucide-react';
import './App.css';
import ProfileMenu from './components/ProfileMenu';

type Tab = 'home' | 'lecture-hall' | 'books';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [exehEnabled, setExehEnabled] = useState(false);
  const [kopalaEnabled, setKopalaEnabled] = useState(false);
  const [chatBookContext, setChatBookContext] = useState<ChatBookContext | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem('userLanguage') || 'English');

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('userLanguage', lang);
  };

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signIn();
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in cancelled. Please try again.');
      } else {
        setAuthError('Failed to sign in. Please check your connection.');
        console.error('Sign-in error:', error);
      }
    }
  };

  const handleCredentialsLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (username.trim().toLowerCase() === 'admin' && password === '0000') {
      localStorage.setItem('isAdminLoggedIn', 'true');
      setUser({ uid: 'admin', email: 'admin@mylecturer.com', displayName: 'Admin' });
      setProfile({
        uid: 'admin',
        university: 'University of Zambia (UNZA)',
        major: 'Computer Science',
        vibe: 'Local/Slang',
        displayName: 'Admin User',
        email: 'admin@mylecturer.com',
        createdAt: new Date().toISOString()
      });
    } else {
      setAuthError('Incorrect password. Standard student accounts must sign in using Google.');
    }
  };

  const handleSignOut = async () => {
    setIsProfileOpen(false);
    localStorage.removeItem('isAdminLoggedIn');
    setUser(null);
    setProfile(null);
    try {
      await auth.signOut();
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  useEffect(() => {
    // Check if admin is logged in locally to bypass Firebase auth check
    const isAdmin = localStorage.getItem('isAdminLoggedIn') === 'true';
    if (isAdmin) {
      setUser({ uid: 'admin', email: 'admin@mylecturer.com', displayName: 'Admin' });
      setProfile({
        uid: 'admin',
        university: 'University of Zambia (UNZA)',
        major: 'Computer Science',
        vibe: 'Local/Slang',
        displayName: 'Admin User',
        email: 'admin@mylecturer.com',
        createdAt: new Date().toISOString()
      });
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (localStorage.getItem('isAdminLoggedIn') === 'true') return;
      setUser(u);
      if (u) {
        const docRef = doc(db, 'users', u.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <Loader2 size={48} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-auth">
        <div className="app-auth-logo">
          <img src="/logo.png" alt="My Lecturer" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
        </div>
        <h1>My Lecturer</h1>
        <p>Your personalized AI tutor with that Zed Spice. 🇿🇲</p>

        {authError && <div className="app-auth-error">{authError}</div>}

        <form onSubmit={handleCredentialsLogin} className="app-auth-card">
          <div className="app-auth-input-group">
            <label htmlFor="username-input">Email or Username</label>
            <input
              id="username-input"
              type="text"
              className="app-auth-input"
              placeholder="e.g. admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="app-auth-input-group">
            <label htmlFor="password-input">Password</label>
            <input
              id="password-input"
              type="password"
              className="app-auth-input"
              placeholder="••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="app-auth-submit-btn">
            Log In
          </button>
        </form>

        <div className="app-auth-divider">
          <span>OR</span>
        </div>

        <button type="button" onClick={handleSignIn} className="app-auth-btn">
          <LogIn size={24} />
          Sign in with Google
        </button>
      </div>
    );
  }

  if (!profile) {
    return <Onboarding onComplete={setProfile} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <Home
            profile={profile}
          />
        );
      case 'lecture-hall':
        return (
          <Chat
            profile={profile}
            exehEnabled={exehEnabled}
            kopalaEnabled={kopalaEnabled}
            language={language}
            chatBookContext={chatBookContext}
            onClearBookContext={() => setChatBookContext(null)}
          />
        );
      case 'books':
        return <Library onAddToAiChat={(book) => setChatBookContext(book)} />;
      default:
        return null;
    }
  };

  return (
    <div className="app-shell">
      {activeTab === 'home' && (
        <button 
          className="app-profile-toggle" 
          onClick={() => setIsProfileOpen(true)}
          aria-label="Open Profile"
        >
          <User size={24} />
        </button>
      )}

      <ProfileMenu 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        exehEnabled={exehEnabled}
        onExehChange={(val) => { setExehEnabled(val); if(val) setKopalaEnabled(false); }}
        kopalaEnabled={kopalaEnabled}
        onKopalaChange={(val) => { setKopalaEnabled(val); if(val) setExehEnabled(false); }}
        language={language}
        onLanguageChange={handleLanguageChange}
        onSignOut={handleSignOut}
      />

      <div className="app-main">{renderContent()}</div>

      <div className="app-nav-wrap">
        <nav className="app-nav-glass" aria-label="Main">
          <button
            type="button"
            className={`app-nav-btn ${activeTab === 'home' ? 'app-nav-btn--active-home' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            <HomeIcon size={24} />
            <span className="app-nav-label">Home</span>
          </button>

          <button
            type="button"
            className={`app-nav-btn ${activeTab === 'lecture-hall' ? 'app-nav-btn--active-lecture' : ''}`}
            onClick={() => setActiveTab('lecture-hall')}
          >
            <MessageSquare size={24} />
            <span className="app-nav-label">Lecture Hall</span>
          </button>

          <button
            type="button"
            className={`app-nav-btn ${activeTab === 'books' ? 'app-nav-btn--active-books' : ''}`}
            onClick={() => setActiveTab('books')}
          >
            <BookOpen size={24} />
            <span className="app-nav-label">Books</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
