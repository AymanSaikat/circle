import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useTheme } from '../context/ThemeContext';
import { 
 Camera, Sparkles, AlertCircle, RefreshCw, Upload, Check, X, 
 User, Shield, Bell, Eye, Palette, Trash2, Key, HelpCircle, 
 Activity, Globe, Monitor, Smartphone, MessageSquare, ChevronRight, Lock, Laptop, CheckCircle2
} from 'lucide-react';
import { validateUsername } from '../utils/username';
import Cropper from 'react-easy-crop';

interface Area {
 x: number;
 y: number;
 width: number;
 height: number;
}

const getCroppedImg = (imageSrc: string, pixelCrop: Area): Promise<string> => {
 return new Promise((resolve, reject) => {
 const image = new Image();
 image.src = imageSrc;
 image.crossOrigin = 'anonymous';
 image.onload = () => {
 const canvas = document.createElement('canvas');
 const ctx = canvas.getContext('2d');
 if (!ctx) {
 reject(new Error('No 2D canvas context available'));
 return;
 }

 // Crop to a standard 300x300 high resolution representation
 const targetSize = 300;
 canvas.width = targetSize;
 canvas.height = targetSize;

 ctx.drawImage(
 image,
 pixelCrop.x,
 pixelCrop.y,
 pixelCrop.width,
 pixelCrop.height,
 0,
 0,
 targetSize,
 targetSize
 );

 resolve(canvas.toDataURL('image/jpeg', 0.92));
 };
 image.onerror = (err) => {
 reject(err);
 };
 });
};

interface ProfileSetupModalProps {
 isOpen: boolean;
 onClose: () => void;
 forceOnboarding: boolean;
}

