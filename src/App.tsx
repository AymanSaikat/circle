import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RouterProvider, useRouter } from './context/RouterContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Feed } from './pages/Feed';
import { Profile } from './pages/Profile';
import { Login } from './pages/Login';
import { Search } from './pages/Search';
import { Messages } from './pages/Messages';
import { ProfileSetupModal } from './components/ProfileSetupModal';
import { RefreshCw } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseClient';
import { RESERVED_WORDS } from './utils/username';

function DynamicProfileLoader({ 
  username, 
  onTagClick 
}: { 
  username: string; 
  onTagClick: (tag: string) => void; 
}) {
  const { navigate } = useRouter();
  const [loading, setLoading] = useState(true);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setResolvedUserId(null);

    const lowerUsername = username.toLowerCase();
    const usernameRef = doc(db, 'usernames', lowerUsername);

    getDoc(usernameRef).then((snap) => {
      if (!active) return;
      if (snap.exists()) {
        const data = snap.data();
        if (data.isRedirect && data.redirectTo) {
          // Seamless legacy changing username redirects!
          navigate('/' + data.redirectTo);
        } else {
          setResolvedUserId(data.userId);
          setLoading(false);
        }
      } else {
        setResolvedUserId(null);
        setLoading(false);
      }
    }).catch((err) => {
      if (!active) return;
      console.error('Failed to resolve custom profile slug URL', err);
      setError('Failed to resolve profile slug.');
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [username, navigate]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col gap-6 p-6 bg-zinc-50 dark:bg-zinc-950 animate-pulse select-none">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex-1 flex flex-col gap-2.5">
              <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="h-3 w-48 bg-zinc-200 dark:bg-zinc-850 rounded" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-855" />
              <div className="flex flex-col gap-2">
                <div className="h-3.5 w-24 bg-zinc-200 dark:bg-zinc-805 rounded" />
                <div className="h-3 w-32 bg-zinc-200 dark:bg-zinc-855 rounded" />
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-2.5">
            <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-805 rounded" />
            <div className="h-3 w-4/5 bg-zinc-200 dark:bg-zinc-805 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !resolvedUserId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-50 select-none">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 text-3xl font-bold mb-4 font-sans border border-zinc-200 shadow-xs">
          ?
        </div>
        <h2 className="text-base font-bold text-zinc-900 tracking-tight font-sans">
          Profile Not Found
        </h2>
        <p className="text-zinc-500 text-xs mt-1.5 max-w-sm leading-relaxed">
          The username "@{username}" does not exist in our registries or has been released. Please verify the URL slug.
        </p>
        <button
          id="btn-not-found-back"
          onClick={() => navigate('/feed')}
          className="mt-6 bg-zinc-900 hover:bg-zinc-805 text-white font-semibold text-xs py-2 px-5 rounded-xl shadow-xs transition-all cursor-pointer hover:shadow-md"
        >
          Back to Timeline Feed
        </button>
      </div>
    );
  }

  return (
    <Profile
      targetUserId={resolvedUserId}
      onTagClick={onTagClick}
    />
  );
}

function AppContent() {
  const { user, profile, loading } = useAuth();
  const { path, navigate } = useRouter();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Auto-redirect to claimed profile username when visiting raw profile
  useEffect(() => {
    if (user && profile && path === '/profile') {
      navigate('/' + profile.username);
    }
  }, [path, user, profile, navigate]);

  // Sync state loader
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-4 text-center">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-white animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center font-bold text-zinc-900 dark:text-zinc-100 text-xs text-center">
            C
          </div>
        </div>
        <div>
          <p className="text-zinc-900 dark:text-zinc-100 text-sm font-semibold">Authorizing secure node...</p>
          <p className="text-zinc-400 dark:text-zinc-500 text-[10px] font-mono mt-1">Please wait while configuration boots up</p>
        </div>
      </div>
    );
  }

  // Not authenticated? Show the beautiful minimalist login page
  if (!user) {
    return <Login />;
  }

  // Authenticated but profile doesn't exist? (e.g. Google Sign in user who hasn't picked a username)
  const needsOnboarding = !profile;

  const handleOpenProfileSetup = () => {
    setIsProfileModalOpen(true);
  };

  const handleTagNavigation = (tag: string) => {
    setSelectedTag(tag);
    navigate('/feed');
  };

  // Compute tabs & routes based on pure URL structures
  const isFeed = path === '/' || path === '/feed';
  const isPrivate = path === '/private';
  const isSearch = path === '/search';
  const isMessages = path.startsWith('/messages') || path === '/messages';
  const isBookmarks = path === '/bookmarks';
  
  // Extract custom user slug from URL parameter directly
  let potentialUsername = '';
  if (!isFeed && !isPrivate && !isSearch && !isMessages && !isBookmarks && path.length > 1) {
    potentialUsername = path.slice(1);
  }

  return (
    <div className="h-[100dvh] min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 flex flex-col md:flex-row text-zinc-900 dark:text-zinc-50 font-sans antialiased overflow-hidden selection:bg-zinc-950/10 dark:selection:bg-zinc-50/10 selection:text-zinc-950 dark:selection:text-zinc-50">
      
      {/* 1. Main Navigation Sidebar Panel */}
      <Navbar
        currentTab={isFeed ? 'feed' : isPrivate ? 'private' : isSearch ? 'search' : isMessages ? 'messages' : isBookmarks ? 'bookmarks' : 'profile'}
        setCurrentTab={(tab) => {
          if (tab === 'feed') navigate('/feed');
          else if (tab === 'private') navigate('/private');
          else if (tab === 'search') navigate('/search');
          else if (tab === 'messages') navigate('/messages');
          else if (tab === 'bookmarks') navigate('/bookmarks');
          else if (tab === 'profile') {
            if (profile) navigate('/' + profile.username);
            else navigate('/profile');
          }
          setSelectedTag(null);
        }}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
        onOpenProfileSetup={handleOpenProfileSetup}
      />

      {/* 2. Interactive Page view section */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {isFeed && (
          <Feed
            selectedTag={selectedTag}
            setSelectedTag={setSelectedTag}
            currentTab="feed"
          />
        )}

        {isPrivate && (
          <Feed
            selectedTag={selectedTag}
            setSelectedTag={setSelectedTag}
            currentTab="private"
          />
        )}

        {isBookmarks && (
          <Feed
            selectedTag={selectedTag}
            setSelectedTag={setSelectedTag}
            currentTab="bookmarks"
          />
        )}

        {isSearch && (
          <Search />
        )}

        {isMessages && (
          <Messages />
        )}

        {potentialUsername && (
          <DynamicProfileLoader
            username={potentialUsername}
            onTagClick={handleTagNavigation}
          />
        )}
      </main>

      {/* Helper padding offset spacer for mobile screens so that bottom nav content does not cover articles */}
      <div className="md:hidden h-16 w-full select-none shrink-0" />

      {/* 3. Global setups/onboarding wizard modals overlay */}
      <ProfileSetupModal
        isOpen={needsOnboarding || isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        forceOnboarding={needsOnboarding}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider>
          <AppContent />
        </RouterProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
