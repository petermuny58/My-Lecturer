export interface UserProfile {
  uid: string;
  university: string;
  major: string;
  vibe: 'Strict' | 'Local/Slang';
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: any;
  pdfContext?: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  pdfUrl?: string;
  pdfName?: string;
  lastMessage?: string;
  updatedAt: any;
}

/** Saved from Library — injected into Lecture Hall context */
export interface ChatBookContext {
  title: string;
  description: string;
}
