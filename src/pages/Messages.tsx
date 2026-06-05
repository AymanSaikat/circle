import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, ShieldAlert, Sparkles, User, RefreshCw } from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebaseClient';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
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
}

export const Messages: React.FC = () => {
  const { user, profile } = useAuth();
  const { path } = useRouter();
  
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
  
  const bottomRef = useRef<HTMLDivElement | null>(null);

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
        const snap = await getDocs(collection(db, 'users'));
        const list: UserProfile[] = [];
        snap.forEach(d => {
          if (d.id !== user.uid) {
            list.push({ id: d.id, ...d.data() } as UserProfile);
          }
        });
        setAllUsers(list);

        // If 'to' search param is supplied, auto-select that companion
        const targetSlug = getRecipientFromUrl();
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
    // Push clean state metadata to URL without fully reloading
    const cleanUrl = `${window.location.pathname}?to=${recipient.username}`;
    window.history.pushState(null, '', cleanUrl);
  };

  // 2. Fetch direct messages in real time with security validation
  useEffect(() => {
    if (!user || !activeRecipient) {
      setMessages([]);
      return;
    }

    // Secure query finding messages containing current user's UID
    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: DirectMessage[] = [];
      snap.forEach(d => {
        const data = d.data() as any;
        // Filter on client side so we only handle the chat history between current user & activeRecipient
        const belongsToChat = 
          (data.senderId === user.uid && data.receiverId === activeRecipient.id) ||
          (data.senderId === activeRecipient.id && data.receiverId === user.uid);

        if (belongsToChat) {
          list.push({ id: d.id, ...data } as DirectMessage);
        }
      });

      // Sort client side by chronological timestamps (since indexes could still be provisioning)
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
  }, [messages]);

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
    } catch (err) {
      console.error('Failed to submit direct message securely to Firestore', err);
      // Put message back in input if it failed so user doesn't lose text
      setTypedMessage(textPayload);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex-1 flex bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl m-4 md:m-8 overflow-hidden h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)] shadow-sm select-none">
      {/* 1. Left panel: Contacts index */}
      <div className={`w-full md:w-80 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/45 ${activeRecipient ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col gap-1.5 bg-white dark:bg-zinc-900">
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-zinc-900 dark:text-zinc-105" />
            <span>Circle Messenger</span>
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">Secure 1-on-1 private messaging nodes</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="space-y-3 p-3 animate-pulse">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    <div className="h-2.5 w-32 bg-zinc-150 dark:bg-zinc-850 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : allUsers.length === 0 ? (
            <div className="text-center p-6 text-zinc-400 dark:text-zinc-500 text-xs italic">
              No other publishers found inside registry yet
            </div>
          ) : (
            allUsers.map(u => {
              const isSelected = activeRecipient?.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => handleSelectRecipient(u)}
                  className={`w-full text-left p-3 rounded-2xl flex items-center gap-3 transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-md' 
                      : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 text-zinc-805'
                  }`}
                >
                  <img
                    src={u.avatarUrl}
                    alt={u.displayName}
                    className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`font-bold text-xs truncate ${isSelected ? 'text-white dark:text-zinc-950' : 'text-zinc-900 dark:text-zinc-100'}`}>
                      {u.displayName}
                    </p>
                    <p className={`text-[10px] truncate leading-none mt-1 ${isSelected ? 'text-zinc-300 dark:text-zinc-700' : 'text-zinc-500 dark:text-zinc-450'}`}>
                      @{u.username}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Right panel: Chat messages viewport */}
      <div className={`flex-1 flex flex-col ${!activeRecipient ? 'hidden md:flex items-center justify-center bg-zinc-50 dark:bg-zinc-950/30' : 'flex'}`}>
        {activeRecipient ? (
          <>
            {/* Header section with recipient Info */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <img
                  src={activeRecipient.avatarUrl}
                  alt={activeRecipient.displayName}
                  className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-800"
                />
                <div>
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">{activeRecipient.displayName}</h4>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-450 font-semibold">@{activeRecipient.username}</p>
                </div>
              </div>

              {/* Close companion selection on smaller viewports */}
              <button
                onClick={() => setActiveRecipient(null)}
                className="md:hidden text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                Back to Contacts
              </button>
            </div>

            {/* Live messages flow viewports container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-950/20">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center max-w-xs mx-auto gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                    <Sparkles className="w-5 h-5 text-zinc-550 dark:text-zinc-400" />
                  </div>
                  <h5 className="font-bold text-xs text-zinc-800 dark:text-zinc-205">Secure Line Initialized</h5>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Say hello to @{activeRecipient.username}! Your private messages are encrypted in transit and under strict access controls.
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isOwn = m.senderId === user.uid;
                  return (
                    <div 
                      key={m.id} 
                      className={`flex gap-2.5 max-w-[85%] ${isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      <img
                        src={isOwn ? profile?.avatarUrl : activeRecipient.avatarUrl}
                        alt="sender profile avatar"
                        className="w-7 h-7 rounded-full object-cover shrink-0 select-none bg-white dark:bg-zinc-905 border border-zinc-250 dark:border-zinc-800 self-end"
                      />
                      <div className="flex flex-col gap-0.5">
                        <div 
                          className={`rounded-2xl p-3 text-xs leading-relaxed font-sans overflow-wrap-anywhere ${
                            isOwn 
                              ? 'bg-zinc-900 dark:bg-zinc-150 text-white dark:text-zinc-950 rounded-br-none' 
                              : 'bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 text-zinc-900 dark:text-zinc-100 rounded-bl-none'
                          }`}
                        >
                          {m.text}
                        </div>
                        <span className={`text-[9px] font-mono select-none px-1 mt-0.5 ${isOwn ? 'text-right text-zinc-455 dark:text-zinc-500' : 'text-zinc-455 dark:text-zinc-500'}`}>
                          {m.createdAt ? new Date(m.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              {/* Scroll reference pointer */}
              <div ref={bottomRef} />
            </div>

            {/* Compose message input area */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex gap-2">
              <input
                id="input-direct-message"
                type="text"
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                className="flex-1 bg-zinc-50 dark:bg-zinc-950 font-sans text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 focus:border-zinc-950 dark:focus:border-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-950/10 dark:focus:ring-white/10 placeholder-zinc-450 dark:placeholder-zinc-500 text-zinc-900 dark:text-zinc-100 font-medium transition-all"
                placeholder={`Write message to @${activeRecipient.username}...`}
                disabled={sending}
                maxLength={2000}
                required
              />
              <button
                type="submit"
                id="btn-chat-send"
                disabled={sending || !typedMessage.trim()}
                className="bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-40 text-white dark:text-zinc-950 rounded-xl p-3 transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-xs font-semibold hover:shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="text-center p-8 max-w-sm flex flex-col items-center justify-center gap-4 select-none">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 shadow-xs">
              <MessageSquare className="w-7 h-7 text-zinc-400 dark:text-zinc-500" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Select Conversation Companion</h4>
              <p className="text-zinc-455 dark:text-zinc-500 text-xs mt-1.5 leading-relaxed">
                Choose a registered community publisher from the left contacts sidebar, or click "Chat" on any profile to initiate a secured direct messaging session.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
