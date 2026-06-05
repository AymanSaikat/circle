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
  Bookmark
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

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
  const moreMenuRef = useRef<HTMLDivElement>(null);

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
    return `flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all group select-none cursor-pointer ${
      isActive
        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-md shadow-zinc-900/10 dark:shadow-none font-extrabold'
        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/40'
    }`;
  };

  return (
    <>
      {/* ==================== DESKTOP SIDEBAR NAVIGATION (md and up) ==================== */}
      <aside className="hidden md:flex w-64 flex-col bg-white dark:bg-zinc-950 border-r border-zinc-150 dark:border-zinc-900 text-zinc-900 dark:text-zinc-50 h-screen p-6 sticky top-0 shrink-0 justify-between select-none z-30">
        
        {/* Top Branding & Main Menu List */}
        <div className="flex flex-col gap-10">
          
          {/* Futuristic minimalist line-art logo design */}
          <div className="flex items-center gap-3 px-2 group">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-zinc-900 dark:border-zinc-100 transition-all group-hover:scale-105 duration-300">
              <div className="w-3 h-3 bg-zinc-900 dark:bg-zinc-100 rounded-full animate-pulse" />
              <div className="absolute -inset-0.5 border border-dashed rounded-full border-zinc-400/20 group-hover:animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <div>
              <h1 className="text-sm font-extrabold font-sans tracking-widest text-zinc-900 dark:text-zinc-50 uppercase">
                Circle Media
              </h1>
              <p className="text-[10px] text-zinc-450 dark:text-zinc-500 font-mono tracking-tighter leading-none mt-0.5">SECURE SOCIAL PROTOCOL</p>
            </div>
          </div>

          {/* User ID Card Badge */}
          {profile ? (
            <div className="bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200/65 dark:border-zinc-850 rounded-2xl p-3.5 flex flex-col gap-2.5 hover:shadow-sm transition-all duration-300">
              <div className="flex items-center gap-3">
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 shadow-xs bg-zinc-100 dark:bg-zinc-850"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-xs truncate text-zinc-900 dark:text-zinc-100 tracking-tight">
                    {profile.displayName}
                  </p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono truncate mt-0.5">
                    @{profile.username}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-50 dark:bg-zinc-900/20 p-3 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-wide">Syncing Session...</p>
            </div>
          )}

          {/* Vertically Stacked Navigation Options with ample negative space */}
          <nav className="flex flex-col gap-1.5">
            <button
              id="desktop-nav-home"
              onClick={() => handleTabClick('feed')}
              className={getButtonClasses(currentTab === 'feed' && !selectedTag)}
            >
              <Home className="w-[17px] h-[17px] transition-transform group-hover:scale-105 duration-200" />
              <span>Overview / Home</span>
            </button>

            <button
              id="desktop-nav-search"
              onClick={() => handleTabClick('search')}
              className={getButtonClasses(currentTab === 'search')}
            >
              <Compass className="w-[17px] h-[17px] transition-transform group-hover:rotate-12 duration-200" />
              <span>Discover</span>
            </button>

            <button
              id="desktop-nav-messages"
              onClick={() => handleTabClick('messages')}
              className={`${getButtonClasses(currentTab === 'messages')} relative`}
            >
              <MessageSquare className="w-[17px] h-[17px] transition-transform group-hover:scale-105 duration-200" />
              <div className="flex-1 flex items-center justify-between">
                <span>Messages / Inbox</span>
                {/* Dynamic vibrant red notification badge */}
                <div className="bg-red-500 dark:bg-red-600 text-white font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded-full leading-none flex items-center justify-center animate-pulse shadow-xs">
                  4
                </div>
              </div>
            </button>

            <button
              id="desktop-nav-private"
              onClick={() => handleTabClick('private')}
              className={getButtonClasses(currentTab === 'private')}
            >
              <Lock className="w-[17px] h-[17px] transition-transform group-hover:-translate-y-0.5 duration-200" />
              <span>Private Notes</span>
            </button>

            <button
              id="desktop-nav-bookmarks"
              onClick={() => handleTabClick('bookmarks')}
              className={getButtonClasses(currentTab === 'bookmarks')}
            >
              <Bookmark className="w-[17px] h-[17px] transition-transform group-hover:scale-105 duration-200" />
              <span>Bookmarks</span>
            </button>

            <button
              id="desktop-nav-profile"
              onClick={() => handleTabClick('profile')}
              className={getButtonClasses(currentTab === 'profile')}
            >
              <User className="w-[17px] h-[17px] transition-transform group-hover:scale-105 duration-200" />
              <span>My Profile</span>
            </button>

            {/* Custom Settings component tab triggers modal setup */}
            <button
              id="desktop-nav-settings"
              onClick={onOpenProfileSetup}
              className={getButtonClasses(false)}
            >
              <Settings className="w-[17px] h-[17px] transition-transform group-hover:rotate-45 duration-300" />
              <span>Settings</span>
            </button>

            {/* Active Hashtag selection filter bubble details */}
            {selectedTag && (
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[11px] font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 mt-2.5 animate-fade-in">
                <Hash className="w-3.5 h-3.5 text-zinc-500 animate-pulse" />
                <span className="truncate max-w-[110px]">#{selectedTag}</span>
                <button 
                  id="btn-clear-hashtag-filter-sidebar"
                  onClick={() => setSelectedTag(null)}
                  className="ml-auto text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all text-xs"
                >
                  ✕
                </button>
              </div>
            )}
          </nav>
        </div>

        {/* Bottom Section - isolated with ample negative space */}
        <div className="relative pt-6 border-t border-zinc-150 dark:border-zinc-900">
          
          {/* Embedded "More" Menu Dropdown Popover */}
          {showMoreMenu && (
            <div 
              ref={moreMenuRef}
              className="absolute bottom-16 left-0 w-full bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-3 shadow-xl flex flex-col gap-1 z-40 animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <div className="px-2.5 py-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono tracking-wider font-bold">UTILITIES</div>
              
              <button
                id="btn-more-theme-trigger"
                onClick={() => {
                  toggleTheme();
                  setShowMoreMenu(false);
                }}
                className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-xl transition-all cursor-pointer"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>Light Aesthetics</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-indigo-500" />
                    <span>Dark Aesthetics</span>
                  </>
                )}
              </button>

              <button
                id="btn-more-meta-trigger"
                onClick={() => {
                  alert("Protocol version 1.0.5 - Secure peer P2P social client. Powered by Firestore.");
                  setShowMoreMenu(false);
                }}
                className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-xl transition-all cursor-pointer"
              >
                <Info className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                <span>System Manifest Info</span>
              </button>

              <button
                id="btn-more-help-trigger"
                onClick={() => {
                  alert("Need help? Access the peer nodes repository or compose custom private notes.");
                  setShowMoreMenu(false);
                }}
                className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-xl transition-all cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                <span>Documentation / Help</span>
              </button>
            </div>
          )}

          {/* Primary Action Buttons */}
          <div className="flex flex-col gap-1.5">
            <button
              id="sidebar-btn-more-toggle"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-105 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/40 transition-all select-none cursor-pointer"
            >
              <MoreHorizontal className="w-[17px] h-[17px]" />
              <span>More Settings</span>
            </button>

            <button
              id="sidebar-btn-logout"
              onClick={logOut}
              className="flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all select-none cursor-pointer"
            >
              <LogOut className="w-[17px] h-[17px]" />
              <span>Secure Log Out</span>
            </button>
          </div>
        </div>
      </aside>


      {/* ==================== SCREEN HEADER FOR MOBILE VIEW ==================== */}
      <header className="flex md:hidden items-center justify-between bg-white dark:bg-zinc-950 border-b border-zinc-150 dark:border-zinc-900 px-4 py-3 sticky top-0 z-20 select-none">
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
            className="p-1.5 rounded-lg text-zinc-400 focus:outline-none cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-zinc-650" />}
          </button>
          
          {/* Settings Trigger for Mobile */}
          <button
            id="mobile-header-settings"
            onClick={onOpenProfileSetup}
            className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>


      {/* ==================== BOTTOM TAB BAR NAVIGATION NAVIGATION (Mobile Only) ==================== */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-900 px-2 py-1.5 flex items-center justify-around z-30 select-none pb-safe-bottom">
        
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
        >
          <MessageSquare className="w-5 h-5" />
          {/* Dynamic dynamic tiny notification dot on mobile */}
          <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
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

      {/* Helper padding offset spacer for mobile screens so that bottom nav content does not cover articles */}
      <div className="md:hidden h-16 w-full select-none shrink-0" />
    </>
  );
};
