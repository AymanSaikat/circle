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
  const [supportCopied, setSupportCopied] = useState(false);

  const handleSupportCopy = () => {
    navigator.clipboard.writeText('support@circle.com').then(() => {
      setSupportCopied(true);
      setTimeout(() => setSupportCopied(false), 3000);
    }).catch(() => {
      setSupportCopied(true);
      setTimeout(() => setSupportCopied(false), 3000);
    });
  };

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
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-50 dark:bg-zinc-950 select-none h-full">
        <div className="w-20 h-20 rounded-3xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-300 dark:text-zinc-700 text-4xl font-black mb-6 font-sans border border-zinc-200 dark:border-zinc-800 shadow-inner">
          404
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight font-sans">
          Page Not Found
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-3 max-w-sm leading-relaxed">
          The page or user profile you are trying to reach does not exist or has been removed. Please verify the URL.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <button
            id="btn-not-found-back"
            onClick={() => navigate('/feed')}
            className="bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-805 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-bold text-xs py-3 px-6 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all cursor-pointer hover:shadow-md active:scale-95"
          >
            Back to Home
          </button>
          <button
            id="btn-not-found-support"
            onClick={handleSupportCopy}
            className={`border font-bold text-xs py-3 px-6 rounded-xl transition-all cursor-pointer active:scale-95 ${
              supportCopied 
                ? "bg-green-500 hover:bg-green-600 border-green-500 text-white dark:text-white" 
                : "bg-white dark:bg-zinc-900 border-zinc-250 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-850"
            }`}
          >
            {supportCopied ? "Email Copied!" : "Contact Support"}
          </button>
        </div>
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
  const [showCookieBanner, setShowCookieBanner] = useState(() => {
    return localStorage.getItem('cookie-consent') === null;
  });
  const [showCookieSettings, setShowCookieSettings] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(true);
  const [personalizationConsent, setPersonalizationConsent] = useState(false);

  const handleAcceptCookies = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShowCookieBanner(false);
  };

  const handleRejectCookies = () => {
    localStorage.setItem('cookie-consent', 'rejected');
    setShowCookieBanner(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('cookie-consent', 'custom');
    localStorage.setItem('cookie-analytics', analyticsConsent ? 'accepted' : 'rejected');
    localStorage.setItem('cookie-personalization', personalizationConsent ? 'accepted' : 'rejected');
    setShowCookieBanner(false);
  };

  // Auto-redirect to claimed profile username when visiting raw profile
  useEffect(() => {
    if (user && profile && path === '/profile') {
      navigate('/' + profile.username);
    }
  }, [path, user, profile, navigate]);

  // Sync state loader
  if (loading) {
    return (
      <div className="h-[100dvh] min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 flex flex-col md:flex-row overflow-hidden select-none">
        
        {/* Sidebar Skeleton (Desktop only) */}
        <div className="hidden md:flex w-64 flex-col bg-white dark:bg-zinc-950 border-r border-zinc-150 dark:border-zinc-900 h-screen p-6 shrink-0 justify-between">
          <div className="flex flex-col gap-10">
            {/* Logo area */}
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full shimmer" />
              <div className="flex flex-col gap-1.5">
                <div className="w-24 h-4 rounded shimmer" />
                <div className="w-32 h-2.5 rounded shimmer" />
              </div>
            </div>
            {/* Nav items */}
            <div className="flex flex-col gap-3 mt-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl">
                  <div className="w-4 h-4 rounded-full shimmer shrink-0" />
                  <div className="w-32 h-3 rounded shimmer" />
                </div>
              ))}
            </div>
          </div>
          {/* Bottom profile area */}
          <div className="pt-6 border-t border-zinc-150 dark:border-zinc-900 mt-auto">
             <div className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full shimmer shrink-0" />
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="w-20 h-3 rounded shimmer" />
                  <div className="w-16 h-2 rounded shimmer" />
                </div>
             </div>
          </div>
        </div>

        {/* Main Feed Header / Mobile Top Bar Skeleton */}
        <div className="flex-1 flex flex-col w-full h-full">
          <div className="md:hidden flex items-center justify-between bg-white dark:bg-zinc-950 border-b border-zinc-150 dark:border-zinc-900 px-4 py-3">
             <div className="flex items-center gap-2.5">
               <div className="w-7 h-7 rounded-lg shimmer" />
               <div className="w-16 h-3 rounded shimmer" />
             </div>
             <div className="w-6 h-6 rounded shimmer" />
          </div>

          <div className="max-w-2xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
            {/* Main feed cards skeleton placeholders */}
            {[1, 2].map((i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs select-none">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full shimmer" />
                    <div className="flex flex-col gap-2">
                      <div className="h-3.5 w-28 shimmer rounded" />
                      <div className="h-3 w-36 shimmer rounded" />
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex flex-col gap-2.5">
                  <div className="h-3 w-full shimmer rounded" />
                  <div className="h-3 w-11/12 shimmer rounded" />
                  <div className="h-3 w-4/5 shimmer rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Bottom Tab Bar Skeleton */}
        <div className="md:hidden flex items-center justify-around bg-white dark:bg-zinc-950 border-t border-zinc-150 dark:border-zinc-900 px-2 py-1.5 pb-safe-bottom absolute bottom-0 w-full">
           {[1, 2, 3, 4, 5].map((i) => (
             <div key={i} className="w-5 h-5 rounded shimmer m-2" />
           ))}
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

      {/* 4. Cookie Banner */}
      {showCookieBanner && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100%-2rem)] sm:w-85 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-5 flex flex-col gap-3.5 z-[100] animate-in slide-in-from-bottom-8 fade-in text-zinc-900 dark:text-zinc-50 select-none">
          <div className="flex items-start justify-between">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50 tracking-tight">Cookie Preferences</h3>
            <button 
              onClick={() => setShowCookieBanner(false)}
              className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          {!showCookieSettings ? (
            <>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                We use cookies to analyze performance, remember visual choices, and offer a secure, seamless experience.
              </p>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={handleAcceptCookies}
                  className="flex-1 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-bold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  Accept All
                </button>
                <button
                  onClick={handleRejectCookies}
                  className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 font-bold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  Essential Only
                </button>
              </div>
              <p 
                onClick={() => setShowCookieSettings(true)}
                className="text-[10px] text-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-350 transition-colors mt-0.5 underline cursor-pointer font-semibold"
              >
                Manage Settings
              </p>
            </>
          ) : (
            <div className="flex flex-col gap-3 mt-1">
              <div className="flex flex-col gap-2.5 bg-zinc-50 dark:bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-150 dark:border-zinc-800/80">
                <div className="flex items-start gap-2.5 p-1">
                  <input type="checkbox" checked disabled className="mt-0.5 accent-zinc-900 dark:accent-zinc-100 opacity-60" />
                  <div className="flex flex-col ml-1">
                    <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Essential (Required)</span>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500">Secures session states and authentication keys.</span>
                  </div>
                </div>
                
                <label className="flex items-start gap-2.5 p-1 cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30 rounded-lg transition-colors">
                  <input 
                    type="checkbox" 
                    checked={analyticsConsent} 
                    onChange={(e) => setAnalyticsConsent(e.target.checked)}
                    className="mt-0.5 accent-zinc-900 dark:accent-zinc-100 cursor-pointer" 
                  />
                  <div className="flex flex-col ml-1">
                    <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Analytics & Performance</span>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500">Allows anonymous tracking of search queries and load times.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-1 cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30 rounded-lg transition-colors">
                  <input 
                    type="checkbox" 
                    checked={personalizationConsent} 
                    onChange={(e) => setPersonalizationConsent(e.target.checked)}
                    className="mt-0.5 accent-zinc-900 dark:accent-zinc-100 cursor-pointer" 
                  />
                  <div className="flex flex-col ml-1">
                    <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Personalization</span>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500">Saves visual settings (e.g. your theme and tab defaults).</span>
                  </div>
                </label>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={handleSavePreferences}
                  className="flex-1 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-bold text-xs py-2 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  Save Settings
                </button>
                <button
                  onClick={() => setShowCookieSettings(false)}
                  className="bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 font-bold text-xs py-2 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}
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
