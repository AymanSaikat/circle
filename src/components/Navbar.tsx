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
  const moreMenuRef = useRef<HTMLDivElement>(null);

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
        </div>        {/* Bottom Section - isolated with ample negative space */}
        <div className="relative pt-6 border-zinc-150 dark:border-zinc-900 flex flex-col gap-4">
          
          {profile ? (
            <button
              id="profile-badge-trigger"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="w-full text-left bg-zinc-50/80 dark:bg-zinc-900/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-900/80 border border-zinc-200/85 dark:border-zinc-850 rounded-2xl p-3 flex items-center justify-between hover:shadow-xs active:scale-98 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-10 h-10 rounded-full object-cover border border-zinc-200/80 dark:border-zinc-850 shadow-xs bg-zinc-100 dark:bg-zinc-850 transition-transform group-hover:scale-105 duration-300"
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
              <MoreHorizontal className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors shrink-0" />
            </button>
          ) : (
            <div className="bg-zinc-50 dark:bg-zinc-900/20 p-3 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-wide">Syncing Session...</p>
            </div>
          )}
          
          {/* Unified Profile Control Center Popover */}
          {showMoreMenu && (
            <div 
              ref={moreMenuRef}
              className="absolute bottom-18 left-0 w-full bg-white dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-850 rounded-2xl p-3 shadow-2xl flex flex-col gap-3 z-40 animate-in fade-in slide-in-from-bottom-3 duration-200 select-none text-zinc-900 dark:text-zinc-50"
            >
              {/* Header inside popover: node identifier */}
              <div className="px-2 py-1.5 border-b border-zinc-100 dark:border-zinc-900 flex flex-col gap-0.5 animate-in fade-in duration-300">
                <span className="text-[9px] text-zinc-450 dark:text-zinc-500 font-mono tracking-widest font-bold uppercase block leading-none">SECURE IDENTITY NODE</span>
                <span className="text-[11px] font-black tracking-tight truncate block text-zinc-900 dark:text-zinc-100 mt-1">{profile?.displayName}</span>
              </div>

              {/* Stack Actions */}
              <div className="flex flex-col gap-1">
                {/* 1. View Public Profile */}
                <button
                  id="btn-profile-menu-view-public"
                  onClick={() => {
                    handleTabClick('profile');
                    setShowMoreMenu(false);
                  }}
                  className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/60 rounded-xl transition-all cursor-pointer group"
                >
                  <User className="w-[15px] h-[15px] text-zinc-400 dark:text-zinc-550 group-hover:text-zinc-900 dark:group-hover:text-white" />
                  <span>My Public Profile</span>
                </button>

                {/* 2. Customize Profile (Settings) */}
                <button
                  id="btn-profile-menu-customize"
                  onClick={() => {
                    onOpenProfileSetup();
                    setShowMoreMenu(false);
                  }}
                  className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/60 rounded-xl transition-all cursor-pointer group"
                >
                  <Settings className="w-[15px] h-[15px] text-zinc-400 dark:text-zinc-550 group-hover:rotate-45 duration-300" />
                  <span>Customize / Edit</span>
                </button>

                {/* 3. Copy Profile Link */}
                <button
                  id="btn-profile-menu-copy-link"
                  onClick={handleCopyLink}
                  className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/60 rounded-xl transition-all cursor-pointer group"
                >
                  {copiedLink ? (
                    <Check className="w-[15px] h-[15px] text-emerald-500 animate-in zoom-in-50" />
                  ) : (
                    <Copy className="w-[15px] h-[15px] text-zinc-400 dark:text-zinc-550 group-hover:text-zinc-900 dark:group-hover:text-white" />
                  )}
                  <span className={copiedLink ? "text-emerald-500 font-bold" : ""}>
                    {copiedLink ? "Address Copied!" : "Copy Active Link"}
                  </span>
                </button>

                {/* 4. Appearance Toggle */}
                <button
                  id="btn-profile-menu-theme"
                  onClick={() => {
                    toggleTheme();
                  }}
                  className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/60 rounded-xl transition-all cursor-pointer group"
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun className="w-[15px] h-[15px] text-amber-500 animate-pulse" />
                      <span>Light Aesthetics</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-[15px] h-[15px] text-indigo-505 animate-pulse" />
                      <span>Dark Aesthetics</span>
                    </>
                  )}
                </button>
              </div>

              {/* Protocol Diagnostics / Connection Area */}
              <div className="p-2.5 bg-zinc-50/80 dark:bg-zinc-900/40 rounded-xl border border-zinc-150 dark:border-zinc-900/80 flex flex-col gap-1 text-[9px] font-mono select-none">
                <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500">
                  <span>Node Protocol</span>
                  <span className="text-[#1877f2] font-black">v1.0.5</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500">
                  <span>Connection</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-zinc-700 dark:text-zinc-350 font-bold">Synchronized</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500">
                  <span>Channel Crypt</span>
                  <span className="text-zinc-700 dark:text-zinc-350 font-bold">AES-GCM E2EE</span>
                </div>
              </div>

              {/* Diagnostic logs warning/exit */}
              <div className="flex flex-col gap-1 border-t border-zinc-100 dark:border-zinc-900 pt-2">
                <button
                  id="btn-profile-menu-logout"
                  onClick={logOut}
                  className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 text-xs font-bold text-red-500 dark:text-red-400 hover:text-red-650 dark:hover:text-red-350 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer"
                >
                  <LogOut className="w-[15px] h-[15px]" />
                  <span>Secure Log Out</span>
                </button>
              </div>

            </div>
          )}
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
    </>
  );
};