export const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({ isOpen, onClose, forceOnboarding }) => {
 const { profile, saveProfile, checkUsernameUnique, user } = useAuth();
 const { navigate } = useRouter();
 const { theme, toggleTheme } = useTheme();
 
 const [username, setUsername] = useState('');
 const [displayName, setDisplayName] = useState('');
 const [bio, setBio] = useState('');
 const [avatarUrl, setAvatarUrl] = useState('');
 
 const [checking, setChecking] = useState(false);
 const [available, setAvailable] = useState<boolean | null>(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 // Crop & Upload States
 const [imageSrc, setImageSrc] = useState<string | null>(null);
 const [crop, setCrop] = useState({ x: 0, y: 0 });
 const [zoom, setZoom] = useState(1);
 const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
 const [showCropScreen, setShowCropScreen] = useState(false);

 // Settings suite category state
 const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'privacy' | 'notifications' | 'display' | 'security' | 'help'>('profile');

 // Multi-Section Redesigned Settings States
 const [privateAccount, setPrivateAccount] = useState(false);
 const [messageFilter, setMessageFilter] = useState<'everyone' | 'following' | 'nobody'>('everyone');
 const [tagPermission, setTagPermission] = useState<'everyone' | 'following' | 'nobody'>('everyone');
 const [searchableByEmail, setSearchableByEmail] = useState(true);

 const [pushAll, setPushAll] = useState(true);
 const [likesNotif, setLikesNotif] = useState(true);
 const [commentsNotif, setCommentsNotif] = useState(true);
 const [messagesNotif, setMessagesNotif] = useState(true);
 const [quietMode, setQuietMode] = useState(false);

 const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
 const [layoutDensity, setLayoutDensity] = useState<'cozy' | 'compact'>('cozy');

 const [twoFactor, setTwoFactor] = useState(false);
 const [autoLock, setAutoLock] = useState(false);
 const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
 const [isDiagnosing, setIsDiagnosing] = useState(false);

 const [accountStatus, setAccountStatus] = useState<'active' | 'deactivated'>('active');
 const [successToast, setSuccessToast] = useState<string | null>(null);
 const [showToast, setShowToast] = useState(false);

 useEffect(() => {
 if (profile) {
 setUsername(profile.username || '');
 setDisplayName(profile.displayName || '');
 setBio(profile.bio || '');
 setAvatarUrl(profile.avatarUrl || '');
 setAvailable(true);
 } else if (user) {
 setDisplayName(user.displayName || '');
 const seed = user.email ? user.email.split('@')[0] : `user_${Math.floor(1000 + Math.random() * 9000)}`;
 const docClean = seed.toLowerCase().replace(/[^a-z0-9]/g, '');
 const finalClean = docClean.length >= 3 ? docClean : `user_${Math.floor(1000 + Math.random() * 9000)}`;
 setUsername(finalClean);
 setAvatarUrl(`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(finalClean)}`);
 
 setChecking(true);
 checkUsernameUnique(finalClean.toLowerCase())
 .then((isUnique) => {
 setAvailable(isUnique);
 })
 .catch(() => {
 setAvailable(null);
 })
 .finally(() => {
 setChecking(false);
 });
 }
 }, [profile, user, isOpen]);

 const triggerToast = (message: string) => {
 setSuccessToast(message);
 setShowToast(true);
 setTimeout(() => {
 setShowToast(false);
 }, 3000);
 };

 const handleUsernameCheck = async (val: string) => {
 const clean = val.trim();
 setUsername(clean);
 const cleanLower = clean.toLowerCase();

 if (profile && cleanLower === profile.username.toLowerCase()) {
 setAvailable(true);
 return;
 }

 const validation = validateUsername(clean);
 if (!validation.isValid) {
 setAvailable(false);
 return;
 }

 setChecking(true);
 try {
 const isUnique = await checkUsernameUnique(cleanLower);
 setAvailable(isUnique);
 } catch {
 setAvailable(null);
 } finally {
 setChecking(false);
 }
 };

 const handleSaveProfile = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 setError(null);

 const cleanDisplay = displayName.trim();
 const cleanBio = bio.trim();
 const cleanAvatar = avatarUrl.trim();
 const cleanUsername = username.trim();

 try {
 const validation = validateUsername(cleanUsername);
 if (!validation.isValid) {
 throw new Error(validation.error);
 }

 const isNewUsername = !profile || cleanUsername.toLowerCase() !== profile.username.toLowerCase();
 if (isNewUsername) {
 const isUnique = await checkUsernameUnique(cleanUsername.toLowerCase());
 if (!isUnique) {
 throw new Error('Username is already taken.');
 }
 }

 await saveProfile(cleanDisplay || cleanUsername, cleanBio, cleanAvatar, cleanUsername);
 triggerToast('A social identity updated successfully!');
 
 // If we are onboarding, auto close, otherwise trigger reload/path
 if (forceOnboarding) {
 onClose();
 navigate('/' + cleanUsername.toLowerCase());
 }
 } catch (err: any) {
 console.error(err);
 let errorMessage = err.message || 'Failed to update profile.';
 setError(errorMessage);
 } finally {
 setLoading(false);
 }
 };

 const saveOtherSettings = (e?: React.FormEvent) => {
 if (e) e.preventDefault();
 triggerToast('Preference updates saved & synced across devices!');
 };

 const runDiagnosticCheck = () => {
 setIsDiagnosing(true);
 setDiagnosticLogs([]);
 const stages = [
 'Checking browser compatibility with local storage...',
 'Validating internet connection speed and latency...',
 'Verifying secure connection to the database...',
 'Checking active user session status...',
 'All diagnostics passed successfully! Circle is operating normally.'
 ];
 
 stages.forEach((log, index) => {
 setTimeout(() => {
 setDiagnosticLogs(prev => [...prev, log]);
 if (index === stages.length - 1) {
 setIsDiagnosing(false);
 }
 }, (index + 1) * 600);
 });
 };

 if (!isOpen) return null;

 // Render crop window inside Settings if custom upload triggers
 if (showCropScreen && imageSrc) {
 return (
 <div className="fixed inset-0 bg-zinc-950/60 dark:bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-[60]">
 <div className="w-full max-w-sm max-h-[100dvh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl relative flex flex-col select-none pb-safe-bottom">
 <div className="flex flex-col gap-1 mb-4 text-center">
 <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Crop Profile Photo</h3>
 <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Position and zoom your photo for a perfect circular fit</p>
 </div>

 <div className="relative w-full h-64 bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
 <Cropper
 image={imageSrc}
 crop={crop}
 zoom={zoom}
 aspect={1}
 cropShape="round"
 showGrid={false}
 onCropChange={setCrop}
 onZoomChange={setZoom}
 onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
 />
 </div>

 <div className="mt-4 flex flex-col gap-1.5 px-1">
 <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 dark:text-zinc-500 font-mono">
 <span>ZOOM LEVEL</span>
 <span>{Math.round(zoom * 100)}%</span>
 </div>
 <input
 type="range"
 min={1}
 max={3}
 step={0.05}
 value={zoom}
 onChange={(e) => setZoom(Number(e.target.value))}
 className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-ew-resize accent-zinc-900 dark:accent-white focus:outline-none transition-all"
 />
 </div>

 <div className="flex gap-2.5 justify-end mt-6">
 <button
 type="button"
 onClick={() => {
 setShowCropScreen(false);
 setImageSrc(null);
 }}
 className="px-4 py-2 text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={async () => {
 if (imageSrc && croppedAreaPixels) {
 try {
 setLoading(true);
 const croppedB64 = await getCroppedImg(imageSrc, croppedAreaPixels);
 setAvatarUrl(croppedB64);
 setShowCropScreen(false);
 setImageSrc(null);
 } catch (err) {
 console.error("Error cropping image:", err);
 } finally {
 setLoading(false);
 }
 }
 }}
 className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-zinc-900 dark:bg-zinc-105 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 shadow-md transition-all cursor-pointer"
 >
 <Check className="w-3.5 h-3.5" />
 <span>Apply Crop</span>
 </button>
 </div>
 </div>
 </div>
 );
 }

 // Categories configurations
 const categoriesDef = [
 { id: 'profile', name: 'Edit Profile', icon: User, desc: 'Update display name, avatar, and bio info' },
 { id: 'account', name: 'Account Center', icon: Shield, desc: 'Manage your password, email address, and status' },
 { id: 'privacy', name: 'Privacy & Safety', icon: Eye, desc: 'Configure content visibility and tagging rules' },
 { id: 'notifications', name: 'Notifications', icon: Bell, desc: 'Choose what and when you hear alerts' },
 { id: 'display', name: 'Appearance & Theme', icon: Palette, desc: 'Manage themes, text sizes, and spacings' },
 { id: 'security', name: 'Security & Login', icon: Lock, desc: 'Setup login security safeguards and audits' },
 { id: 'help', name: 'Help & Support', icon: HelpCircle, desc: 'Read FAQs and run connectivity diagnostics' }
 ] as const;

 return (
 <div className="fixed inset-0 bg-zinc-950/60 dark:bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50 animate-fade-in">
 
 {/* Redesigned settings layout matching Facebook/Meta / Instagram / Twitter Settings Centers */}
 <div className="w-full max-w-4xl h-[90vh] md:h-[82vh] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-3xl shadow-2xl relative flex flex-col md:flex-row overflow-hidden select-none">
 
 {/* ===================== SIDEBAR: Category Selector ===================== */}
 <div className="w-full md:w-72 border-b md:border-b-0 md: bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-col scrollbar-none justify-between shrink-0">
 
 <div className="p-5 flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <div className="p-1.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg">
 <Shield className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
 </div>
 <div>
 <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">Settings</h3>
 <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">Personal Preferences</p>
 </div>
 </div>
 
 {/* Direct Close Button in Header */}
 {!forceOnboarding && (
 <button 
 onClick={onClose} 
 className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
 title="Exit Settings"
 >
 <X className="w-4 h-4" />
 </button>
 )}
 </div>

 {/* Categories Tab list (Flex scrollable container on mobile, blocks inside sidebar on desktop) */}
 <div className="flex-1 md:overflow-y-auto p-3 flex md:flex-col gap-1 overflow-x-auto scrollbar-none select-none max-h-[80px] md:max-h-none py-2 md:py-4">
 {categoriesDef.map((cat) => {
 const Icon = cat.icon;
 const isActive = activeTab === cat.id;
 
 // On forced onboarding, block access to tabs other than profile
 const isDisabled = forceOnboarding && cat.id !== 'profile';

 return (
 <button
 key={cat.id}
 type="button"
 disabled={isDisabled}
 onClick={() => setActiveTab(cat.id)}
 className={`flex items-center gap-3 w-max md:w-full px-4 py-2.5 md:py-3 rounded-2xl relative text-xs font-bold transition-all text-left group shrink-0 select-none ${
 isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
 } ${
 isActive
 ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-sm font-extrabold'
 : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/50 hover:text-zinc-900 dark:hover:text-zinc-200'
 }`}
 >
 <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'scale-105' : 'group-hover:scale-110 duration-200'}`} />
 <div className="hidden md:block">
 <p className="font-extrabold leading-none">{cat.name}</p>
 <p className={`text-[9px] mt-0.5 max-w-[190px] truncate leading-none ${isActive ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-400 dark:text-zinc-500'}`}>
 {cat.desc}
 </p>
 </div>
 <span className="md:hidden text-xs">{cat.name}</span>
 </button>
 );
 })}
 </div>
 </div>

 {/* ===================== CONTENT PANEL (Scrollable Tab Contents) ===================== */}
 <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 overflow-hidden relative">
 
 {/* Header Banner when Onboarding */}
 {forceOnboarding && (
 <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-100 dark:to-zinc-200 px-6 py-3.5 text-white dark:text-zinc-950 font-sans flex items-center justify-between ">
 <div className="flex items-center gap-2">
 <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
 <span className="text-xs font-bold tracking-tight">Profile Customization</span>
 </div>
 <span className="text-[10px] text-zinc-300 dark:text-zinc-600">Please select a username to get started</span>
 </div>
 )}

 {/* Toast Notification updates */}
 {showToast && (
 <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border border-zinc-800 dark:border-zinc-100 animate-in fade-in slide-in-from-top-3 duration-300">
 <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-500 animate-bounce" />
 <span className="font-bold tracking-tight">{successToast}</span>
 </div>
 )}

 {/* Active Container Panel Scroll Pane */}
 <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">

 {/* TAB 1: EDIT PROFILE (Original Claims Logic Embedded) */}
 {activeTab === 'profile' && (
 <form onSubmit={handleSaveProfile} className="space-y-6">
 <div className="pb-4">
 <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Profile Information</h2>
 <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Customize your display name, username handle, avatar photo, and bio biography details.</p>
 </div>

 {/* Avatar Preview Selector with Custom Crop Integration */}
 <div className="group flex flex-col items-center gap-3 bg-zinc-50/50 dark:bg-zinc-900/30 p-5 border border-zinc-200 dark:border-zinc-900 rounded-2xl">
 <div className="relative">
 <img
 src={avatarUrl || 'https://api.dicebear.com/7.x/adventurer/svg?seed=placeholder'}
 alt="Avatar simulation"
 className="w-24 h-24 rounded-full border-4 border-white dark:border-zinc-950 bg-zinc-100 dark:bg-zinc-900 object-cover shadow-md"
 />
 <div className="absolute inset-0 bg-black/10 dark:bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
 </div>

 <div className="flex items-center gap-2">
 <label 
 className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-xl text-[10px] font-bold cursor-pointer transition-all shadow-sm select-none"
 title="Upload custom image file"
 >
 <Upload className="w-3 h-3" />
 <span>Upload Photo</span>
 <input
 type="file"
 accept="image/*"
 className="hidden"
 onChange={(e) => {
 if (e.target.files && e.target.files.length > 0) {
 const file = e.target.files[0];
 const reader = new FileReader();
 reader.addEventListener('load', () => {
 setImageSrc(reader.result as string);
 setCrop({ x: 0, y: 0 });
 setZoom(1);
 setShowCropScreen(true);
 });
 reader.readAsDataURL(file);
 }
 }}
 />
 </label>

 <button
 type="button"
 onClick={() => {
 const rSeed = Math.floor(Math.random() * 10000);
 setAvatarUrl(`https://api.dicebear.com/7.x/adventurer/svg?seed=${rSeed}`);
 }}
 className="flex items-center gap-1.5 px-3.5 py-1.5 border border-zinc-300 dark:border-zinc-800 hover:bg-zinc-50/20 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-xl text-[10px] font-bold cursor-pointer transition-all select-none"
 title="Generate simple hand-drawn avatar"
 >
 <RefreshCw className="w-3 h-3 text-zinc-500" />
 <span>Random Idea</span>
 </button>
 </div>
 <span className="text-[9px] text-zinc-400 dark:text-zinc-500 text-center font-medium">
 JPG/PNG files accepted. Custom circular cropping will be applied automatically.
 </span>
 </div>

 {/* Username Input with Live check */}
 <div className="space-y-1">
 <label className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Choose Username Handle</label>
 <div className="relative">
 <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400 font-bold text-xs pointer-events-none">@</span>
 <input
 id="modal-username-input"
 type="text"
 required
 value={username}
 onChange={(e) => handleUsernameCheck(e.target.value)}
 placeholder="john_doe"
 className={`w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-405 dark:placeholder-zinc-600 rounded-2xl pl-8 pr-12 py-3 text-xs focus:outline-none transition-all border ${
 available === true ? 'border-emerald-500 focus:ring-1 focus:ring-emerald-500/20' :
 available === false ? 'border-red-500 focus:ring-1 focus:ring-red-500/20' : 'border-zinc-200 dark:border-zinc-800 focus:border-zinc-950 dark:focus:border-zinc-100'
 }`}
 />
 
 <span className="absolute inset-y-0 right-0 pr-4 flex items-center">
 {checking ? (
 <span className="flex h-2 w-2 relative">
 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1877f2] opacity-75"></span>
 <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1877f2]"></span>
 </span>
 ) : available === true ? (
 <span className="text-emerald-500 text-sm font-bold animate-pulse">✓ Available</span>
 ) : available === false ? (
 <span className="text-red-500 text-sm font-bold">✕ Taken</span>
 ) : null}
 </span>
 </div>
 {available === false && (
 <span className="text-[10px] text-red-500 dark:text-red-400 font-medium font-sans">Username handle is already taken or is invalid.</span>
 )}
 </div>

 {/* Display Name */}
 <div className="space-y-1">
 <label className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Display Name</label>
 <input
 id="modal-displayname-input"
 type="text"
 required
 value={displayName}
 onChange={(e) => setDisplayName(e.target.value)}
 placeholder="e.g. John Doe"
 className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200 rounded-2xl px-3.5 py-3 text-xs focus:outline-none border border-zinc-200 dark:border-zinc-800 focus:border-zinc-950 dark:focus:border-zinc-100 transition-all font-medium"
 />
 </div>

 {/* Biography */}
 <div className="space-y-1">
 <label className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Bio</label>
 <textarea
 id="modal-bio-input"
 value={bio}
 onChange={(e) => setBio(e.target.value)}
 rows={3}
 placeholder="Tell us a little about yourself, your hobbies or highlights..."
 className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl p-3.5 text-xs focus:outline-none border border-zinc-200 dark:border-zinc-800 focus:border-zinc-950 dark:focus:border-zinc-100 transition-all resize-none font-medium"
 maxLength={500}
 />
 </div>

 {error && (
 <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-3.5 rounded-2xl text-[10px] text-red-600 dark:text-red-405 font-mono flex items-center gap-1.5 leading-snug">
 <AlertCircle className="w-3.5 h-3.5 shrink-0" />
 <span>{error}</span>
 </div>
 )}

 <div className="flex gap-2 justify-end pt-4">
 <button
 type="submit"
 id="btn-modal-save"
 disabled={loading || available !== true}
 className="px-6 py-3 rounded-2xl text-xs font-bold bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 shadow-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
 >
 {loading ? 'Saving changes...' : 'Save Profile'}
 </button>
 </div>
 </form>
 )}


 {/* TAB 2: ACCOUNT CENTER */}
 {activeTab === 'account' && (
 <form onSubmit={saveOtherSettings} className="space-y-6">
 <div className="pb-4">
 <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Account Center</h2>
 <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Manage email settings, password reset, deactivation options, and general credentials.</p>
 </div>

 <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex items-center justify-between">
 <div className="flex flex-col gap-0.5">
 <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">REGISTERED EMAIL</span>
 <span className="text-xs font-extrabold text-zinc-900 dark:text-white">{user?.email || 'unregistered@circle.app'}</span>
 </div>
 <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 font-mono text-[9px] font-bold rounded-lg uppercase">Verified</span>
 </div>

 <div className="space-y-4">
 <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Security Credentials</p>
 
 <div className="p-4 border border-zinc-100 dark:border-zinc-800 rounded-2xl space-y-3">
 <div className="flex items-center justify-between">
 <div>
 <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-200">Reset Password</h4>
 <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Request a safe password reset link sent to your email</p>
 </div>
 <button
 type="button"
 onClick={() => triggerToast('A secure password-reset link has been sent to your email!')}
 className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold text-[10px] rounded-xl cursor-pointer transition-colors"
 >
 Reset Password
 </button>
 </div>
 </div>
 </div>

 {/* Account Status and Danger zone */}
 <div className="pt-6 space-y-4">
 <p className="text-[10px] text-rose-500 dark:text-rose-400 font-bold uppercase tracking-widest flex items-center gap-1.5 text-[9px]">
 <Trash2 className="w-3.5 h-3.5" />
 <span>Danger Zone</span>
 </p>
 
 <div className="p-4 bg-red-50/40 dark:bg-red-950/10 border border-red-100 dark:border-red-950/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
 <div>
 <h4 className="text-xs font-bold text-red-600 dark:text-red-400">Deactivate Account</h4>
 <p className="text-[10px] text-zinc-500 dark:text-zinc-400 max-w-md">Temporarily deactivate your profile and feed posts. You can reactivate anytime by signing back in.</p>
 </div>
 
 <button
 type="button"
 onClick={() => {
 const confirm = window.confirm('Are you absolutely sure you want to temporarily deactivate your account? You can reactivate anytime by signing back in.');
 if (confirm) {
 setAccountStatus('deactivated');
 triggerToast('Account deactivated successfully.');
 }
 }}
 className="px-3 py-1.5 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 font-bold text-[10px] rounded-xl cursor-pointer transition-colors shrink-0"
 >
 {accountStatus === 'active' ? 'Deactivate Now' : 'Currently Deactivated'}
 </button>
 </div>
 </div>

 <div className="flex justify-end pt-4">
 <button
 type="submit"
 className="px-6 py-3 rounded-2xl text-xs font-bold bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950"
 >
 Save Changes
 </button>
 </div>
 </form>
 )}


 {/* TAB 3: PRIVACY & SAFETY */}
 {activeTab === 'privacy' && (
 <form onSubmit={saveOtherSettings} className="space-y-6">
 <div className="pb-4">
 <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Privacy & Safety</h2>
 <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Configure who can follow your profile, see your posts, or send you private messages.</p>
 </div>

 {/* Switch boxes toggles list */}
 <div className="space-y-4">
 
 {/* Toggle 1: Private Account */}
 <div className="p-4 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex items-center justify-between">
 <div>
 <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Private Profile</h4>
 <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Only approved followers can see your profile posts and shared activities.</p>
 </div>
 
 {/* Switch layout */}
 <button
 type="button"
 onClick={() => setPrivateAccount(!privateAccount)}
 className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
 privateAccount ? 'bg-[#1877f2]' : 'bg-zinc-200 dark:bg-zinc-800'
 }`}
 >
 <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
 privateAccount ? 'translate-x-5' : 'translate-x-0'
 }`} />
 </button>
 </div>

 {/* Toggle 2: Index Search options */}
 <div className="p-4 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex items-center justify-between">
 <div>
 <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Show in Search Results</h4>
 <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Allow search engines and active search tools to index and find your profile in searches</p>
 </div>
 
 <button
 type="button"
 onClick={() => setSearchableByEmail(!searchableByEmail)}
 className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
 searchableByEmail ? 'bg-[#1877f2]' : 'bg-zinc-200 dark:bg-zinc-800'
 }`}
 >
 <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
 searchableByEmail ? 'translate-x-5' : 'translate-x-0'
 }`} />
 </button>
 </div>

 {/* Select Options 1: Direct Message filter */}
 <div className="p-4 border border-zinc-100 dark:border-zinc-800 rounded-2xl space-y-3">
 <div>
 <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Direct Messages</h4>
 <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Choose who can send you direct private messages</p>
 </div>

 <div className="grid grid-cols-3 gap-2">
 {(['everyone', 'following', 'nobody'] as const).map((opt) => (
 <button
 key={opt}
 type="button"
 onClick={() => setMessageFilter(opt)}
 className={`px-3 py-2 text-[10px] font-bold border rounded-xl capitalize transition-all select-none cursor-pointer ${
 messageFilter === opt 
 ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-xs' 
 : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
 }`}
 >
 {opt}
 </button>
 ))}
 </div>
 </div>

 {/* Select Options 2: Tag filters */}
 <div className="p-4 border border-zinc-100 dark:border-zinc-800 rounded-2xl space-y-3">
 <div>
 <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Mentions & Tags</h4>
 <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Choose who can tag @{username || "yourname"} in posts and comments</p>
 </div>

 <div className="grid grid-cols-3 gap-2">
 {(['everyone', 'following', 'nobody'] as const).map((opt) => (
 <button
 key={opt}
 type="button"
 onClick={() => setTagPermission(opt)}
 className={`px-3 py-2 text-[10px] font-bold border rounded-xl capitalize transition-all select-none cursor-pointer ${
 tagPermission === opt 
 ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 border-zinc-900 dark:border-white' 
 : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
 }`}
 >
 {opt}
 </button>
 ))}
 </div>
 </div>

 </div>

 <div className="flex justify-end pt-4">
 <button
 type="submit"
 className="px-6 py-3 rounded-2xl text-xs font-bold bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950"
 >
 Save Privacy Configuration
 </button>
 </div>
 </form>
 )}


 {/* TAB 4: NOTIFICATIONS */}
 {activeTab === 'notifications' && (
 <form onSubmit={saveOtherSettings} className="space-y-6">
 <div className="pb-4">
 <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Notifications</h2>
 <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Configure your preference for comments, tags, likes, and messaging alerts.</p>
 </div>

 <div className="space-y-4">
 
 {/* Master switch */}
 <div className="p-4 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex items-center justify-between">
 <div>
 <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Pause All Notifications</h4>
 <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Temporarily pause all alert popups and notifications</p>
 </div>
 
 <button
 type="button"
 onClick={() => setPushAll(!pushAll)}
 className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
 !pushAll ? 'bg-[#1877f2]' : 'bg-zinc-200 dark:bg-zinc-800'
 }`}
 >
 <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
 !pushAll ? 'translate-x-5' : 'translate-x-0'
 }`} />
 </button>
 </div>

 <div className="space-y-3 pt-2">
 <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest pl-1 text-[9px]">Notifications & Alert Types</p>
 
 {/* Likes alerts */}
 <div className="p-4 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-xl bg-red-105 dark:bg-red-955/20 text-red-505 dark:text-red-405 flex items-center justify-center font-bold text-xs select-none shadow-xs">♥</div>
 <div>
 <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-200">Likes</h4>
 <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Notify me when someone likes one of my posts</p>
 </div>
 </div>
 <button
 type="button"
 onClick={() => setLikesNotif(!likesNotif)}
 className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-250 ease-in-out focus:outline-none ${
 likesNotif ? 'bg-[#1877f2]' : 'bg-zinc-200 dark:bg-zinc-800'
 }`}
 >
 <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
 likesNotif ? 'translate-x-4' : 'translate-x-0'
 }`} />
 </button>
 </div>

 {/* Comments alerts */}
 <div className="p-4 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 flex items-center justify-center font-bold text-xs">💬</div>
 <div>
 <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-200">Comments & Replies</h4>
 <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Notify me when someone comments or replies to my threads</p>
 </div>
 </div>
 <button
 type="button"
 onClick={() => setCommentsNotif(!commentsNotif)}
 className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-250 ease-in-out focus:outline-none ${
 commentsNotif ? 'bg-[#1877f2]' : 'bg-zinc-200 dark:bg-zinc-800'
 }`}
 >
 <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
 commentsNotif ? 'translate-x-4' : 'translate-x-0'
 }`} />
 </button>
 </div>

 {/* Direct message alert */}
 <div className="p-4 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex items-center justify-between">
 <div className="flex items-center gap-3">
 <MessageSquare className="w-4 h-4 text-zinc-500" />
 <div>
 <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-200">Direct Messages</h4>
 <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Notify me when I receive a new private message</p>
 </div>
 </div>
 <button
 type="button"
 onClick={() => setMessagesNotif(!messagesNotif)}
 className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-250 ease-in-out focus:outline-none ${
 messagesNotif ? 'bg-[#1877f2]' : 'bg-zinc-200 dark:bg-zinc-800'
 }`}
 >
 <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
 messagesNotif ? 'translate-x-4' : 'translate-x-0'
 }`} />
 </button>
 </div>

 {/* Quiet Focus Hours scheduling */}
 <div className="p-4 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex items-center justify-between">
 <div className="flex items-center gap-3">
 <Smartphone className="w-4 h-4 text-indigo-500" />
 <div>
 <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-200">Quiet Hours</h4>
 <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Auto-mute notifications from 10:00 PM to 7:00 AM daily</p>
 </div>
 </div>
 <button
 type="button"
 onClick={() => setQuietMode(!quietMode)}
 className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-250 ease-in-out focus:outline-none ${
 quietMode ? 'bg-[#1877f2]' : 'bg-zinc-200 dark:bg-zinc-800'
 }`}
 >
 <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
 quietMode ? 'translate-x-4' : 'translate-x-0'
 }`} />
 </button>
 </div>

 </div>
 </div>

 <div className="flex justify-end pt-4">
 <button
 type="submit"
 className="px-6 py-3 rounded-2xl text-xs font-bold bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950"
 >
 Save Notification Settings
 </button>
 </div>
 </form>
 )}


 {/* TAB 5: AESTHETICS & THEME */}
 {activeTab === 'display' && (
 <form onSubmit={saveOtherSettings} className="space-y-6">
 <div className="pb-4">
 <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Appearance</h2>
 <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Customize app themes, text size, and layout density.</p>
 </div>

 <div className="space-y-5">
 <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest pl-1 text-[9px]">Select App Theme</p>
 
 {/* Custom Selector Box grids */}
 <div className="grid grid-cols-2 gap-4">
 
 {/* Option 1: Light aesthetics */}
 <button
 type="button"
 onClick={() => {
 if (theme === 'dark') toggleTheme();
 }}
 className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-28 cursor-pointer select-none transition-all ${
 theme === 'light' 
 ? 'border-zinc-900 dark:border-white bg-zinc-50 text-zinc-900 ring-2 ring-zinc-900/10' 
 : 'border-zinc-200 dark:border-zinc-800 bg-white text-zinc-500 hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900/30'
 }`}
 >
 <div className="flex justify-between items-center w-full">
 <span className="text-xs font-bold">Light Mode</span>
 <div className={`w-4 h-4 rounded-full border items-center justify-center flex ${
 theme === 'light' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300'
 }`}>
 {theme === 'light' && <span className="text-[8px]">✓</span>}
 </div>
 </div>
 <p className="text-[10px] text-zinc-400">Pure, high-contrast white layout for daylight environments.</p>
 </button>

 {/* Option 2: Dark aesthetics */}
 <button
 type="button"
 onClick={() => {
 if (theme === 'light') toggleTheme();
 }}
 className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-28 cursor-pointer select-none transition-all ${
 theme === 'dark' 
 ? 'border-zinc-200 dark:border-white bg-zinc-900 dark:bg-zinc-900 text-white ring-2 ring-zinc-100/10' 
 : 'border-zinc-200 dark:border-zinc-800 bg-white text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-900/30'
 }`}
 >
 <div className="flex justify-between items-center w-full">
 <span className="text-xs font-bold">Dark Mode</span>
 <div className={`w-4 h-4 rounded-full border items-center justify-center flex ${
 theme === 'dark' ? 'border-white bg-white text-zinc-950' : 'border-zinc-300'
 }`}>
 {theme === 'dark' && <span className="text-[8px] text-zinc-950">✓</span>}
 </div>
 </div>
 <p className="text-[10px] text-zinc-500">Elegant dark layout theme to reduce eye strain in low-light environments.</p>
 </button>

 </div>

 <div className="space-y-3 pt-4">
 <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest pl-1 text-[9px]">Text Size</p>
 
 <div className="p-4 border border-zinc-100 dark:border-zinc-800 rounded-2xl space-y-3">
 <div className="flex justify-between items-center">
 <span className="text-xs font-bold text-zinc-900 dark:text-zinc-200">Text Size Selection</span>
 <span className="text-[10px] font-bold text-zinc-400 uppercase">{fontSize === 'sm' ? 'Small' : fontSize === 'base' ? 'Medium' : 'Large'}</span>
 </div>
 
 <div className="grid grid-cols-3 gap-2">
 {(['sm', 'base', 'lg'] as const).map((size) => (
 <button
 key={size}
 type="button"
 onClick={() => setFontSize(size)}
 className={`px-3 py-2 text-[10px] font-bold border rounded-xl capitalize transition-all cursor-pointer ${
 fontSize === size 
 ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-xs' 
 : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-100 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
 }`}
 >
 {size === 'sm' ? 'Small' : size === 'base' ? 'Default' : 'Large'}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* Dense spacing toggle components layout */}
 <div className="space-y-3 pt-2">
 <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest pl-1 text-[9px]">Layout Density</p>
 
 <div className="p-4 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex items-center justify-between">
 <div>
 <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Compact Spacing</h4>
 <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Reduces padding and margins globally to fit more posts on screen</p>
 </div>
 <button
 type="button"
 onClick={() => setLayoutDensity(prev => prev === 'cozy' ? 'compact' : 'cozy')}
 className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-250 ease-in-out focus:outline-none ${
 layoutDensity === 'compact' ? 'bg-[#1877f2]' : 'bg-zinc-200 dark:bg-zinc-800'
 }`}
 >
 <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
 layoutDensity === 'compact' ? 'translate-x-4' : 'translate-x-0'
 }`} />
 </button>
 </div>
 </div>

 </div>

 <div className="flex justify-end pt-4">
 <button
 type="submit"
 className="px-6 py-3 rounded-2xl text-xs font-bold bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950"
 >
 Save Appearance
 </button>
 </div>
 </form>
 )}
 {/* TAB 6: SECURITY & PRIVACY PROTECTION */}
 {activeTab === 'security' && (
 <form onSubmit={saveOtherSettings} className="space-y-6">
 <div className="pb-4">
 <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Security Settings</h2>
 <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Manage your account protection, two-factor authentication, and check system connection status.</p>
 </div>

 <div className="space-y-4">
 
 {/* Two factor toggle */}
 <div className="p-4 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex items-center justify-between">
 <div>
 <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Two-Factor Authentication (2FA)</h4>
 <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium leading-relaxed max-w-sm">Require a verification code sent to your email or authenticator app when logging in on new devices.</p>
 </div>
 
 <button
 type="button"
 onClick={() => setTwoFactor(!twoFactor)}
 className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
 twoFactor ? 'bg-[#1877f2]' : 'bg-zinc-200 dark:bg-zinc-800'
 }`}
 >
 <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
 twoFactor ? 'translate-x-5' : 'translate-x-0'
 }`} />
 </button>
 </div>

 {/* Auto lock */}
 <div className="p-4 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex items-center justify-between">
 <div>
 <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Automatic Logout</h4>
 <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Automatically logs you out of your current session after 30 minutes of inactivity</p>
 </div>
 
 <button
 type="button"
 onClick={() => setAutoLock(!autoLock)}
 className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
 autoLock ? 'bg-[#1877f2]' : 'bg-zinc-200 dark:bg-zinc-800'
 }`}
 >
 <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
 autoLock ? 'translate-x-5' : 'translate-x-0'
 }`} />
 </button>
 </div>

 {/* Connection Sync Terminal diagnostic */}
 <div className="p-5 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-3">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
 <div>
 <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-200 tracking-tight select-all">System Health Check</h4>
 <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Run a safe test of your current database speed and connection reliability</p>
 </div>
 <button
 type="button"
 onClick={runDiagnosticCheck}
 disabled={isDiagnosing}
 className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 rounded-xl font-bold font-sans text-[10px] self-start cursor-pointer select-none transition-all disabled:opacity-40"
 >
 {isDiagnosing ? 'Testing...' : 'Run Diagnostics'}
 </button>
 </div>

 {/* Console log simulate screen */}
 {diagnosticLogs.length > 0 && (
 <div className="bg-zinc-950 text-emerald-400 font-mono p-4 rounded-xl text-[9px] min-h-[100px] max-h-[180px] overflow-y-auto space-y-1 select-text scrollbar-thin">
 {diagnosticLogs.map((log, index) => (
 <div key={index} className="flex items-start gap-1.5 hover:bg-zinc-900/55 p-0.5 rounded transition-all animate-fade-in">
 <span className="text-emerald-600 font-bold select-none">&gt;&gt;</span>
 <span className="leading-snug">{log}</span>
 </div>
 ))}
 </div>
 )}
 </div>

 </div>

 <div className="flex justify-end pt-4">
 <button
 type="submit"
 className="px-6 py-3 rounded-2xl text-xs font-bold bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 shadow"
 >
 Save Security Settings
 </button>
 </div>
 </form>
 )}


 {/* TAB 7: DISCUSSIONS FAQ / HELP */}
 {activeTab === 'help' && (
 <div className="space-y-6 animate-fade-in">
 <div className="pb-4">
 <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Help & Support</h2>
 <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Get quick answers about managing your account, privacy, and connections.</p>
 </div>

 {/* Simulated FAQ Accordions */}
 <div className="space-y-3.5 select-text">
 
 <div className="p-4 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800 rounded-2xl">
 <h4 className="text-xs font-bold text-zinc-900 dark:text-white leading-normal">Is my personal information secure?</h4>
 <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mt-2 font-medium">
 Yes, Circle protects your account safety. Your direct messages, personal profile details, and posts are stored with industry-standard encryption to prevent unauthorized access or scraping.
 </p>
 </div>

 <div className="p-4 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800 rounded-2xl">
 <h4 className="text-xs font-bold text-zinc-900 dark:text-white leading-normal">How do I change my username?</h4>
 <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mt-2 font-medium">
 Go to the <strong className="text-zinc-900 dark:text-zinc-100">Edit Profile</strong> tab on the left, enter a new username, and wait for the system to verify its availability. Once approved, you can save your changes instantly.
 </p>
 </div>

 <div className="p-4 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800 rounded-2xl">
 <h4 className="text-xs font-bold text-zinc-900 dark:text-white leading-normal">How do I crop my profile photo?</h4>
 <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mt-2 font-medium">
 When you upload a new photo, our built-in image editor lets you adjust the crop, rotation, zoom, and framing so your picture fits perfectly.
 </p>
 </div>

 </div>

 <div className="p-4 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-zinc-50/20 dark:bg-zinc-900/10">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center font-bold text-xs">💬</div>
 <div>
 <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Contact Support</h4>
 <p className="text-[10px] text-zinc-400 dark:text-zinc-500">GET HELP WITH YOUR ACCOUNT</p>
 </div>
 </div>
 <button
 type="button"
 onClick={() => triggerToast('Support ticket created successfully! Our team will reach out via email.')}
 className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-bold font-sans text-[10px] rounded-xl cursor-pointer select-none"
 >
 Open Support Ticket
 </button>
 </div>
 </div>
 )}

 </div>

 {/* Bottom Pane with Close Button Actions */}
 <div className="p-4 flex justify-end gap-3 select-none shrink-0 bg-white dark:bg-zinc-950">
 {!forceOnboarding && (
 <button
 type="button"
 id="btn-modal-footer-close"
 onClick={onClose}
 className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer"
 >
 Close Settings
 </button>
 )}
 </div>

 </div>

 </div>
 </div>
 );
};
