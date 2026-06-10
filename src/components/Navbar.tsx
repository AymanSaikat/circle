import React, { useState, useRef, useEffect } from 'react';
import { 
  Home, 
  Compass, 
  MessageSquare, 
  Lock, 
  Settings, 
  User, 
  LogOut, 
  RefreshCw, 
  Hash, 
  Search, 
  Sun, 
  Moon, 
  MoreHorizontal, 
  HelpCircle,
  Sparkles,
  Info,
  Bookmark,
  Check,
  Copy
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ProfileDropdown } from './ProfileDropdown';

import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseClient';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  onOpenProfileSetup: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentTab, 
  setCurrentTab, 
  selectedTag, 
  setSelectedTag,
  onOpenProfileSetup 
}) => {
  const { profile, logOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [metaClicked, setMetaClicked] = useState(false);
  const [helpClicked, setHelpClicked] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'messages'),
      where('receiverId', '==', profile.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      const count = snap.docs.filter(doc => doc.data().isRead === false).length;
      setUnreadCount(count);
    }, (err) => {
      console.error('Failed to subscribe to unread messages count', err);
    });
    return unsub;
  }, [profile]);

  const handleCopyLink = () => {
    if (!profile) return;
    const profileUrl = `${window.location.origin}/${profile.username}`;
    navigator.clipboard.writeText(profileUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }).catch(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // Close "More" dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTabClick = (tab: string) => {
    setCurrentTab(tab);
    if (tab !== 'feed') {
      setSelectedTag(null);
    }
    // Auto-scroll screen page view container up smoothly on navigation transitions
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getButtonClasses = (isActive: boolean) => {
    return `flex items-center justify-center xl:justify-start gap-3.5 px-3 xl:px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all group select-none cursor-pointer ${
      isActive
        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-md shadow-zinc-900/10 dark:shadow-none font-extrabold'
        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/40'
    }`;
  };

  return (
    <>
      {/* ==================== DESKTOP SIDEBAR NAVIGATION (md and up) ==================== */}
      <aside className="hidden md:flex w-20 xl:w-64 flex-col bg-white dark:bg-zinc-950 border-r border-zinc-100 dark:border-zinc-900/60 text-zinc-900 dark:text-zinc-50 h-[100dvh] min-h-[100dvh] p-3 xl:p-6 sticky top-0 shrink-0 justify-between select-none z-30 transition-all duration-300">
        
        {/* Top Branding & Main Menu List */}
        <div className="flex flex-col gap-10">
          
          {/* Futuristic minimalist line-art logo design */}
          <div className="flex items-center justify-center xl:justify-start gap-3 px-1 xl:px-2 group">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-zinc-900 dark:border-zinc-100 transition-all group-hover:scale-105 duration-300 shrink-0">
              <div className="w-3 h-3 bg-zinc-905 dark:bg-zinc-100 rounded-full animate-pulse" />
              <div className="absolute -inset-0.5 border border-dashed rounded-full border-zinc-400/20 group-hover:animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <div className="hidden xl:block">
              <h1 className="text-sm font-extrabold font-sans tracking-widest text-zinc-900 dark:text-zinc-50 uppercase truncate">
                Circle Media
              </h1>
              <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold tracking-wider uppercase mt-0.5 truncate">SHARE WHAT'S REAL</p>
            </div>
          </div>

          {/* Vertically Stacked Navigation Options with ample negative space */}
          <nav className="flex flex-col gap-1.5">
            <button
              id="desktop-nav-home"
              onClick={() => handleTabClick('feed')}
              className={getButtonClasses(currentTab === 'feed' && !selectedTag)}
            >
              <Home className="w-[17px] h-[17px] transition-transform group-hover:scale-105 duration-200 shrink-0" />
              <span className="hidden xl:inline">Feed</span>
            </button>

            <button
              id="desktop-nav-search"
              onClick={() => handleTabClick('search')}
              className={getButtonClasses(currentTab === 'search')}
            >
              <Compass className="w-[17px] h-[17px] transition-transform group-hover:rotate-12 duration-200 shrink-0" />
              <span className="hidden xl:inline">Discover</span>
            </button>

            <button
              id="desktop-nav-messages"
              onClick={() => handleTabClick('messages')}
              className={`${getButtonClasses(currentTab === 'messages')} relative`}
              title="Messages"
            >
              <MessageSquare className="w-[17px] h-[17px] transition-transform group-hover:scale-105 duration-200 shrink-0" />
              <div className="hidden xl:flex flex-1 items-center justify-between">
                <span>Messages</span>
                {/* Dynamic vibrant red notification badge */}
                {unreadCount > 0 && (
                  <div className="bg-red-500 dark:bg-red-600 text-white font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded-full leading-none flex items-center justify-center animate-pulse shadow-xs">
                    {unreadCount}
                  </div>
                )}
              </div>
              {unreadCount > 0 && (
                <div className="xl:hidden absolute top-1.5 right-1.5 bg-red-500 text-white font-mono text-[7px] font-extrabold w-3.5 h-3.5 rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </div>
              )}
            </button>

            <button
              id="desktop-nav-private"
              onClick={() => handleTabClick('private')}
              className={getButtonClasses(currentTab === 'private')}
            >
              <Lock className="w-[17px] h-[17px] transition-transform group-hover:-translate-y-0.5 duration-200 shrink-0" />
              <span className="hidden xl:inline">Private Notes</span>
            </button>

            <button
              id="desktop-nav-bookmarks"
              onClick={() => handleTabClick('bookmarks')}
              className={getButtonClasses(currentTab === 'bookmarks')}
            >
              <Bookmark className="w-[17px] h-[17px] transition-transform group-hover:scale-105 duration-200 shrink-0" />
              <span className="hidden xl:inline">Bookmarks</span>
            </button>

            <button
              id="desktop-nav-profile"
              onClick={() => handleTabClick('profile')}
              className={getButtonClasses(currentTab === 'profile')}
            >
              <User className="w-[17px] h-[17px] transition-transform group-hover:scale-105 duration-200 shrink-0" />
              <span className="hidden xl:inline">My Profile</span>
            </button>

            {/* Custom Settings component tab triggers modal setup */}
            <button
              id="desktop-nav-settings"
              onClick={onOpenProfileSetup}
              className={getButtonClasses(false)}
            >
              <Settings className="w-[17px] h-[17px] transition-transform group-hover:rotate-45 duration-300 shrink-0" />
              <span className="hidden xl:inline">Settings</span>
            </button>

            {/* Active Hashtag selection filter bubble details */}
            {selectedTag && (
              <div className="flex items-center justify-center xl:justify-start gap-2 px-2 xl:px-4 py-2.5 rounded-xl text-[11px] font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 mt-2.5 animate-fade-in w-full overflow-hidden">
                <Hash className="w-3.5 h-3.5 text-zinc-500 animate-pulse shrink-0" />
                <span className="hidden xl:inline truncate max-w-[110px]">#{selectedTag}</span>
                <button 
                  id="btn-clear-hashtag-filter-sidebar"
                  onClick={() => setSelectedTag(null)}
                  className="xl:ml-auto text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all text-xs"
                >
                  ✕
                </button>
              </div>
            )}
          </nav>
        </div>

        {/* Bottom Section - isolated with ProfileDropdown menu */}
        <div className="relative pt-6 border-t border-zinc-100 dark:border-zinc-900/60 flex flex-col gap-4">
          <ProfileDropdown 
            onOpenProfileSetup={onOpenProfileSetup} 
            onNavigateToTab={handleTabClick} 
          />
        </div>
      </aside>


      {/* ==================== SCREEN HEADER FOR MOBILE VIEW ==================== */}
      <header className="flex md:hidden items-center justify-between bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-900/60 px-4 py-3 sticky top-0 z-40 select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 dark:bg-zinc-50 flex items-center justify-center font-extrabold text-white dark:text-zinc-950 text-xs shadow-xs">
            C
          </div>
          <h1 className="text-xs font-black tracking-widest text-zinc-900 dark:text-zinc-50 uppercase">
            Circle
          </h1>
        </div>

        <div className="flex items-center gap-1">
          {/* Quick theme toggler in head */}
          <button
            id="mobile-header-theme-toggle"
            onClick={toggleTheme}
            className="p-2 rounded-lg text-zinc-400 focus:outline-none cursor-pointer active:scale-95 transition-transform"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-zinc-600" />}
          </button>
          
          {/* Settings Trigger for Mobile */}
          <button
            id="mobile-header-settings"
            onClick={onOpenProfileSetup}
            className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer active:scale-95 transition-transform"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Logout Trigger for Mobile */}
          <button
            id="mobile-header-logout"
            onClick={logOut}
            className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 cursor-pointer active:scale-95 transition-transform"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>


      {/* ==================== BOTTOM TAB BAR NAVIGATION NAVIGATION (Mobile Only) ==================== */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-100 dark:border-zinc-900/60 px-2 py-1.5 flex items-center justify-around z-30 select-none pb-safe-bottom">
        
        <button
          id="mobile-tab-home"
          onClick={() => handleTabClick('feed')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
            currentTab === 'feed' && !selectedTag ? 'text-zinc-950 dark:text-white font-extrabold scale-110' : 'text-zinc-400 hover:text-zinc-650'
          }`}
          style={{ minHeight: '44px', minWidth: '44px' }}
        >
          <Home className="w-5 h-5" />
        </button>

        <button
          id="mobile-tab-discover"
          onClick={() => handleTabClick('search')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
            currentTab === 'search' ? 'text-zinc-950 dark:text-white font-extrabold scale-110' : 'text-zinc-400 hover:text-zinc-650'
          }`}
          style={{ minHeight: '44px', minWidth: '44px' }}
        >
          <Compass className="w-5 h-5" />
        </button>

        <button
          id="mobile-tab-messages"
          onClick={() => handleTabClick('messages')}
          className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
            currentTab === 'messages' ? 'text-zinc-950 dark:text-white font-extrabold scale-110' : 'text-zinc-400 hover:text-zinc-650'
          }`}
          style={{ minHeight: '44px', minWidth: '44px' }}
          title="Messages"
          aria-label="Messages"
        >
          <MessageSquare className="w-5 h-5" />
          {/* Dynamic dynamic tiny notification dot on mobile */}
          {unreadCount > 0 && (
            <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
        </button>

        <button
          id="mobile-tab-private"
          onClick={() => handleTabClick('private')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
            currentTab === 'private' ? 'text-zinc-950 dark:text-white font-extrabold scale-110' : 'text-zinc-400 hover:text-zinc-650'
          }`}
          style={{ minHeight: '44px', minWidth: '44px' }}
        >
          <Lock className="w-5 h-5" />
        </button>

        <button
          id="mobile-tab-bookmarks"
          onClick={() => handleTabClick('bookmarks')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
            currentTab === 'bookmarks' ? 'text-zinc-950 dark:text-white font-extrabold scale-110' : 'text-zinc-400 hover:text-zinc-650'
          }`}
          style={{ minHeight: '44px', minWidth: '44px' }}
        >
          <Bookmark className="w-5 h-5" />
        </button>

        <button
          id="mobile-tab-profile"
          onClick={() => handleTabClick('profile')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
            currentTab === 'profile' ? 'text-zinc-950 dark:text-white font-extrabold scale-110' : 'text-zinc-400 hover:text-zinc-650'
          }`}
          style={{ minHeight: '44px', minWidth: '44px' }}
        >
          {profile ? (
            <img 
              src={profile.avatarUrl} 
              alt="Profile avatar miniaturized" 
              className={`w-[22px] h-[22px] rounded-full object-cover border-2 ${
                currentTab === 'profile' ? 'border-zinc-900 dark:border-white' : 'border-zinc-200/50 dark:border-zinc-800'
              }`}
              referrerPolicy="no-referrer"
            />
          ) : (
            <User className="w-5 h-5" />
          )}
        </button>
      </div>
    </>
  );
};
