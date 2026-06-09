import React, { useState, useRef, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  Shield, 
  Globe, 
  Lock, 
  Eye, 
  Send, 
  X, 
  PlusCircle, 
  Sparkles, 
  Clock, 
  Calendar, 
  Bold, 
  Italic, 
  Code, 
  Quote, 
  Hash, 
  AtSign, 
  Smile, 
  HelpCircle, 
  Check, 
  FileText,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  BarChart3,
  Trash2,
  Plus
} from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebaseClient';
import { useAuth } from '../context/AuthContext';

// Underlay rich categorized emojis inspired by latest Android/FB/Instagram frameworks
interface EmojiPack {
  category: string;
  icon: string;
  emojis: string[];
}

const EMOJI_PACKS: EmojiPack[] = [
  {
    category: "Smileys",
    icon: "😀",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", 
      "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "😒", 
      "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", 
      "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🫣", "🤗", "🫡", "🤔", "🫣", "🤫", "🫠", "🤥",
      "🤖", "👽", "👻", "💀", "☠️", "🎃", "💩", "😈", "👿", "🤡", "👹", "👺", "👀", "👁️", "👣", "👄", "🦷"
    ]
  },
  {
    category: "Love & Hands",
    icon: "❤️",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", 
      "💖", "💘", "💝", "💟", "🕉️", "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", 
      "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", 
      "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🫂", "💍", "👑", "🎩"
    ]
  },
  {
    category: "Nature",
    icon: "🐶",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", 
      "🐧", "🐦", "🐤", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞", 
      "🐜", "🕷️", "🐢", "🐍", "🦎", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", 
      "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🐕", "🐈", "🐓", "🕊️", "🐇", "🐿️", "🦔", "🌵", "🎄", 
      "🌲", "🌳", "🌴", "🌱", "🌿", "🍀", "🍁", "🍂", "🍃", "🍄", "🌾", "🌷", "🌹", "🥀", "🌺", "🌸", "🌼", 
      "🌻", "☀️", "🌙", "⭐", "🌟", "✨", "⚡", "🔥", "🌈", "☄️", "💥", "🪐"
    ]
  },
  {
    category: "Food",
    icon: "🍕",
    emojis: [
      "🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍒", "🍑", "🍍", "🥥", "🥝", 
      "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️", "🫑", "🌽", "🥕", "🥔", "🥐", "🥯", "🍞", "🥖", "🥨", 
      "🧀", "🥚", "🍳", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🌭", "🍔", "🍟", "🍕", "🥪", "🌮", "🌯", 
      "🥗", "🍛", "🍜", "🍲", "🍝", "🍣", "🍱", "🥟", "🍤", "🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", 
      "🥧", "🍫", "🍬", "🍭", "🍮", "🍯", "🥛", "☕", "🫖", "🍵", "🍷", "🍹", "🍺", "🍻", "🥂", "🥃",
      "🍿", "🧋", "🥤", "🧃", "🧉", "🍾"
    ]
  },
  {
    category: "Sports",
    icon: "⚽",
    emojis: [
      "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🏓", "🏸", "🏏", "🏒", "🏹", "🤿", "🥊", "🥋", 
      "⛳", "⛸️", "🎿", "🛷", "🎯", "🎮", "🕹️", "🎰", "🎲", "🧩", "🎨", "🎭", "🎪", "🎤", "🎧", "🎼", "🎹", 
      "🥁", "🎺", "🎸", "🎻", "🎬", "🛹", "🚴", "🏃", "🚶", "🧗", "🧘", "🏆", "🎖️", "🏅", "🥇"
    ]
  },
  {
    category: "Places",
    icon: "✈️",
    emojis: [
      "🚗", "🚕", "🚙", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚜", "🛵", "🏍️", "🚲", "🛴", "🛹", 
      "🚨", "🚥", "🚦", "🛑", "🗺️", "🗽", "🗼", "🏰", "🏯", "🏟️", "🎡", "🎢", "🎠", "🏖️", "🏜️", "⛰️", 
      "🏕️", "⛺", "🏡", "🏠", "🏢", "🏤", "🏥", "🏦", "🏨", "🏪", "🏫", "💒", "🏛️", "🌅", "🌄", "🌇", "🌃", 
      "✈️", "🚀", "🛸", "🌍", "🌎", "🧭", "🚂", "🚁", "⛵", "🚢", "🛰️"
    ]
  },
  {
    category: "Objects",
    icon: "💻",
    emojis: [
      "💻", "🖥️", "🖨️", "⌨️", "🖱️", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🧭", "⏱️", "⏳", 
      "⌚", "🔋", "🔌", "💡", "🔦", "🕯️", "🪙", "💵", "💴", "💶", "💳", "💎", "⚖️", "🔧", "🔨", 
      "⚙️", "🛡️", "🔑", "📦", "📫", "📮", "📝", "📁", "📌", "📍", "📎", "📖", "📕", 
      "🗑️", "🔒", "🔓", "🔔", "📣", "🔮", "🧹", "🧺", "🧬", "🧪", "🧫", "📱", "💾", "💿", "🎥", "📷", "📸"
    ]
  },
  {
    category: "Symbols",
    icon: "🏁",
    emojis: [
      "☮️", "✝️", "☪️", "🕉️", "☸️", "✡️", "🔯", "🕎", "☯️", "☦️", "🛐", "⛎", "♈", "♉", "♊", "♋", "♌", 
      "♍", "♎", "♏", "♐", "♑", "♒", "♓", "🆔", "⚛️", "📳", "📴", "⚠️", "⚡", "⚧️", "❌", "⭕", "🛑", 
      "⛔", "🚫", "💯", "💢", "♨️", "❓", "❔", "❕", "❗️", "🏁", "🚩", "🎌", "🏳️", "🏴", "🏴‍☠️"
    ]
  }
];

interface CircleComposerProps {
  onSuccess: () => void;
}

