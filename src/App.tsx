import React, { useState, useEffect } from 'react';
import { auth, signIn, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile, ChatBookContext } from './types';
import Onboarding from './components/Onboarding';
import Chat from './components/Chat';
import Home from './components/Home';
import Library from './components/Library';
import { GraduationCap, LogIn, Loader2, Home as HomeIcon, BookOpen, MessageSquare, User } from 'lucide-react';
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
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
          <GraduationCap size={56} />
        </div>
        <h1>My Lecturer</h1>
        <p>Your personalized AI tutor with that Zed Spice. 🇿🇲</p>

        {authError && <div className="app-auth-error">{authError}</div>}

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
            exehEnabled={exehEnabled}
            onExehChange={(val) => { setExehEnabled(val); if(val) setKopalaEnabled(false); }}
            kopalaEnabled={kopalaEnabled}
            onKopalaChange={(val) => { setKopalaEnabled(val); if(val) setExehEnabled(false); }}
          />
        );
      case 'lecture-hall':
        return (
          <Chat
            profile={profile}
            exehEnabled={exehEnabled}
            kopalaEnabled={kopalaEnabled}
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
      <button 
        className="app-profile-toggle" 
        onClick={() => setIsProfileOpen(true)}
        aria-label="Open Profile"
      >
        <User size={24} />
      </button>

      <ProfileMenu 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        exehEnabled={exehEnabled}
        onExehChange={(val) => { setExehEnabled(val); if(val) setKopalaEnabled(false); }}
        kopalaEnabled={kopalaEnabled}
        onKopalaChange={(val) => { setKopalaEnabled(val); if(val) setExehEnabled(false); }}
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
