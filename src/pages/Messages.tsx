import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, MessageSquare, Trash2, Phone, Video, Info, Search, Image, Smile, 
  Paperclip, Mic, MapPin, Check, CheckCheck, X, Camera, Volume2, VolumeX, 
  Play, Sparkles, User, ShieldCheck, ArrowLeft, MoreHorizontal, Layers,
  Trash, Heart, ThumbsUp, HelpCircle
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, serverTimestamp, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseClient';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';

interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  text: string;
  participants: string[];
  createdAt: any;
  reactions?: Record<string, string>; // userId -> emoji mapping
  mediaUrl?: string; // Optional image attachment
  isVoiceMemo?: boolean; // Optional voice note
  isLocation?: boolean; // Optional location marker
}

const ATTACHMENT_PRESETS = [
  { name: 'Creative Desk', url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80' },
  { name: 'Warm Brew', url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=80' },
  { name: 'Cyber Neon', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&q=80' },
  { name: 'Serene Peak', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80' }
];

const COMPANION_QUOTES = [
  "This is incredible! Direct transit sync on Circle is absolutely beautiful. ✨",
  "Hey! Thanks for pinging me. Always down to chat about creative builds, UI architecture, or tech! 🚀",
  "Absolutely. Designing with premium aesthetics is what we live for. Let's do a quick audio catchup later! 📱",
  "Love that! Checked your profile posts and details earlier. Pure class.",
  "That makes total sense. Have you experimented with custom wallpapers or interactive audio yet?",
  "Hahaha, indeed! Let's build the future of elegant web applications. 💻✨"
];

export const Messages: React.FC = () => {
  const { user, profile } = useAuth();
  
  // Parse destination query param (e.g. /messages?to=username)
  const getRecipientFromUrl = () => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('to') || '';
  };
  
  const [recipientUsername, setRecipientUsername] = useState(getRecipientFromUrl);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [activeRecipient, setActiveRecipient] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [typedMessage, setTypedMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Custom states for the revised "Cupertino Neo-Workspace" UI
  const [contactSearch, setContactSearch] = useState('');
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showAttachmentsMenu, setShowAttachmentsMenu] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [isTypingCompanion, setIsTypingCompanion] = useState(false);
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  
  // Call simulation state (designed like macOS top-right FaceTime card)
  const [isSimulatingCall, setIsSimulatingCall] = useState<'voice' | 'video' | null>(null);
  const [callTimer, setCallTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const callIntervalRef = useRef<any>(null);

  // Sync state if URL changes
  useEffect(() => {
    const handleUrlChange = () => {
      setRecipientUsername(getRecipientFromUrl());
    };
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // 1. Fetch other registered users to populate DM contacts
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const loadContacts = async () => {
      try {
        const followingSnap = await getDocs(query(collection(db, 'follows'), where('followerId', '==', user.uid)));
        const followersSnap = await getDocs(query(collection(db, 'follows'), where('followingId', '==', user.uid)));
        
        const connectedUserIds = new Set<string>();
        followingSnap.forEach(d => connectedUserIds.add(d.data().followingId));
        followersSnap.forEach(d => connectedUserIds.add(d.data().followerId));

        if (connectedUserIds.size === 0) {
          const snap = await getDocs(collection(db, 'users'));
          const list: UserProfile[] = [];
          snap.forEach(d => {
            if (d.id !== user.uid) {
              list.push({ id: d.id, ...d.data() } as UserProfile);
            }
          });
          setAllUsers(list);
          setLoading(false);

          const targetSlug = getRecipientFromUrl();
          if (targetSlug) {
            const matched = list.find(u => u.username.toLowerCase() === targetSlug.toLowerCase());
            if (matched) setActiveRecipient(matched);
          }
          return;
        }

        const snap = await getDocs(collection(db, 'users'));
        const list: UserProfile[] = [];
        snap.forEach(d => {
          if (d.id !== user.uid && (connectedUserIds.has(d.id) || d.id === 'system-bot')) {
            list.push({ id: d.id, ...d.data() } as UserProfile);
          }
        });

        const targetSlug = getRecipientFromUrl();
        if (targetSlug) {
          const inList = list.some(u => u.username.toLowerCase() === targetSlug.toLowerCase());
          if (!inList) {
            const matchedSnap = await getDocs(query(collection(db, 'users'), where('username', '==', targetSlug)));
            matchedSnap.forEach(d => {
              list.push({ id: d.id, ...d.data() } as UserProfile);
            });
          }
        }

        setAllUsers(list);

        if (targetSlug) {
          const matched = list.find(u => u.username.toLowerCase() === targetSlug.toLowerCase());
          if (matched) {
            setActiveRecipient(matched);
          }
        }
      } catch (err) {
        console.error('Failed to load messaging companion registries', err);
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, [user]);

  // Handle companion swap
  const handleSelectRecipient = (recipient: UserProfile) => {
    setActiveRecipient(recipient);
    setEmojiPickerMsgId(null);
    setShowAttachmentsMenu(false);
    
    const cleanUrl = `${window.location.pathname}?to=${recipient.username}`;
    window.history.pushState(null, '', cleanUrl);
  };

  // 2. Fetch direct messages in real time with security validation
  useEffect(() => {
    if (!user || !activeRecipient) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: DirectMessage[] = [];
      snap.forEach(d => {
        const data = d.data() as any;
        const belongsToChat = 
          (data.senderId === user.uid && data.receiverId === activeRecipient.id) ||
          (data.senderId === activeRecipient.id && data.receiverId === user.uid);

        if (belongsToChat) {
          list.push({ id: d.id, ...data } as DirectMessage);
        }
      });

      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeA - timeB;
      });

      setMessages(list);
    }, (err) => {
      console.error('Direct Message stream subscription failed', err);
    });

    return unsub;
  }, [user, activeRecipient]);

  // Scroll anchor hook
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTypingCompanion]);

  // Call duration simulation trigger
  useEffect(() => {
    if (isSimulatingCall) {
      setCallTimer(0);
      callIntervalRef.current = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (callIntervalRef.current) {
        clearInterval(callIntervalRef.current);
      }
    }
    return () => clearInterval(callIntervalRef.current);
  }, [isSimulatingCall]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Automated reply simulation
  const triggerSimulatedResponse = (originalText: string) => {
    if (!activeRecipient) return;
    setIsTypingCompanion(true);
    
    setTimeout(async () => {
      if (!activeRecipient) {
        setIsTypingCompanion(false);
        return;
      }
      
      const randomQuote = COMPANION_QUOTES[Math.floor(Math.random() * COMPANION_QUOTES.length)];
      
      try {
        await addDoc(collection(db, 'messages'), {
          senderId: activeRecipient.id,
          senderName: activeRecipient.displayName,
          senderAvatar: activeRecipient.avatarUrl,
          receiverId: user!.uid,
          receiverName: profile?.displayName || 'Circle User',
          receiverAvatar: profile?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user!.uid}`,
          text: randomQuote,
          participants: [user!.uid, activeRecipient.id],
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error("Auto responder failed to publish message", err);
      } finally {
        setIsTypingCompanion(false);
      }
    }, 1500);
  };

  // Compose / Write Private DM
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !activeRecipient || !typedMessage.trim() || sending) return;

    const textPayload = typedMessage.trim();
    setTypedMessage('');
    setSending(true);

    try {
      await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        senderName: profile.displayName || 'Circle User',
        senderAvatar: profile.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
        receiverId: activeRecipient.id,
        receiverName: activeRecipient.displayName || 'Circle Companion',
        receiverAvatar: activeRecipient.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${activeRecipient.id}`,
        text: textPayload,
        participants: [user.uid, activeRecipient.id],
        createdAt: serverTimestamp()
      });
      triggerSimulatedResponse(textPayload);
    } catch (err) {
      console.error('Failed to submit direct message securely to Firestore', err);
      setTypedMessage(textPayload);
    } finally {
      setSending(false);
    }
  };

  // Simulated Attachments Option
  const handleAttachItem = async (type: 'photo' | 'voice' | 'location', payload?: string) => {
    if (!user || !profile || !activeRecipient) return;
    setShowAttachmentsMenu(false);
    setSending(true);

    try {
      const basePayload: any = {
        senderId: user.uid,
        senderName: profile.displayName || 'Circle User',
        senderAvatar: profile.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
        receiverId: activeRecipient.id,
        receiverName: activeRecipient.displayName || 'Circle Companion',
        receiverAvatar: activeRecipient.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${activeRecipient.id}`,
        participants: [user.uid, activeRecipient.id],
        createdAt: serverTimestamp()
      };

      if (type === 'photo' && payload) {
        basePayload.text = "Sent an aesthetic preview snapshot";
        basePayload.mediaUrl = payload;
      } else if (type === 'voice') {
        basePayload.text = "Voice Memo recording (0:12)";
        basePayload.isVoiceMemo = true;
      } else if (type === 'location') {
        basePayload.text = "Sent current coordinates pin 📍";
        basePayload.isLocation = true;
      }

      await addDoc(collection(db, 'messages'), { ...basePayload });
      
      setTimeout(() => {
        triggerSimulatedResponse("Aesthetic shared item received perfectly!");
      }, 500);
    } catch (err) {
      console.error('Failed to submit simulation attachment', err);
    } finally {
      setSending(false);
    }
  };

  const handleCustomImageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customImageUrl.trim()) {
      handleAttachItem('photo', customImageUrl.trim());
      setCustomImageUrl('');
    }
  };

  // Add Emojis Reactions
  const handleEmojiReaction = async (msgId: string, emoji: string) => {
    setEmojiPickerMsgId(null);
    try {
      const msgRef = doc(db, 'messages', msgId);
      const targetMsg = messages.find(m => m.id === msgId);
      if (!targetMsg) return;

      const existingReactions = targetMsg.reactions || {};
      const updatedReactions = { ...existingReactions, [user!.uid]: emoji };
      
      await updateDoc(msgRef, {
        reactions: updatedReactions
      });
    } catch (err) {
      console.error("Failed to add smiley", err);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await deleteDoc(doc(db, 'messages', msgId));
    } catch (err) {
      console.error('Failed to delete message', err);
    }
  };

  const filteredUsers = allUsers.filter(u => {
    const keyword = contactSearch.toLowerCase();
    return u.displayName.toLowerCase().includes(keyword) || u.username.toLowerCase().includes(keyword);
  });

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-zinc-950 p-2 md:p-6 overflow-hidden h-[calc(100vh-120px)] md:h-[calc(100vh-64px)] font-sans antialiased text-zinc-900 dark:text-zinc-100">
      
      <div className="flex-1 flex bg-white/70 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl max-w-7xl mx-auto w-full relative">
        
        {/* ==================== 1. CONTACT SIDEBAR ==================== */}
        <div className={`w-full md:w-85 flex flex-col border-r border-zinc-150 dark:border-zinc-800/60 bg-slate-50/40 dark:bg-zinc-950/40 ${activeRecipient ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Header area with custom ambient workspace look */}
          <div className="p-5 border-b border-zinc-150/80 dark:border-zinc-800/50 flex flex-col gap-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 p-2 rounded-xl flex items-center justify-center shadow-lg shadow-zinc-900/10 dark:shadow-none">
                  <MessageSquare className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-lg tracking-tight">Direct Box</h3>
                  <p className="text-[10px] text-zinc-400 font-medium">Secured Node Chat</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full text-[9px] font-bold text-zinc-500 dark:text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Transit Encrypted</span>
              </div>
            </div>

            {/* Premium refined Search Field */}
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Find publisher or username..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="w-full bg-slate-100/50 dark:bg-zinc-950 border-0 rounded-2xl py-2 pl-9.5 pr-8 text-xs font-semibold placeholder-zinc-400 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1.5 focus:ring-zinc-900 dark:focus:ring-white transition-all"
              />
              {contactSearch && (
                <button 
                  onClick={() => setContactSearch('')}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
            
            {/* Filter Pills for tabs look */}
            <div className="flex items-center gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
              <button 
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-tight transition-all ${
                  activeTab === 'all' 
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/40'
                }`}
              >
                All Contacts
              </button>
              <button 
                onClick={() => setActiveTab('unread')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-tight transition-all ${
                  activeTab === 'unread' 
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/40'
                }`}
              >
                Favorites ({allUsers.slice(0, 3).length})
              </button>
            </div>
          </div>

          {/* Connected Directory horizontally */}
          <div className="p-4 bg-white/40 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-800/40 flex items-center gap-3 overflow-x-auto scrollbar-none shrink-0 select-none">
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest shrink-0">Online:</span>
            {loading ? (
              <div className="h-4 w-20 bg-zinc-100 dark:bg-zinc-850 rounded animate-pulse" />
            ) : allUsers.length === 0 ? (
              <span className="text-[10px] text-zinc-400 italic">None Active</span>
            ) : (
              <div className="flex gap-2">
                {allUsers.slice(0, 8).map(u => (
                  <button 
                    key={`online-${u.id}`} 
                    onClick={() => handleSelectRecipient(u)}
                    className="relative shrink-0 hover:scale-110 active:scale-95 transition-transform duration-250 group"
                    title={u.displayName}
                  >
                    <img src={u.avatarUrl} className="w-8 h-8 rounded-xl object-cover border border-zinc-200/80 dark:border-zinc-800 shadow-sm" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950 shadow-sm" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Redesigned Contact Scroll Cards */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-1.5 scrollbar-none bg-zinc-50/20 dark:bg-zinc-950/20">
            {loading ? (
              <div className="space-y-3.5 p-2 animate-pulse">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="flex items-center gap-3.5 px-2">
                    <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="h-3 w-24 bg-zinc-150 dark:bg-zinc-800 rounded" />
                      <div className="h-2 w-36 bg-zinc-100 dark:bg-zinc-850 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center p-8 text-zinc-405 text-xs italic flex flex-col gap-2 items-center justify-center h-48">
                <p>No connections registered</p>
                <span className="text-[10px] text-zinc-400">Add followers in Feed directory</span>
              </div>
            ) : (
              (activeTab === 'all' ? filteredUsers : filteredUsers.slice(0, 3)).map(u => {
                const isSelected = activeRecipient?.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => handleSelectRecipient(u)}
                    className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-3.5 transition-all outline-none ${
                      isSelected 
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xl shadow-zinc-900/10 dark:shadow-none scale-[1.02]' 
                        : 'hover:bg-white dark:hover:bg-zinc-850 bg-transparent text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50 border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800 shadow-none hover:shadow-xs'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={u.avatarUrl}
                        alt={u.displayName}
                        className="w-11 h-11 rounded-xl object-cover border border-zinc-200/50 dark:border-zinc-800/80 bg-white"
                      />
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 rounded-full ${isSelected ? 'border-zinc-900 dark:border-white' : 'border-white dark:border-zinc-900'}`} />
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className={`font-bold text-xs truncate ${isSelected ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`}>
                          {u.displayName}
                        </p>
                        <span className={`text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-white/10 text-white' : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-500'}`}>
                          Verified
                        </span>
                      </div>
                      <p className={`text-[10px] truncate mt-1 ${isSelected ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        @{u.username}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          
          {/* Custom sidebar bottom widget */}
          <div className="p-4 border-t border-zinc-150 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/90 text-[10px] text-zinc-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Circle Secure System</span>
            </span>
            <span className="font-mono text-[9px] text-zinc-400 bg-zinc-100 dark:bg-zinc-850 px-1.5 py-0.5 rounded">v2.1</span>
          </div>
        </div>

        {/* ==================== 2. MAIN CHAT WORKSPACE (Center) ==================== */}
        <div className={`flex-1 flex flex-col min-w-0 bg-slate-50/30 dark:bg-zinc-900/10 ${!activeRecipient ? 'hidden md:flex items-center justify-center p-8 bg-zinc-50/50 dark:bg-zinc-950/20' : 'flex'}`}>
          {activeRecipient ? (
            <>
              {/* Refined Custom Headers workspace */}
              <div className="p-4 border-b border-zinc-150/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3.5">
                  <div className="relative cursor-pointer" onClick={() => setShowDetailPanel(!showDetailPanel)}>
                    <img
                      src={activeRecipient.avatarUrl}
                      alt={activeRecipient.displayName}
                      className="w-12 h-12 rounded-2xl object-cover border border-zinc-200/50 dark:border-zinc-800 shadow-md"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <h4 
                      onClick={() => setShowDetailPanel(!showDetailPanel)}
                      className="font-extrabold text-sm hover:underline cursor-pointer flex items-center gap-1 text-zinc-900 dark:text-zinc-50 hover:text-black dark:hover:text-white"
                    >
                      <span>{activeRecipient.displayName}</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-505 shrink-0" />
                    </h4>
                    <span className="text-[10px] text-zinc-400 font-semibold block mt-0.5">
                      {isTypingCompanion ? 'Typing dynamic auto reply...' : `Conversation with @${activeRecipient.username}`}
                    </span>
                  </div>
                </div>

                {/* Neo-Aesthetic workspace controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsSimulatingCall('voice')}
                    title="Simulate Secure Audio Call"
                    className="p-2.5 text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 bg-zinc-100/60 hover:bg-zinc-200/50 dark:bg-zinc-850 dark:hover:bg-zinc-800 rounded-xl transition-all"
                  >
                    <Phone className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setIsSimulatingCall('video')}
                    title="Simulate Secure Video Call"
                    className="p-2.5 text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 bg-zinc-100/60 hover:bg-zinc-200/50 dark:bg-zinc-850 dark:hover:bg-zinc-800 rounded-xl transition-all"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => setShowDetailPanel(!showDetailPanel)}
                    title="Companion Profile Workspace"
                    className={`p-2.5 rounded-xl transition-all ${showDetailPanel ? 'text-white bg-zinc-900 dark:text-zinc-900 dark:bg-white' : 'text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 bg-zinc-100/60 dark:bg-zinc-850 hover:bg-zinc-250/50'}`}
                  >
                    <Info className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setActiveRecipient(null)}
                    className="md:hidden flex items-center gap-1 text-xs font-bold text-zinc-550 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-xl"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                </div>
              </div>

              {/* MESSAGE TIMELINE FLOW with elegant chat UI */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-none h-full bg-slate-100/20 dark:bg-zinc-950/40">
                
                {/* Visual Security Announcement */}
                <div className="flex justify-center my-1.5">
                  <div className="bg-white/80 dark:bg-zinc-900/90 backdrop-blur-md text-[10px] font-bold text-zinc-500 dark:text-zinc-400 py-1.5 px-3.5 rounded-full border border-zinc-150 dark:border-zinc-800 inline-flex items-center gap-1.5 shadow-sm">
                    <ShieldCheck className="w-4.5 h-4.5 text-zinc-900 dark:text-white" />
                    <span>Communication sync session is locked and verified with Transit Database Nodes</span>
                  </div>
                </div>

                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center max-w-xs mx-auto gap-3.5 select-none">
                    <span className="w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shadow-md">
                      <MessageSquare className="w-5 h-5 animate-pulse" />
                    </span>
                    <div>
                      <h5 className="font-bold text-sm">Secure Terminal Active</h5>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 lines-normal">
                        No messages logged yet. Type down below to initiate high-fidelity interaction logs with @{activeRecipient.username}.
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isOwn = m.senderId === user?.uid;
                    const reactionsArray = m.reactions ? Object.entries(m.reactions) : [];
                    
                    return (
                      <div 
                        key={m.id} 
                        className={`flex gap-3 max-w-[85%] group relative ${isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                      >
                        <img
                          src={isOwn ? (profile?.avatarUrl || '') : activeRecipient.avatarUrl}
                          alt="avatar"
                          className="w-8 h-8 rounded-xl object-cover shrink-0 bg-neutral-100 border border-zinc-200 dark:border-zinc-800 self-end mb-1"
                        />
                        
                        <div className="flex flex-col gap-1">
                          <div className={`flex items-center gap-2 relative ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                            
                            {/* Visual Chat Balloon */}
                            <div 
                              className={`rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs relative overflow-wrap-anywhere ${
                                isOwn 
                                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-medium rounded-br-none shadow-md shadow-zinc-900/5' 
                                  : 'bg-white dark:bg-zinc-850 text-zinc-800 dark:text-zinc-100 border border-zinc-150/70 dark:border-zinc-800/80 rounded-bl-none font-medium'
                              }`}
                            >
                              {!m.mediaUrl && !m.isVoiceMemo && !m.isLocation && <p>{m.text}</p>}

                              {m.mediaUrl && (
                                <div className="space-y-2 rounded-xl overflow-hidden decoration-neutral">
                                  <img 
                                    src={m.mediaUrl} 
                                    alt="Media Attachment snapshot" 
                                    className="max-w-xs max-h-52 object-cover rounded-lg border border-zinc-100 dark:border-zinc-800"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=420";
                                    }}
                                  />
                                  {m.text && <p className="text-[10px] opacity-90 italic font-semibold">{m.text}</p>}
                                </div>
                              )}

                              {m.isVoiceMemo && (
                                <div className="flex items-center gap-2.5 select-none py-1.5 pr-1.5">
                                  <button className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-xs ${isOwn ? 'bg-white text-zinc-900' : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'}`}>
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                  </button>
                                  <div className="flex items-end gap-0.5 h-4.5">
                                    {[2, 5, 3, 6, 2, 7, 4, 3, 5, 2, 6, 3].map((h, idx) => (
                                      <span 
                                        key={idx} 
                                        style={{ height: `${h * 3}px` }} 
                                        className={`w-[2.5px] rounded-full ${isOwn ? 'bg-white/60' : 'bg-zinc-350 dark:bg-zinc-600'}`} 
                                      />
                                    ))}
                                  </div>
                                  <span className="text-[9px] font-mono opacity-80 shrink-0">0:12</span>
                                </div>
                              )}

                              {m.isLocation && (
                                <div className="space-y-2 select-none w-48 p-1">
                                  <div className="bg-zinc-50 dark:bg-zinc-905 p-2 px-3 rounded-lg border border-zinc-150 dark:border-zinc-800 flex items-center gap-2 text-[10px] text-zinc-700 dark:text-zinc-300 font-bold tracking-tight">
                                    <MapPin className="w-4 h-4 text-rose-500 animate-pulse" />
                                    <span>Broadway Manhattan NYC</span>
                                  </div>
                                  <p className="text-[9px] opacity-80">Location coordinates synchronized</p>
                                </div>
                              )}

                              {/* Reactions Pills */}
                              {reactionsArray.length > 0 && (
                                <div className="absolute -bottom-2 right-2 flex items-center gap-0.5 bg-white dark:bg-zinc-800 py-0.5 px-2 rounded-full border border-zinc-100 dark:border-zinc-750 shadow-sm z-10 select-none">
                                  {reactionsArray.map(([uid, emoji]) => (
                                    <span key={uid} className="text-[11px] hover:scale-125 transition-transform">{emoji}</span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Hover Quick Action Buttons */}
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-all duration-150 px-1 select-none">
                              <div className="relative">
                                <button
                                  onClick={() => setEmojiPickerMsgId(emojiPickerMsgId === m.id ? null : m.id)}
                                  title="Add smiley reaction"
                                  className="p-1.5 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 rounded-lg transition-all"
                                >
                                  <Smile className="w-3.5 h-3.5" />
                                </button>

                                {emojiPickerMsgId === m.id && (
                                  <div className="absolute bottom-full mb-1 left-0 flex items-center gap-1.5 p-1 px-1.5 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-xl shadow-xl z-30 animate-fade-in text-base">
                                    {['❤️', '👍', '😂', '🔥', '😮', '😢'].map((em) => (
                                      <button
                                        key={em}
                                        onClick={() => handleEmojiReaction(m.id, em)}
                                        className="hover:scale-130 transition-transform p-0.5 cursor-pointer"
                                      >
                                        {em}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {isOwn && (
                                <button
                                  onClick={() => handleDeleteMessage(m.id)}
                                  title="Delete Message Record"
                                  className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Footer and dynamic tags */}
                          <div className={`flex items-center gap-1 px-1 mt-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[9px] font-mono text-zinc-405 font-medium select-none">
                              {m.createdAt ? new Date(m.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Transit...'}
                            </span>
                            {isOwn && <CheckCheck className="w-3 h-3 text-blue-500" />}
                          </div>

                        </div>
                      </div>
                    );
                  })
                )}

                {/* Simulated typewriter animated feedback */}
                {isTypingCompanion && (
                  <div className="flex gap-3 max-w-[80%] mr-auto items-end animate-pulse">
                    <img
                      src={activeRecipient.avatarUrl}
                      alt="avatar typing"
                      className="w-8 h-8 rounded-xl object-cover border border-zinc-200"
                    />
                    <div className="bg-white dark:bg-zinc-850 py-3 px-4 rounded-2xl rounded-bl-none border border-zinc-100 dark:border-zinc-800 flex items-center justify-center gap-1 shadow-xs">
                      <span className="w-1.5 h-1.5 bg-zinc-500 dark:bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-zinc-500 dark:bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-zinc-500 dark:bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* WRITE BAR AREA with layout refinements */}
              <div className="relative border-t border-zinc-150/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/90 backdrop-blur-md">
                
                {/* Embedded dynamic attachments dropdown menu */}
                {showAttachmentsMenu && (
                  <div className="absolute bottom-full left-5 mb-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-2xl z-20 w-80 animate-fade-in">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest">Aesthetic Presets Workspace</span>
                      <button onClick={() => setShowAttachmentsMenu(false)} className="text-zinc-400 hover:text-zinc-650 text-xs">✕</button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button
                        onClick={() => handleAttachItem('voice')}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold bg-zinc-100/60 dark:bg-zinc-850 hover:bg-zinc-250/50 rounded-xl text-left transition-all"
                      >
                        <Mic className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Share Mic Memo</span>
                      </button>

                      <button
                        onClick={() => handleAttachItem('location')}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold bg-zinc-100/60 dark:bg-zinc-850 hover:bg-zinc-250/50 rounded-xl text-left transition-all"
                      >
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>Live Coordinates</span>
                      </button>
                    </div>

                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5">High Fidelity Snapshot Library</p>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {ATTACHMENT_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          onClick={() => handleAttachItem('photo', p.url)}
                          title={`Attach photo preset: ${p.name}`}
                          className="relative aspect-square rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-850 hover:scale-105 transition-all"
                        >
                          <img src={p.url} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>

                    <form onSubmit={handleCustomImageSubmit} className="space-y-1.5 border-t border-zinc-100 dark:border-zinc-850 pt-2.5">
                      <p className="text-[9px] font-medium text-zinc-400 uppercase tracking-wider">Paste Custom Image URL</p>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="https://images.unsplash.com/...image.jpg"
                          value={customImageUrl}
                          onChange={(e) => setCustomImageUrl(e.target.value)}
                          className="flex-1 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 focus:outline-none placeholder-zinc-400"
                        />
                        <button
                          type="submit"
                          className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-3 rounded-xl text-[10px] font-bold shrink-0"
                        >
                          Send
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Main Message compose workflow */}
                <form onSubmit={handleSendMessage} className="p-4 flex items-center gap-3 max-w-5xl mx-auto w-full">
                  <button
                    type="button"
                    onClick={() => setShowAttachmentsMenu(!showAttachmentsMenu)}
                    title="Attach preset simulation presets"
                    className={`p-3 rounded-xl transition-all border ${showAttachmentsMenu ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900' : 'text-zinc-500 hover:text-zinc-900 border-zinc-200 dark:border-zinc-800 dark:text-zinc-400 hover:bg-zinc-50'}`}
                  >
                    <Paperclip className="w-4.5 h-4.5" />
                  </button>

                  <div className="flex-1 relative flex items-center bg-slate-100/50 dark:bg-zinc-950/70 border-0 rounded-2xl focus-within:ring-1 focus-within:ring-zinc-900 dark:focus-within:ring-white transition-all">
                    <input
                      id="input-direct-message"
                      type="text"
                      value={typedMessage}
                      onChange={(e) => setTypedMessage(e.target.value)}
                      className="w-full bg-transparent text-xs p-3.5 pr-10 focus:outline-none placeholder-zinc-405 text-zinc-900 dark:text-zinc-100 font-semibold"
                      placeholder={`Draft private memo to @${activeRecipient.username}...`}
                      disabled={sending}
                      maxLength={1000}
                      autoComplete="off"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    id="btn-chat-send"
                    disabled={sending || !typedMessage.trim()}
                    className="bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 rounded-xl p-4 opacity-90 hover:opacity-100 disabled:opacity-35 transition-all cursor-pointer shadow-lg shadow-zinc-900/10 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="text-center p-8 max-w-sm flex flex-col items-center justify-center gap-4 select-none mx-auto py-32">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-905 flex items-center justify-center shadow-2xl">
                <MessageSquare className="w-7 h-7 animate-bounce" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">Direct Message Client</h4>
                <p className="text-zinc-505 dark:text-zinc-400 text-xs mt-2 leading-relaxed">
                  Select an active chat partner or verify follows list on the left index card timeline to sync transit safety logs, simulate FaceTime calls, and exchange private nodes.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ==================== 3. COMPANION DETAILS SIDE DRAWER ==================== */}
        {activeRecipient && showDetailPanel && (
          <div className="absolute md:relative inset-y-0 right-0 w-80 bg-white dark:bg-zinc-900 border-l border-zinc-150 dark:border-zinc-800 z-20 flex flex-col shadow-2xl md:shadow-none animate-fade-in">
            
            <div className="p-4.5 border-b border-zinc-150 dark:border-zinc-850 flex items-center justify-between">
              <h4 className="font-bold text-xs text-zinc-400 uppercase tracking-widest">Workspace Details</h4>
              <button 
                onClick={() => setShowDetailPanel(false)}
                className="text-zinc-405 hover:text-zinc-800 focus:outline-none text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 flex flex-col items-center justify-center text-center border-b border-zinc-150 dark:border-zinc-850 bg-slate-50/20 dark:bg-zinc-900/40">
              <img 
                src={activeRecipient.avatarUrl} 
                alt={activeRecipient.displayName}
                className="w-20 h-20 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-800 shadow-lg mb-4"
              />
              <h5 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-50">{activeRecipient.displayName}</h5>
              <p className="text-xs text-zinc-500 font-semibold mt-1">@{activeRecipient.username}</p>
              
              {activeRecipient.bio && (
                <div className="text-xs text-zinc-550 dark:text-zinc-400 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 border-dashed leading-relaxed max-w-[220px] italic">
                  "{activeRecipient.bio}"
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5">Metadata Information</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-zinc-100/50 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400">
                    <span className="font-semibold">Security Level</span>
                    <span className="font-mono text-[9px] bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-1.5 py-0.5 rounded">HIGH</span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-zinc-100/50 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400">
                    <span className="font-semibold">Direct Sync ID</span>
                    <span className="font-mono text-[10px] truncate max-w-[120px]">{activeRecipient.id}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Aesthetic Attachments presets</p>
                  <span className="text-[9px] font-semibold text-zinc-400">4 items</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {ATTACHMENT_PRESETS.map((p, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => handleAttachItem('photo', p.url)}
                      className="relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-850 cursor-pointer hover:opacity-85 transition-all"
                      title="Quick publish preset"
                    >
                      <img 
                        src={p.url} 
                        alt="pres" 
                        className="w-full h-14 object-cover" 
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-zinc-950 text-[9px] text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 leading-relaxed font-semibold">
              <span>Encrypted Firebase Direct Transit Node Active. No shared secrets are transferred to third-party endpoints.</span>
            </div>
          </div>
        )}

      </div>

      {/* ==================== 4. FACETIME CALL OVERLAY WIDGET ==================== */}
      {isSimulatingCall && activeRecipient && (
        <div className="fixed top-6 right-6 max-w-sm w-85 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 text-white rounded-3xl shadow-2xl p-4.5 z-50 animate-fade-in select-none">
          <div className="flex items-center gap-3">
            <img 
              src={activeRecipient.avatarUrl} 
              className="w-11 h-11 rounded-xl object-cover border border-zinc-700 shrink-0" 
              alt="calling face"
            />
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-sm truncate">{activeRecipient.displayName}</p>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{callTimer === 0 ? 'Connecting Secures...' : `FaceTime: ${formatTimer(callTimer)}`}</span>
              </div>
            </div>
            
            <button 
              onClick={() => setIsSimulatingCall(null)}
              className="text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 p-1.5 rounded-lg transition-all"
              title="End conversation session"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isSimulatingCall === 'video' && !isVideoOff && (
            <div className="mt-4 relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800/80 flex items-center justify-center">
              <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Video terminal active</span>
              <img 
                src={profile?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=user`} 
                className="absolute bottom-2 right-2 w-11 h-11 rounded-lg border border-zinc-700 object-cover shadow-2xl"
                alt="self camera feedback"
              />
            </div>
          )}

          <div className="mt-4 pt-3.5 border-t border-zinc-800/80 flex justify-between items-center text-xs">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-2.5 rounded-xl transition-all ${isMuted ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'}`}
                title="Toggle microphone"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {isSimulatingCall === 'video' && (
                <button
                  onClick={() => setIsVideoOff(!isVideoOff)}
                  className={`p-2.5 rounded-xl transition-all ${isVideoOff ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'}`}
                  title="Toggle web cam"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={() => setIsSimulatingCall(null)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold tracking-tight shadow-lg shadow-rose-900/15"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
