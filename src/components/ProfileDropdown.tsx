import React, { useState, useRef, useEffect } from 'react';
import { 
 User, 
 Settings, 
 LogOut, 
 MoreHorizontal, 
 Sun, 
 Moon, 
 Check, 
 Copy,
 Edit2,
 ShieldCheck,
 Terminal
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileDropdownProps {
 onOpenProfileSetup: () => void;
 onNavigateToTab?: (tab: string) => void;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ 
 onOpenProfileSetup,
 onNavigateToTab 
}) => {
 const { profile, logOut } = useAuth();
 const { theme, toggleTheme } = useTheme();
 const [isOpen, setIsOpen] = useState(false);
 const [copiedLink, setCopiedLink] = useState(false);
 const dropdownRef = useRef<HTMLDivElement>(null);

 // Close dropdown when clicking outside
 useEffect(() => {
 const handleClickOutside = (event: MouseEvent) => {
 if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
 setIsOpen(false);
 }
 };
 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 if (!profile) {
 return (
 <div className="bg-zinc-50 dark:bg-zinc-900/20 p-3 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center select-none">
 <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-wide animate-pulse">
 Syncing Identity...
 </p>
 </div>
 );
 }

 const handleCopyProfileLink = (e: React.MouseEvent) => {
 e.stopPropagation();
 const profileUrl = `${window.location.origin}/${profile.username}`;
 navigator.clipboard.writeText(profileUrl).then(() => {
 setCopiedLink(true);
 setTimeout(() => setCopiedLink(false), 2000);
 }).catch(() => {
 setCopiedLink(true);
 setTimeout(() => setCopiedLink(false), 2000);
 });
 };

 const handleAction = (callback?: () => void) => {
 if (callback) callback();
 setIsOpen(false);
 };

 return (
 <div className="relative w-full" ref={dropdownRef}>
 {/* Trigger Button (Centered user profile picture only) */}
 <button
 type="button"
 id="reusable-profile-trigger"
 onClick={() => setIsOpen(!isOpen)}
 className="w-full bg-zinc-50/80 dark:bg-zinc-900/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/80 rounded-2xl p-2.5 flex items-center justify-center hover:shadow-xs active:scale-[0.99] transition-all duration-300 cursor-pointer group select-none"
 >
 <img
 src={profile.avatarUrl}
 alt={profile.displayName}
 className="w-11 h-11 rounded-full object-cover border border-zinc-200/50 dark:border-zinc-800/80 shadow-xs bg-zinc-100 dark:bg-zinc-800 transition-transform group-hover:scale-105 duration-300"
 referrerPolicy="no-referrer"
 />
 </button>

 {/* Popover Menu Grid */}
 <AnimatePresence>
 {isOpen && (
 <motion.div
 initial={{ opacity: 0, y: 8, scale: 0.98 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 8, scale: 0.98 }}
 transition={{ duration: 0.15, ease: 'easeOut' }}
 id="reusable-profile-popover"
 className="absolute bottom-full mb-3 left-0 w-64 bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-3 shadow-2xl flex flex-col gap-3 z-40 select-none text-zinc-900 dark:text-zinc-50"
 >
 {/* Header: Identity Info */}
 <div className="px-2 py-1.5 flex flex-col gap-0.5">
 <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold tracking-wider uppercase block leading-none">
 SIGNED IN AS
 </span>
 <span className="text-[11px] font-black tracking-tight truncate block text-zinc-900 dark:text-zinc-100 mt-1">
 {profile.displayName}
 </span>
 </div>

 {/* Structured Navigation options */}
 <div className="flex flex-col gap-1">
 {/* 1. View Public Profile */}
 {onNavigateToTab && (
 <button
 type="button"
 id="btn-dropdown-view-profile"
 onClick={() => handleAction(() => onNavigateToTab('profile'))}
 className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50/60 dark:hover:bg-zinc-900/60 rounded-xl transition-all cursor-pointer group"
 >
 <User className="w-[15px] h-[15px] text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
 <span>My Public Profile</span>
 </button>
 )}

 {/* 2. Edit Profile Edit trigger */}
 <button
 type="button"
 id="btn-dropdown-edit-profile"
 onClick={() => handleAction(onOpenProfileSetup)}
 className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50/60 dark:hover:bg-zinc-900/60 rounded-xl transition-all cursor-pointer group"
 >
 <Edit2 className="w-[15px] h-[15px] text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
 <span>Edit Profile</span>
 </button>

 {/* 3. Settings Config Trigger */}
 <button
 type="button"
 id="btn-dropdown-settings"
 onClick={() => handleAction(onOpenProfileSetup)} // opens account customizing system setup
 className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50/60 dark:hover:bg-zinc-900/60 rounded-xl transition-all cursor-pointer group"
 >
 <Settings className="w-[15px] h-[15px] text-zinc-400 dark:text-zinc-500 group-hover:rotate-45 duration-300 transition-colors" />
 <span>Settings</span>
 </button>

 {/* 4. Copy URL link metadata alias */}
 <button
 type="button"
 id="btn-dropdown-copy-link"
 onClick={handleCopyProfileLink}
 className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50/60 dark:hover:bg-zinc-900/60 rounded-xl transition-all cursor-pointer group"
 >
 {copiedLink ? (
 <Check className="w-[15px] h-[15px] text-emerald-500 animate-in zoom-in-50" />
 ) : (
 <Copy className="w-[15px] h-[15px] text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
 )}
 <span className={copiedLink ? "text-emerald-500 font-bold" : ""}>
 {copiedLink ? "Address Copied!" : "Copy Public Link"}
 </span>
 </button>

 {/* 5. Theme Settings Toggler */}
 <button
 type="button"
 id="btn-dropdown-theme-toggle"
 onClick={toggleTheme}
 className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50/60 dark:hover:bg-zinc-900/60 rounded-xl transition-all cursor-pointer group"
 >
 {theme === 'dark' ? (
 <>
 <Sun className="w-[15px] h-[15px] text-amber-500 animate-pulse" />
 <span>Light Aesthetics</span>
 </>
 ) : (
 <>
 <Moon className="w-[15px] h-[15px] text-indigo-500 animate-pulse" />
 <span>Dark Aesthetics</span>
 </>
 )}
 </button>
 </div>

 {/* Bottom Actions segment (Logout action) */}
 <div className="flex flex-col gap-1 pt-2">
 <button
 type="button"
 id="btn-dropdown-secure-logout"
 onClick={() => handleAction(logOut)}
 className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 text-xs font-bold text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-350 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer"
 >
 <LogOut className="w-[15px] h-[15px]" />
 <span>Log Out</span>
 </button>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
};