export const CircleComposer: React.FC<CircleComposerProps> = ({ onSuccess }) => {
  const { profile } = useAuth();
  const [content, setContent] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [publishAt, setPublishAt] = useState<string>('');
  
  // Custom enhanced states for modern UI options
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>('Saved draft');
  const [showPicker, setShowPicker] = useState(false);
  
  // Integrated Polling states
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollDurationDays, setPollDurationDays] = useState(1);
  
  // State for Android categories & query inside the expanded Emoji Picker
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<string>('Smileys');
  const [emojiSearchQuery, setEmojiSearchQuery] = useState<string>('');

  // New scheduling options states (Facebook/Instagram styling)
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [activePickerTab, setActivePickerTab] = useState<'date' | 'time'>('date');
  const [schedYear, setSchedYear] = useState(2026);
  const [schedMonth, setSchedMonth] = useState(5); // June
  const [schedDay, setSchedDay] = useState(5);
  const [schedHour, setSchedHour] = useState(9);
  const [schedMinute, setSchedMinute] = useState(10);
  const [schedAmPm, setSchedAmPm] = useState<'AM' | 'PM'>('PM');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close emoji picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load draft from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('draft_memo_content');
    if (saved) {
      setContent(saved);
      const now = new Date();
      setLastSaved(`Draft loaded at ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);
    }
  }, []);

  const handleContentChange = (val: string) => {
    setContent(val);
    localStorage.setItem('draft_memo_content', val);
    const now = new Date();
    setLastSaved(`Draft auto-saved at ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`);
  };

  // Insert content at cursor helper
  const insertTextAtCursor = (textToInsert: string) => {
    const textarea = document.getElementById("text-text-memo-composer-content") as HTMLTextAreaElement;
    if (!textarea) {
      handleContentChange(content + textToInsert);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    const newVal = currentText.substring(0, start) + textToInsert + currentText.substring(end);
    handleContentChange(newVal);
    
    // Auto-focus and adjust cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + textToInsert.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  // Selection formatting assistant
  const formatSelection = (syntaxBefore: string, syntaxAfter: string, defaultPlaceholder: string = '') => {
    const textarea = document.getElementById("text-text-memo-composer-content") as HTMLTextAreaElement;
    if (!textarea) {
      handleContentChange(content + syntaxBefore + defaultPlaceholder + syntaxAfter);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    
    // Check if there is actual selected text
    const selectedText = currentText.substring(start, end);
    const textToInsert = selectedText 
      ? syntaxBefore + selectedText + syntaxAfter 
      : syntaxBefore + defaultPlaceholder + syntaxAfter;
    
    const newVal = currentText.substring(0, start) + textToInsert + currentText.substring(end);
    handleContentChange(newVal);
    
    // Auto-focus and adjust selection range
    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        // select the entire newly wrapped text
        textarea.setSelectionRange(start, start + textToInsert.length);
      } else {
        // select only the default placeholder, so typing immediately overwrites it
        const newStart = start + syntaxBefore.length;
        const newEnd = newStart + defaultPlaceholder.length;
        textarea.setSelectionRange(newStart, newEnd);
      }
    }, 50);
  };

  // Instant emoji insertion
  const handleEmojiClick = (emoji: string) => {
    insertTextAtCursor(emoji);
  };

  // Post starter / Mood tag injection
  const applyMoodFilter = (moodLabel: string, codeToInject: string) => {
    if (codeToInject.startsWith('#')) {
      const spacing = content.endsWith(' ') || content.length === 0 ? '' : ' ';
      handleContentChange(content + spacing + codeToInject);
    } else {
      const spacing = content.length === 0 ? '' : '\n';
      handleContentChange(content + spacing + codeToInject);
    }
  };

  // Compress and convert image file to Base64 (max width 800px)
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 800;
        
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
          setMediaUrls(prev => [...prev, compressedDataUrl]);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setError(null);
      Array.from(e.target.files).forEach(processImageFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    setError(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(processImageFile);
    }
  };

  const removeMedia = (index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!content.trim() && mediaUrls.length === 0) {
      setError('Please add some text or an image before sharing.');
      return;
    }

    setLoading(true);
    setError(null);

    // Dynamic hashtag parser
    const hashtagRegex = /#([\w]+)/g;
    const tags: string[] = [];
    let match;
    while ((match = hashtagRegex.exec(content)) !== null) {
      const parsed = match[1].toLowerCase().trim();
      if (!tags.includes(parsed)) {
        tags.push(parsed);
      }
    }

    let publishAtTimestamp = null;
    if (isScheduling && publishAt) {
      const scheduledDate = new Date(publishAt);
      if (scheduledDate <= new Date()) {
        setError('Scheduled release date and time must be in the future.');
        setLoading(false);
        return;
      }
      publishAtTimestamp = Timestamp.fromDate(scheduledDate);
    }

    try {
      const memosRef = collection(db, 'memos');
      const memoPayload: any = {
        userId: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        content: content,
        mediaUrls: mediaUrls,
        visibility: visibility,
        tags: tags,
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp(),
      };

      if (showPollCreator) {
        const trimmedQuestion = pollQuestion.trim();
        const nonExpiredOptions = pollOptions.map(o => o.trim()).filter(Boolean);
        
        if (!trimmedQuestion) {
          setError('Please provide a title or question for your poll.');
          setLoading(false);
          return;
        }
        if (nonExpiredOptions.length < 2) {
          setError('Please provide at least 2 non-empty options for voting.');
          setLoading(false);
          return;
        }
        
        const expires = new Date();
        expires.setDate(expires.getDate() + pollDurationDays);
        
        const initialVotes: Record<string, string[]> = {};
        nonExpiredOptions.forEach((_, optIdx) => {
          initialVotes[String(optIdx)] = [];
        });
        
        memoPayload.poll = {
          question: trimmedQuestion,
          options: nonExpiredOptions,
          votes: initialVotes,
          expiresAt: expires.toISOString()
        };
      }

      if (publishAtTimestamp) {
        memoPayload.publishAt = publishAtTimestamp;
      }

      const docRef = await addDoc(memosRef, memoPayload);
      const memoId = docRef.id;

      // Mentions parsing & notification writes
      const mentionRegex = /@([\w\-]+)/g;
      const mentions: string[] = [];
      let mentionMatch;
      while ((mentionMatch = mentionRegex.exec(content)) !== null) {
        const parsedMention = mentionMatch[1].toLowerCase().trim();
        if (!mentions.includes(parsedMention)) {
          mentions.push(parsedMention);
        }
      }

      if (mentions.length > 0) {
        Promise.all(mentions.map(async (m) => {
          try {
            const userClaimRef = doc(db, 'usernames', m);
            const userClaimSnap = await getDoc(userClaimRef);
            if (userClaimSnap.exists()) {
              const targetUserId = userClaimSnap.data().userId;
              if (targetUserId !== profile.id) { // Not notifying oneself
                const notifRef = collection(db, 'users', targetUserId, 'notifications');
                await addDoc(notifRef, {
                  senderId: profile.id,
                  senderUsername: profile.username,
                  senderDisplayName: profile.displayName,
                  senderAvatarUrl: profile.avatarUrl,
                  type: 'mention',
                  memoId: memoId,
                  text: content.slice(0, 100),
                  createdAt: serverTimestamp()
                });
              }
            }
          } catch (err) {
            console.error('Mention notifications dispatch failure for', m, err);
          }
        })).catch((err) => console.error('Mentions dispatcher error', err));
      }
      
      // Cleanup
      setContent('');
      localStorage.removeItem('draft_memo_content');
      setMediaUrls([]);
      setVisibility('public');
      setIsScheduling(false);
      setPublishAt('');
      setActiveTab('write');
      setShowPollCreator(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setPollDurationDays(1);
      onSuccess();
    } catch (err: any) {
      console.error('Error creating memo', err);
      setError('Could not publish to Circle. Security status check failed.');
      try {
        handleFirestoreError(err, OperationType.CREATE, 'memos');
      } catch (logErr) {}
    } finally {
      setLoading(false);
    }
  };

  // Computes relative schedule display summary
  const getScheduleSummary = () => {
    if (!publishAt) return "Select schedule time";
    const d = new Date(publishAt);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    if (diffMs <= 0) return "⚠️ Slated time is in the past";
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 60) return `Slated to launch in ~${diffMins} minutes (${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    if (diffHrs < 24) return `Slated to launch in ~${diffHrs} hours (${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    return `Slated to launch in ~${diffDays} days (${d.toLocaleDateString()})`;
  };

  // Helper functions for Facebook/Instagram scheduling design
  const initSchedulingStates = (baseDate?: Date) => {
    const d = baseDate || new Date();
    setSchedYear(d.getFullYear());
    setSchedMonth(d.getMonth());
    setSchedDay(d.getDate());
    
    const rawHour = d.getHours();
    const ampmVal = rawHour >= 12 ? 'PM' : 'AM';
    setSchedAmPm(ampmVal);
    
    let formattedHour = rawHour % 12;
    if (formattedHour === 0) formattedHour = 12;
    setSchedHour(formattedHour);
    setSchedMinute(d.getMinutes());
  };

  const getFormattedScheduleDate = () => {
    const mArray = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${mArray[schedMonth]} ${schedDay}, ${schedYear}`;
  };

  const getFormattedScheduleTime = () => {
    const minStr = String(schedMinute).padStart(2, '0');
    return `${schedHour}:${minStr} ${schedAmPm}`;
  };

  const constructPublishAt = (y: number, m: number, d: number, hr: number, min: number, ampm: 'AM' | 'PM') => {
    let h24 = hr;
    if (ampm === 'PM' && hr < 12) {
      h24 = hr + 12;
    } else if (ampm === 'AM' && hr === 12) {
      h24 = 0;
    }
    const yearStr = String(y);
    const monthStr = String(m + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const hourStr = String(h24).padStart(2, '0');
    const minStr = String(min).padStart(2, '0');
    return `${yearStr}-${monthStr}-${dayStr}T${hourStr}:${minStr}`;
  };

  const getDaysInMonth = () => {
    const count = new Date(schedYear, schedMonth + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => i + 1);
  };

  // Simple custom parser for live previews to show high fidelity layout before posting
  const renderPreviewRenderer = () => {
    if (!content.trim()) {
      return (
        <div className="text-center py-12 text-zinc-400 dark:text-zinc-600 italic text-xs select-none">
          Nothing written yet. Write some text in the "Edit Content" tab to see your live preview render here!
        </div>
      );
    }

    const lines = content.split('\n');
    return (
      <div className="prose prose-zinc max-w-none text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap select-text break-words font-sans flex flex-col gap-1.5">
        {lines.map((lineText, idx) => {
          // Let's first check if it begins with blockquote mark
          const isBlockQuote = lineText.startsWith('> ') || lineText.startsWith('>');
          let activeText = lineText;
          if (isBlockQuote) {
            activeText = lineText.startsWith('> ') ? lineText.substring(2) : lineText.substring(1);
          }

          // Regex to tokenize Bold, Italic, Inline Code, Mention, Hashtags, and URLs
          const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|@[a-zA-Z0-9_\-]+|#[a-zA-Z0-9_]+|https?:\/\/[^\s]+)/g;
          const parts = activeText.split(regex);

          const renderedElements = parts.map((part, pIdx) => {
            if (!part) return null;

            // Bold (**bold**)
            if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
              return (
                <strong key={pIdx} className="font-extrabold text-zinc-950 dark:text-white">
                  {part.slice(2, -2)}
                </strong>
              );
            }

            // Italic (*italic*)
            if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
              return (
                <em key={pIdx} className="italic text-zinc-750 dark:text-zinc-350">
                  {part.slice(1, -1)}
                </em>
              );
            }

            // Inline Code (`code`)
            if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
              return (
                <code key={pIdx} className="bg-zinc-100 dark:bg-zinc-800 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold">
                  {part.slice(1, -1)}
                </code>
              );
            }

            // Mention (@username)
            if (part.startsWith('@') && part.length > 1) {
              return (
                <span key={pIdx} className="text-[#1877f2] font-semibold">
                  {part}
                </span>
              );
            }

            // Hashtag (#tag)
            if (part.startsWith('#') && part.length > 1) {
              return (
                <span key={pIdx} className="text-zinc-950 dark:text-zinc-100 font-extrabold bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
                  {part}
                </span>
              );
            }

            // Web links
            if (/^https?:\/\/[^\s]+$/i.test(part)) {
              let displayUrl = part;
              try {
                const urlObj = new URL(part);
                displayUrl = urlObj.hostname + (urlObj.pathname.length > 10 ? urlObj.pathname.slice(0, 10) + '...' : urlObj.pathname);
              } catch (_) {}
              return (
                <span key={pIdx} className="text-[#1877f2] underline font-medium">
                  {displayUrl}
                </span>
              );
            }

            // Plain text
            return <span key={pIdx}>{part}</span>;
          });

          if (isBlockQuote) {
            return (
              <blockquote key={idx} className="border-l-4 border-zinc-300 dark:border-zinc-700 pl-3 py-1 my-1 italic text-zinc-500 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-r-xl pr-2 inline-block">
                {renderedElements}
              </blockquote>
            );
          }

          return <p key={idx} className="min-h-[1.25em] m-0">{renderedElements}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs mb-6 select-none">
      {/* Redesigned Rich Header: tab selection + status indicators */}
      <div className="flex items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-850 pb-4 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img 
              src={profile?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"} 
              alt={profile?.displayName}
              className="w-10 h-10 rounded-full object-cover border border-zinc-150 dark:border-zinc-800"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-zinc-950 dark:bg-white flex items-center justify-center border-2 border-white dark:border-zinc-900 text-[8px] text-white dark:text-zinc-950 font-bold">
              {visibility === 'public' ? 'GP' : visibility === 'followers' ? 'FL' : 'PV'}
            </div>
          </div>
          <div>
            <h4 className="font-bold text-xs text-zinc-900 dark:text-white leading-tight">
              {profile?.displayName || "Anonymous Creator"}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 font-mono leading-none">
                @{profile?.username}
              </span>
              <span className="text-[9px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded-md font-mono select-none">
                Publishing to {visibility}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Switchers: Write vs Preview */}
        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200/40 dark:border-zinc-850/40 ml-auto select-none">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'write'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-450 hover:text-zinc-900 dark:hover:text-zinc-150'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Edit Content</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-450 hover:text-zinc-900 dark:hover:text-zinc-150'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Live Preview</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {activeTab === 'write' ? (
          <>
            {/* Editor Input wrapper with character circle bar inside */}
            <div className="relative group">
              <textarea
                id="text-text-memo-composer-content"
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                placeholder="Share clean insights, markdown, and files with your Circle..."
                className={`w-full min-h-[140px] bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-450 dark:placeholder-zinc-500 rounded-2xl p-5 border transition-all text-xs focus:outline-none resize-y pointer-events-auto leading-relaxed shadow-xs ${
                  isDragActive 
                    ? 'border-zinc-900 dark:border-white ring-2 ring-zinc-900/10 dark:ring-white/10 bg-zinc-100 dark:bg-zinc-900' 
                    : 'border-zinc-200 dark:border-zinc-800 focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900/10 dark:focus:ring-white/10'
                }`}
                disabled={loading}
              />
              
              {/* Draft auto-saved feedback (no percentage meter) */}
              <div className="absolute bottom-4 right-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800 shadow-xs pointer-events-none">
                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-550 font-mono tracking-tight select-none">
                  {lastSaved}
                </span>
              </div>
            </div>

            {/* Active Attachment Previews Strip (if any files are attached) */}
            {mediaUrls.length > 0 && (
              <div className="flex flex-wrap gap-2.5 pb-1 select-none animate-fade-in">
                {mediaUrls.map((url, i) => (
                  <div key={i} className="relative group w-14 h-14 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xs shrink-0">
                    <img src={url} alt="upload preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeMedia(i)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/75 hover:bg-red-600 text-white transition-all cursor-pointer hover:scale-110"
                      title="Remove media"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-14 h-14 rounded-xl flex flex-col items-center justify-center border border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-white bg-white dark:bg-zinc-900 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all gap-1 cursor-pointer select-none"
                  title="Attach more files"
                >
                  <PlusCircle className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Poll Creator block - clean modern card style */}
            {showPollCreator && (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex flex-col gap-3 animate-fade-in my-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-[#1877f2]" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-sans">Create a Poll</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPollCreator(false)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-850 transition-all cursor-pointer"
                    title="Remove Poll"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    id="poll-question-input"
                    placeholder="Ask a question..."
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-450 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-sans"
                  />

                  <div className="flex flex-col gap-1.5 mt-1">
                    {pollOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          id={`poll-option-${idx}`}
                          placeholder={`Option ${idx + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...pollOptions];
                            newOpts[idx] = e.target.value;
                            setPollOptions(newOpts);
                          }}
                          className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-450 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-sans"
                        />
                        {pollOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newOpts = pollOptions.filter((_, i) => i !== idx);
                              setPollOptions(newOpts);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-red-650 dark:hover:text-red-400 rounded-lg transition-all hover:bg-red-50 dark:hover:bg-red-955/20 cursor-pointer"
                            title="Delete option"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {pollOptions.length < 5 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions([...pollOptions, ''])}
                      className="mt-1 self-start flex items-center gap-1 text-[10px] font-bold text-[#1877f2] dark:text-[#a8c7fa] hover:underline cursor-pointer bg-transparent py-1 px-1.5 rounded"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add option</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-2.5 mt-1 text-[10px] text-zinc-450 dark:text-zinc-500 font-mono">
                  <span>Poll Duration:</span>
                  <select
                    value={pollDurationDays}
                    onChange={(e) => setPollDurationDays(Number(e.target.value))}
                    className="p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[10px] font-mono text-zinc-800 dark:text-zinc-200 cursor-pointer"
                  >
                    <option value={1}>1 Day</option>
                    <option value={3}>3 Days</option>
                    <option value={7}>7 Days</option>
                  </select>
                </div>
              </div>
            )}

            {/* Formatting Assistant toolbar (New option block requested) */}
            <div className="flex items-center justify-between gap-3 flex-wrap bg-zinc-50 dark:bg-zinc-950 p-2 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/60 shadow-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                
                <button
                  type="button"
                  onClick={() => formatSelection('**', '**', 'boldText')}
                  className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-900 transition-all cursor-pointer"
                  title="Make selection bold (**bold**)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => formatSelection('*', '*', 'italicText')}
                  className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-900 transition-all cursor-pointer"
                  title="Make selection italic (*italic*)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => formatSelection('`', '`', 'inlineCode')}
                  className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-900 transition-all cursor-pointer"
                  title="Add inline code snippet (`code`)"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => formatSelection('\n> ', '\n', 'BlockQuote')}
                  className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-900 transition-all cursor-pointer"
                  title="Insert blockquote (> quotation)"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => formatSelection('#', '', '')}
                  className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-900 transition-all cursor-pointer"
                  title="Insert a hashtag"
                >
                  <Hash className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => formatSelection('@', '', '')}
                  className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-900 transition-all cursor-pointer"
                  title="Mention a publisher login handle"
                >
                  <AtSign className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-3.5 bg-zinc-200 dark:bg-zinc-800 mx-1" />

                {/* Attach Media files icon-only button under Formats */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-900 transition-all cursor-pointer"
                  title="Attach media files (JPG, PNG, WEBP)"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowPollCreator(!showPollCreator)}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    showPollCreator 
                      ? 'text-[#1877f2] dark:text-[#a8c7fa] bg-zinc-200/80 dark:bg-zinc-800' 
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-900'
                  }`}
                  title="Create or attach a Poll"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Single-button Popover Emoji Picker - Redesigned Android/FB/Instagram style */}
              <div className="relative" ref={pickerRef}>
                <button
                  type="button"
                  onClick={() => setShowPicker(!showPicker)}
                  className={`p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer ${
                    showPicker ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white' : ''
                  }`}
                  title="Choose an official emoji"
                >
                  <Smile className="w-3.5 h-3.5" />
                </button>

                {showPicker && (
                  <>
                    <div className="fixed inset-0 z-50 sm:hidden" onClick={() => setShowPicker(false)}/>
                    <div className="fixed sm:absolute bottom-0 sm:bottom-full left-0 right-0 sm:left-auto sm:right-0 sm:mb-2 z-55 w-full sm:w-80 h-[60vh] sm:h-auto bg-white dark:bg-zinc-950 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] sm:shadow-xl overflow-hidden animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 flex flex-col pointer-events-auto pb-safe-bottom">
                      {/* Mobile Handle */}
                      <div className="w-12 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mt-4 mb-2 sm:hidden shrink-0" />
                      
                      {/* Popover Header */}
                    <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 select-none flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-mono">Android Emoji Pack</span>
                        <button
                          type="button"
                          onClick={() => setShowPicker(false)}
                          className="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="Search all emojis..."
                        value={emojiSearchQuery}
                        onChange={(e) => setEmojiSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 text-[11px] placeholder-zinc-450 dark:placeholder-zinc-500 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500 transition-all font-sans"
                        autoFocus
                      />
                    </div>

                    {/* Category tabs if not searching */}
                    {!emojiSearchQuery && (
                      <div className="flex items-center gap-1 overflow-x-auto px-2 py-1.5 bg-zinc-100/50 dark:bg-zinc-900/40 border-b border-zinc-100 dark:border-zinc-800 scrollbar-none select-none shrink-0">
                        {EMOJI_PACKS.map((pack) => (
                          <button
                            key={pack.category}
                            type="button"
                            onClick={() => setActiveEmojiCategory(pack.category)}
                            title={pack.category}
                            className={`p-1.5 text-xs rounded-lg transition-all shrink-0 cursor-pointer ${
                              activeEmojiCategory === pack.category
                                ? 'bg-white dark:bg-zinc-800 shadow-xs scale-105 font-extrabold'
                                : 'opacity-60 hover:opacity-100'
                            }`}
                          >
                            <span className="font-emoji">{pack.icon}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Scrollable Emojis Container */}
                    <div className="p-3 max-h-[220px] overflow-y-auto select-none font-sans scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                      {emojiSearchQuery ? (
                        (() => {
                          const query = emojiSearchQuery.toLowerCase().trim();
                          const matched: string[] = [];
                          
                          EMOJI_PACKS.forEach(p => {
                            p.emojis.forEach(e => {
                              if (e.includes(query) || p.category.toLowerCase().includes(query)) {
                                matched.push(e);
                              }
                            });
                          });

                          if (matched.length === 0) {
                            return <p className="text-[10px] text-zinc-450 dark:text-zinc-550 text-center py-6 italic font-sans">No matching emojis found</p>;
                          }

                          return (
                            <div>
                              <div className="text-[9px] font-bold text-zinc-400 dark:text-zinc-505 uppercase tracking-wide mb-2 select-none">Search results ({matched.length})</div>
                              <div className="grid grid-cols-8 gap-1.5">
                                {matched.map((e, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleEmojiClick(e)}
                                    className="p-1 text-base font-emoji hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-all text-center cursor-pointer hover:scale-120 duration-75 active:scale-95"
                                  >
                                    {e}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        (() => {
                          const pack = EMOJI_PACKS.find(p => p.category === activeEmojiCategory) || EMOJI_PACKS[0];
                          return (
                            <div>
                              <div className="text-[9px] font-bold text-[#1877f2] dark:text-[#a8c7fa] uppercase tracking-wider mb-2 select-none flex items-center gap-1">
                                <span className="font-emoji">{pack.icon}</span>
                                <span>{pack.category}</span>
                              </div>
                              <div className="grid grid-cols-8 gap-1.5">
                                {pack.emojis.map((e, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleEmojiClick(e)}
                                    className="p-1 text-base font-emoji hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-all text-center cursor-pointer hover:scale-125 duration-75 active:scale-95"
                                  >
                                    {e}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </div>
                  </>
                )}
              </div>

            </div>
          </>
        ) : (
          /* Live Preview rendering block matching standard publications */
          <div className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/75 shadow-xs max-h-[300px] overflow-y-auto">
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-mono font-bold text-zinc-400 dark:text-zinc-550 mb-3 select-none">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-zinc-900 dark:text-white" />
              <span>Real-Time WYSIWYG Publication Preview</span>
            </div>
            {renderPreviewRenderer()}

            {mediaUrls.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 mt-4 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                {mediaUrls.map((x, idx) => (
                  <div key={idx} className="w-14 h-14 rounded-lg bg-zinc-200 overflow-hidden border border-zinc-300 dark:border-zinc-800 shrink-0">
                    <img src={x} alt="pvw attachment" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 text-red-650 dark:text-red-400 text-[11px] p-3 rounded-xl flex items-center gap-2 font-bold animate-fade-in my-0.5">
            <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
            <span>✕ Error: {error}</span>
          </div>
        )}

        {/* Modern Facebook/Instagram style wide horizontal trigger bar button */}
        <button
          type="button"
          onClick={() => {
            if (!publishAt) {
              const d = new Date();
              d.setHours(d.getHours() + 1);
              initSchedulingStates(d);
            } else {
              initSchedulingStates(new Date(publishAt));
            }
            setShowScheduleModal(true);
          }}
          className="w-full bg-zinc-50 hover:bg-zinc-100/80 dark:bg-zinc-950/40 dark:hover:bg-zinc-950/80 active:scale-[0.99] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between transition-all shadow-xs mt-2 pointer-events-auto text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-950 shrink-0 shadow-xs">
              <Clock className="w-5 h-5 text-white dark:text-zinc-950" />
            </div>
            <div>
              <h5 className="font-semibold text-sm text-zinc-900 dark:text-white leading-tight">Scheduling options</h5>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium leading-tight">
                {isScheduling && publishAt ? (
                  <span className="text-[#1877f2] font-black flex items-center gap-1 leading-none select-none">
                    📅 {new Date(publishAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(publishAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : (
                  "Publish now"
                )}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-400 dark:text-zinc-600 shrink-0" />
        </button>

        {/* Footer controls: quick visibility switches + scheduling toggle + share btn */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-5 mt-1 select-none">
          <div className="flex items-center flex-wrap gap-2.5">
            <div className="flex items-center gap-1">
              {/* Globe selector */}
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer hover:scale-102 ${
                  visibility === 'public'
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm font-extrabold'
                    : 'bg-zinc-100 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-455 hover:text-zinc-900 dark:hover:text-white'
                }`}
                title="Visible on chronological public dashboard streams"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Public Link</span>
              </button>

              {/* Followers selector */}
              <button
                type="button"
                onClick={() => setVisibility('followers')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer hover:scale-102 ${
                  visibility === 'followers'
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm font-extrabold'
                    : 'bg-zinc-100 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-455 hover:text-zinc-900 dark:hover:text-white'
                }`}
                title="Visible only to authorized follow network"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Followers Only</span>
              </button>

              {/* Private selector */}
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer hover:scale-102 ${
                  visibility === 'private'
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm font-extrabold'
                    : 'bg-zinc-100 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-455 hover:text-zinc-900 dark:hover:text-white'
                }`}
                title="Locked strictly under personal Private Journals"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Private Diary</span>
              </button>
            </div>

            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800" />

            {/* Toggle future publication schedule option */}
            <button
              type="button"
              onClick={() => {
                if (!publishAt) {
                  const d = new Date();
                  d.setHours(d.getHours() + 1);
                  initSchedulingStates(d);
                } else {
                  initSchedulingStates(new Date(publishAt));
                }
                setShowScheduleModal(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                isScheduling
                  ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border border-transparent shadow-xs font-black scale-102'
                  : 'bg-zinc-100 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800 text-zinc-550 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isScheduling ? 'Scheduled active' : 'Schedule'}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Guide Help toggle */}
            <button
              type="button"
              onClick={() => setShowHelpGuide(!showHelpGuide)}
              className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-450 hover:text-zinc-905 dark:hover:text-white transition-all cursor-pointer"
              title="Markdown & Privacy formatting guide"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Submit post Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold bg-zinc-950 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-950 shadow-md shadow-zinc-200/50 dark:shadow-none cursor-pointer hover:scale-102 transition-all text-xs disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 animate-pulse" />
              <span>{loading ? 'Sharing insights...' : 'Share to Circle'}</span>
            </button>
          </div>
        </div>

        {/* Markdown & Format Quick Cheat-sheet Drawer */}
        {showHelpGuide && (
          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 mt-2 select-text animate-fade-in font-sans">
            <h5 className="font-bold text-zinc-900 dark:text-white mb-2 uppercase tracking-wider text-[10px] flex items-center gap-1 select-none">
              <Sparkles className="w-3.5 h-3.5 text-zinc-900 dark:text-white" />
              Circle Style Guide & Privacy Handbook
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-bold text-zinc-800 dark:text-zinc-200 mb-1 select-none">Formatting tips:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Use <strong className="font-bold text-zinc-900 dark:text-white">**word**</strong> to highlight keyword points in bold.</li>
                  <li>Use <em className="italic">*word*</em> for emphasizing terms.</li>
                  <li>Use <code className="bg-zinc-200/60 dark:bg-zinc-800 px-1 rounded font-mono font-bold">`yourCode`</code> for inline monospace text.</li>
                  <li>Start lines with <strong className="font-bold text-zinc-800 dark:text-zinc-300">&gt; Quote</strong> to trigger clean quotes.</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-zinc-800 dark:text-zinc-200 mb-1 select-none">Global Discovery Triggers:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Add descriptive <strong className="font-bold text-zinc-900 dark:text-white">#hashtags</strong> to index your post dynamically.</li>
                  <li>Type <strong className="font-bold text-zinc-905 dark:text-white">@username</strong> to mention other members and issue alerts.</li>
                  <li>Select <strong className="font-bold text-zinc-905 dark:text-white">Private Diary</strong> to isolate logs strictly to your own eyes.</li>
                </ul>
              </div>
            </div>
            <p className="mt-3 border-t border-zinc-200 dark:border-zinc-800 pt-2 text-[10px] text-zinc-450 dark:text-zinc-505 select-none font-mono">
              Auto-saved draft values are automatically restored if you close or refresh this page.
            </p>
          </div>
        )}
      </form>

      {/* Facebook/Instagram Style Scheduling Options Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-[100] flex sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-fade-in select-none items-end">
          {/* Modal Card */}
          <div className="w-full sm:max-w-md bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] sm:shadow-2xl p-6 sm:p-6 relative flex flex-col gap-4 animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 text-zinc-900 dark:text-white select-none pb-safe-bottom">
            <div className="w-12 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-2 sm:hidden shrink-0" />
            {/* Header / Nav */}
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-605 dark:text-zinc-400 cursor-pointer transition-all active:scale-95"
                title="Go Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white font-sans text-center flex-1">
                Scheduling options
              </h4>
              
              <div className="w-8" />
            </div>

            {/* Instruction */}
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed py-0.5">
              Choose a date and time in the future when you want your post to be published.
            </p>

            {/* Two Side-By-Side Option Cards matches mockup directly */}
            <div className="grid grid-cols-2 gap-3 mt-1 select-none">
              {/* Date Option Card */}
              <button
                type="button"
                onClick={() => setActivePickerTab('date')}
                className={`flex flex-col gap-1.5 p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                  activePickerTab === 'date'
                    ? 'border-zinc-950 dark:border-white bg-zinc-50/50 dark:bg-zinc-950/40 ring-1 ring-zinc-900/10 dark:ring-white/10 shadow-xs'
                    : 'border-zinc-200 hover:border-zinc-350 dark:border-zinc-800 dark:hover:border-zinc-750 bg-white/20 dark:bg-zinc-900/20'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Calendar className={`w-4 h-4 ${activePickerTab === 'date' ? 'text-zinc-950 dark:text-white' : 'text-zinc-400'}`} />
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-405 dark:text-zinc-500">Date</span>
                </div>
                <span className="text-xs font-bold text-zinc-850 dark:text-zinc-100 mt-1">
                  {getFormattedScheduleDate()}
                </span>
              </button>

              {/* Time Option Card */}
              <button
                type="button"
                onClick={() => setActivePickerTab('time')}
                className={`flex flex-col gap-1.5 p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                  activePickerTab === 'time'
                    ? 'border-zinc-950 dark:border-white bg-zinc-50/50 dark:bg-zinc-900/40 ring-1 ring-zinc-900/10 dark:ring-white/10 shadow-xs'
                    : 'border-zinc-200 hover:border-zinc-350 dark:border-zinc-800 dark:hover:border-zinc-750 bg-white/20 dark:bg-zinc-900/20'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Clock className={`w-4 h-4 ${activePickerTab === 'time' ? 'text-zinc-950 dark:text-white' : 'text-zinc-400'}`} />
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-405 dark:text-zinc-500">Time</span>
                </div>
                <span className="text-xs font-bold text-zinc-850 dark:text-zinc-100 mt-1">
                  {getFormattedScheduleTime()}
                </span>
              </button>
            </div>

            {/* Custom high contrast iOS wheel select pickers */}
            <div className="bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-800/60 rounded-2xl p-4 flex flex-col items-center justify-center relative min-h-[190px]">
              {activePickerTab === 'date' ? (
                /* DATE CUSTOM WHEEL SCROLL PICKER */
                <div className="flex gap-4 w-full h-[140px] relative select-none">
                  {/* Subtle Focused Selection Central Horizontal Bar Accent */}
                  <div className="absolute left-0 right-0 top-[50px] h-[36px] bg-zinc-200/40 dark:bg-zinc-800/40 border-y border-zinc-200 dark:border-zinc-700/30 rounded-lg pointer-events-none" />

                  {/* Top & Bottom Overlay Gradients for smooth wheel fade */}
                  <div className="absolute top-0 left-0 right-0 h-[35px] bg-gradient-to-b from-zinc-50 to-transparent dark:from-zinc-900/40 pointer-events-none z-10" />
                  <div className="absolute bottom-0 left-0 right-0 h-[35px] bg-gradient-to-t from-zinc-50 to-transparent dark:from-zinc-900/40 pointer-events-none z-10" />

                  {/* Month Wheel Column */}
                  <div className="flex-1 flex flex-col items-center overflow-hidden h-full z-0">
                    <span className="text-[8px] font-extrabold text-[#1877f2] uppercase tracking-widest mb-1 select-none">Month</span>
                    <div className="w-full overflow-y-auto scrollbar-none flex flex-col items-center gap-0.5 py-10 h-full scroll-smooth">
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setSchedMonth(idx)}
                          className={`w-full py-1 text-center text-xs font-bold cursor-pointer transition-all duration-100 shrink-0 ${
                            schedMonth === idx
                              ? 'text-zinc-950 dark:text-white font-black scale-110'
                              : 'text-zinc-405 hover:text-zinc-700 dark:text-zinc-400'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Day Wheel Column */}
                  <div className="flex-1 flex flex-col items-center overflow-hidden h-full z-0">
                    <span className="text-[8px] font-extrabold text-[#1877f2] uppercase tracking-widest mb-1 select-none">Day</span>
                    <div className="w-full overflow-y-auto scrollbar-none flex flex-col items-center gap-0.5 py-10 h-full scroll-smooth">
                      {getDaysInMonth().map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setSchedDay(d)}
                          className={`w-full py-1 text-center text-xs font-bold cursor-pointer transition-all duration-100 shrink-0 ${
                            schedDay === d
                              ? 'text-zinc-950 dark:text-white font-black scale-110'
                              : 'text-zinc-405 hover:text-zinc-700 dark:text-zinc-400'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Year Wheel Column */}
                  <div className="flex-1 flex flex-col items-center overflow-hidden h-full z-0">
                    <span className="text-[8px] font-extrabold text-[#1877f2] uppercase tracking-widest mb-1 select-none">Year</span>
                    <div className="w-full overflow-y-auto scrollbar-none flex flex-col items-center gap-0.5 py-10 h-full scroll-smooth">
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                        <button
                          key={y}
                          type="button"
                          onClick={() => setSchedYear(y)}
                          className={`w-full py-1 text-center text-xs font-bold cursor-pointer transition-all duration-100 shrink-0 ${
                            schedYear === y
                              ? 'text-zinc-950 dark:text-white font-black scale-110'
                              : 'text-zinc-405 hover:text-zinc-700 dark:text-zinc-400'
                          }`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* TIME CUSTOM WHEEL SCROLL PICKER */
                <div className="flex gap-4 w-full h-[140px] relative select-none">
                  {/* Subtle Focused Selection Central Horizontal Bar Accent */}
                  <div className="absolute left-0 right-0 top-[50px] h-[36px] bg-zinc-200/40 dark:bg-zinc-800/40 border-y border-zinc-200 dark:border-zinc-700/30 rounded-lg pointer-events-none" />

                  {/* Top & Bottom Overlay Gradients for smooth wheel fade */}
                  <div className="absolute top-0 left-0 right-0 h-[35px] bg-gradient-to-b from-zinc-50 to-transparent dark:from-zinc-900/40 pointer-events-none z-10" />
                  <div className="absolute bottom-0 left-0 right-0 h-[35px] bg-gradient-to-t from-zinc-50 to-transparent dark:from-zinc-900/40 pointer-events-none z-10" />

                  {/* Hour Wheel Column */}
                  <div className="flex-1 flex flex-col items-center overflow-hidden h-full z-0">
                    <span className="text-[8px] font-extrabold text-[#1877f2] uppercase tracking-widest mb-1 select-none">Hour</span>
                    <div className="w-full overflow-y-auto scrollbar-none flex flex-col items-center gap-0.5 py-10 h-full scroll-smooth">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setSchedHour(h)}
                          className={`w-full py-1 text-center text-xs font-bold cursor-pointer transition-all duration-100 shrink-0 ${
                            schedHour === h
                              ? 'text-zinc-955 dark:text-white font-black scale-110'
                              : 'text-zinc-405 hover:text-zinc-705 dark:text-zinc-400'
                          }`}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Minute Wheel Column */}
                  <div className="flex-1 flex flex-col items-center overflow-hidden h-full z-0">
                    <span className="text-[8px] font-extrabold text-[#1877f2] uppercase tracking-widest mb-1 select-none">Minute</span>
                    <div className="w-full overflow-y-auto scrollbar-none flex flex-col items-center gap-0.5 py-10 h-full scroll-smooth">
                      {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setSchedMinute(m)}
                          className={`w-full py-1 text-center text-xs font-bold cursor-pointer transition-all duration-100 shrink-0 ${
                            schedMinute === m
                              ? 'text-zinc-955 dark:text-white font-black scale-110'
                              : 'text-zinc-405 hover:text-zinc-705 dark:text-zinc-400'
                          }`}
                        >
                          {String(m).padStart(2, '0')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* AM/PM Wheel Column */}
                  <div className="flex-1 flex flex-col items-center overflow-hidden h-full z-0">
                    <span className="text-[8px] font-extrabold text-[#1877f2] uppercase tracking-widest mb-1 select-none">Period</span>
                    <div className="w-full overflow-y-auto scrollbar-none flex flex-col items-center gap-0.5 py-10 h-full scroll-smooth">
                      {['AM', 'PM'].map((ap) => (
                        <button
                          key={ap}
                          type="button"
                          onClick={() => setSchedAmPm(ap as 'AM' | 'PM')}
                          className={`w-full py-1 text-center text-xs font-bold cursor-pointer transition-all duration-100 shrink-0 ${
                            schedAmPm === ap
                              ? 'text-zinc-955 dark:text-white font-black scale-110'
                              : 'text-zinc-405 hover:text-zinc-705 dark:text-zinc-400'
                          }`}
                        >
                          {ap}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Instant Quick helper shortcuts inside the select popup */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4 border-t border-zinc-150/40 dark:border-zinc-800/20 pt-3 w-full">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setHours(d.getHours() + 1);
                    initSchedulingStates(d);
                  }}
                  className="text-[9px] font-bold px-2 py-1 bg-white hover:bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 rounded-lg cursor-pointer transition-all text-zinc-600 dark:text-zinc-400 shadow-2xs hover:scale-102"
                >
                  ⏱️ In 1 Hr
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    d.setHours(9, 0, 0, 0);
                    initSchedulingStates(d);
                  }}
                  className="text-[9px] font-bold px-2 py-1 bg-white hover:bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 rounded-lg cursor-pointer transition-all text-zinc-600 dark:text-zinc-400 shadow-2xs hover:scale-102"
                >
                  ☀️ Tomorrow 9 AM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    d.setHours(18, 0, 0, 0);
                    initSchedulingStates(d);
                  }}
                  className="text-[9px] font-bold px-2 py-1 bg-white hover:bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 rounded-lg cursor-pointer transition-all text-zinc-600 dark:text-zinc-400 shadow-2xs hover:scale-102"
                >
                  🌙 Tomorrow 6 PM
                </button>
              </div>
            </div>

            {/* Actions: Clear vs Schedule for later */}
            <div className="flex items-center gap-3 mt-1.5 selection:bg-none">
              <button
                type="button"
                onClick={() => {
                  setIsScheduling(false);
                  setPublishAt('');
                  setShowScheduleModal(false);
                }}
                className="flex-1 py-3 text-center rounded-xl font-bold text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 duration-100 transition-all cursor-pointer"
              >
                Clear Schedule
              </button>
              
              <button
                type="button"
                onClick={() => {
                  const finalPublishAt = constructPublishAt(schedYear, schedMonth, schedDay, schedHour, schedMinute, schedAmPm);
                  const schedDate = new Date(finalPublishAt);
                  if (schedDate <= new Date()) {
                    setError('Scheduled release date and time must be in the future.');
                    setShowScheduleModal(false);
                    return;
                  }
                  setPublishAt(finalPublishAt);
                  setIsScheduling(true);
                  setError(null);
                  setShowScheduleModal(false);
                }}
                className="flex-[1.5] py-3 text-center rounded-xl font-black text-xs bg-[#1877f2] hover:bg-[#166fe5] text-white duration-100 transition-all cursor-pointer shadow-md shadow-[#1877f2]/10"
              >
                Schedule for later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
