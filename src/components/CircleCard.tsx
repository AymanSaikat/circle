import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  MessageSquare, 
  Trash2, 
  Globe, 
  Shield, 
  Lock, 
  Send, 
  UserCheck, 
  UserPlus, 
  Clock, 
  Bookmark,
  MoreHorizontal,
  Copy,
  Volume2,
  VolumeX,
  Languages,
  BookOpen,
  Scaling,
  EyeOff,
  X,
  BarChart3,
  Check,
  Share2
} from 'lucide-react';
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  query, 
  orderBy,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebaseClient';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { Memo, Comment } from '../types';
import { LinkPreview } from './LinkPreview';

interface CircleCardProps {
  memo: Memo;
  onTagClick: (tag: string) => void;
  onDeleteSuccess: () => void;
}

export const CircleCard: React.FC<CircleCardProps> = ({ memo, onTagClick, onDeleteSuccess }) => {
  const { profile, user } = useAuth();
  const { navigate } = useRouter();
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [following, setFollowing] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(memo.mediaUrls?.[0] || null);
  const [localLikesCount, setLocalLikesCount] = useState(memo.likesCount || 0);
  const [bookmarked, setBookmarked] = useState(false);

  // States for new premium interactive outcomes
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [focusReader, setFocusReader] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'lg' | 'xl'>('normal');

  // Trigger copy URL feedback
  const handleCopyLink = async () => {
    const postUrl = `${window.location.origin}/post/${memo.id || 'post'}`;
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger speechsynthesis TTS aloud
  const handleSpeakToggle = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(memo.content);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Simple clean local instant mockup translation
  const handleTranslate = () => {
    if (translation) {
      setTranslation(null);
      return;
    }
    setIsTranslating(true);
    setTimeout(() => {
      // Simulate translated version
      setTranslation(`This is an instant translation of Circle: "${memo.content}" (Success)`);
      setIsTranslating(false);
    }, 400);
  };

  // Sync internal count with parent prop updates
  useEffect(() => {
    setLocalLikesCount(memo.likesCount || 0);
  }, [memo.likesCount]);

  // Establish state checks for Bookmarked status
  useEffect(() => {
    if (!user || !memo.id) return;
    const bookmarkRef = doc(db, 'users', user.uid, 'bookmarks', memo.id);
    const unsub = onSnapshot(bookmarkRef, (snap) => {
      setBookmarked(snap.exists());
    });
    return unsub;
  }, [memo.id, user]);

  const handleBookmarkToggle = async () => {
    if (!user || !memo.id) return;
    const bookmarkRef = doc(db, 'users', user.uid, 'bookmarks', memo.id);
    
    // Optimistic UI updates
    const prevBookmarked = bookmarked;
    setBookmarked(!prevBookmarked);

    try {
      if (prevBookmarked) {
        await deleteDoc(bookmarkRef);
      } else {
        await setDoc(bookmarkRef, {
          memoId: memo.id,
          userId: memo.userId,
          username: memo.username,
          displayName: memo.displayName,
          avatarUrl: memo.avatarUrl,
          content: memo.content,
          mediaUrls: memo.mediaUrls || [],
          visibility: memo.visibility,
          tags: memo.tags || [],
          likesCount: memo.likesCount || 0,
          commentsCount: memo.commentsCount || 0,
          createdAt: memo.createdAt,
          bookmarkedAt: serverTimestamp()
        });
      }
    } catch (err: any) {
      console.error('Failed to toggle bookmark', err);
      setBookmarked(prevBookmarked); // revert
    }
  };

  // 1. Establish state checks for LIKED status
  useEffect(() => {
    if (!user || !memo.id) return;
    const likeRef = doc(db, 'memos', memo.id, 'likes', user.uid);
    const unsub = onSnapshot(likeRef, (snap) => {
      setLiked(snap.exists());
    });
    return unsub;
  }, [memo.id, user]);

  // 2. Establish live listener for comments when expanded
  useEffect(() => {
    if (!memo.id || !showComments) return;
    const commentsRef = collection(db, 'memos', memo.id, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const fetched: Comment[] = [];
      snap.forEach(d => {
        fetched.push({ id: d.id, ...d.data() } as Comment);
      });
      setComments(fetched);
    });
    return unsub;
  }, [memo.id, showComments]);

  // 3. Establish follow state listener for this post creator
  useEffect(() => {
    if (!user || !memo.userId || user.uid === memo.userId) return;
    const followId = `${user.uid}_${memo.userId}`;
    const followRef = doc(db, 'follows', followId);
    const unsub = onSnapshot(followRef, (snap) => {
      setFollowing(snap.exists());
    });
    return unsub;
  }, [memo.userId, user]);

  // Toggle Like with Optimistic UI updates
  const handleLikeToggle = async () => {
    if (!user || !profile) return;
    
    // Create reference triggers
    const likeRef = doc(db, 'memos', memo.id, 'likes', user.uid);
    const memoRef = doc(db, 'memos', memo.id);
    
    // Dynamic local/optimistic toggle for immediate visual feedback
    const prevLiked = liked;
    const prevCount = localLikesCount;
    
    setLiked(!prevLiked);
    setLocalLikesCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      if (prevLiked) {
        // Unlike: delete document, decrement count
        await deleteDoc(likeRef);
        await updateDoc(memoRef, {
          likesCount: increment(-1)
        });
      } else {
        // Like: create document, increment count
        await setDoc(likeRef, {
          userId: user.uid,
          createdAt: serverTimestamp()
        });
        await updateDoc(memoRef, {
          likesCount: increment(1)
        });
      }
    } catch (err: any) {
      console.error('Failed to toggle like', err);
      // Revert local optimistic UI updates on query failure
      setLiked(prevLiked);
      setLocalLikesCount(prevCount);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `memos/${memo.id}/likes`);
      } catch (log) {}
    }
  };

  // Submit new comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !commentText.trim()) return;

    const cText = commentText.trim();
    setCommentText('');

    try {
      const commentsRef = collection(db, 'memos', memo.id, 'comments');
      const memoRef = doc(db, 'memos', memo.id);

      await addDoc(commentsRef, {
        memoId: memo.id,
        userId: user.uid,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        content: cText,
        createdAt: serverTimestamp()
      });

      await updateDoc(memoRef, {
        commentsCount: increment(1)
      });
    } catch (err: any) {
      console.error('Failed to create comment', err);
      try {
        handleFirestoreError(err, OperationType.CREATE, `memos/${memo.id}/comments`);
      } catch (log) {}
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'memos', memo.id, 'comments', commentId));
      await updateDoc(doc(db, 'memos', memo.id), {
        commentsCount: increment(-1)
      });
    } catch (err) {
      console.error('Failed to delete comment', err);
    }
  };

  // Toggle Following relationship
  const handleFollowToggle = async () => {
    if (!user || !profile || user.uid === memo.userId) return;

    const followId = `${user.uid}_${memo.userId}`;
    const followRef = doc(db, 'follows', followId);

    try {
      if (following) {
        await deleteDoc(followRef);
      } else {
        await setDoc(followRef, {
          followerId: user.uid,
          followingId: memo.userId,
          createdAt: serverTimestamp()
        });
      }
    } catch (err: any) {
      console.error('Failed to follow toggle', err);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'follows');
      } catch (log) {}
    }
  };

  // Delete whole Circle
  const handleDeleteMemo = async () => {
    if (!user || user.uid !== memo.userId) return;
    if (!window.confirm('Are you sure you want to delete this Circle post?')) return;

    try {
      const memoRef = doc(db, 'memos', memo.id);
      await deleteDoc(memoRef);
      onDeleteSuccess();
    } catch (err: any) {
      console.error('Failed to delete memo', err);
      try {
        handleFirestoreError(err, OperationType.DELETE, `memos/${memo.id}`);
      } catch (log) {}
    }
  };

  // Format creation timestamp
  const formatTimestamp = (stamp: any) => {
    if (!stamp) return 'Just now';
    const date = stamp.toDate ? stamp.toDate() : new Date(stamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${diffDays}d ago`;
  };

  // Inline parse custom paragraph markup, tags, and URLs
  const renderFormattedContent = (txt: string) => {
    if (!txt) return null;
    
    const lines = txt.split('\n');
    return (
      <div className="flex flex-col gap-1.5 font-sans text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed select-text break-words">
        {lines.map((lineText, idx) => {
          // Check if blockquote
          const isBlockQuote = lineText.startsWith('> ') || lineText.startsWith('>');
          let activeText = lineText;
          if (isBlockQuote) {
            activeText = lineText.startsWith('> ') ? lineText.substring(2) : lineText.substring(1);
          }

          // Regex to tokenize Bold, Italic, Inline Code, Mentions, Hashtags, and URLs
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
                <em key={pIdx} className="italic text-zinc-700 dark:text-zinc-350">
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
              const cleanUsername = part.replace(/[^a-zA-Z0-9_\-]/g, '');
              return (
                <button
                  key={pIdx}
                  onClick={() => navigate('/' + cleanUsername)}
                  className="text-[#1877f2] hover:underline font-bold font-sans cursor-pointer inline-block"
                >
                  {part}
                </button>
              );
            }

            // Hashtag (#tag)
            if (part.startsWith('#') && part.length > 1) {
              const cleanTag = part.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
              return (
                <button
                  key={pIdx}
                  onClick={() => onTagClick(cleanTag)}
                  className="text-zinc-950 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:underline px-1 py-0.5 rounded font-extrabold cursor-pointer inline-block"
                >
                  {part}
                </button>
              );
            }

            // Web links
            if (/^https?:\/\/[^\s]+$/i.test(part)) {
              let displayUrl = part;
              try {
                const urlObj = new URL(part);
                displayUrl = urlObj.hostname + (urlObj.pathname.length > 15 ? urlObj.pathname.slice(0, 15) + '...' : urlObj.pathname);
              } catch (_) {}
              return (
                <a
                  key={pIdx}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-900 dark:text-zinc-100 hover:text-zinc-700 dark:hover:text-zinc-350 font-bold underline cursor-pointer inline-block"
                >
                  {displayUrl}
                </a>
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

  // Extract the first URL found in content for Open Graph link preview card
  const getFirstUrlInText = (txt: string): string | null => {
    if (!txt) return null;
    const match = txt.match(/https?:\/\/[^\s]+/i);
    return match ? match[0] : null;
  };

  // Vote on a poll selection
  const handleVote = async (optionIndex: number) => {
    if (!user) return;
    try {
      const memoRef = doc(db, 'memos', memo.id);
      
      const votes = memo.poll?.votes || {};
      const nextVotes = { ...votes };
      
      let alreadyVotedIdx = -1;
      Object.keys(nextVotes).forEach((key) => {
        if (nextVotes[key]?.includes(user.uid)) {
          alreadyVotedIdx = Number(key);
        }
      });
      
      if (alreadyVotedIdx === optionIndex) {
        // Remove vote
        nextVotes[String(optionIndex)] = nextVotes[String(optionIndex)].filter(uid => uid !== user.uid);
      } else {
        // Change vote
        if (alreadyVotedIdx !== -1) {
          nextVotes[String(alreadyVotedIdx)] = nextVotes[String(alreadyVotedIdx)].filter(uid => uid !== user.uid);
        }
        if (!nextVotes[String(optionIndex)]) {
          nextVotes[String(optionIndex)] = [];
        }
        nextVotes[String(optionIndex)] = [...nextVotes[String(optionIndex)], user.uid];
      }
      
      await updateDoc(memoRef, {
        "poll.votes": nextVotes
      });
    } catch (err: any) {
      console.error("Error casting vote:", err);
    }
  };

  // Render Poll inside post cards
  const renderPoll = () => {
    if (!memo.poll) return null;
    const { question, options, votes = {}, expiresAt } = memo.poll;
    
    const isExpired = expiresAt ? new Date(expiresAt) <= new Date() : false;
    
    let totalVotes = 0;
    Object.keys(votes).forEach((key) => {
      totalVotes += (votes[key] || []).length;
    });
    
    let userVotedOptionIdx = -1;
    if (user) {
      Object.keys(votes).forEach((key) => {
        if (votes[key]?.includes(user.uid)) {
          userVotedOptionIdx = Number(key);
        }
      });
    }
    
    const hasVoted = userVotedOptionIdx !== -1;
    
    const getPercent = (optIdx: number) => {
      if (totalVotes === 0) return 0;
      const optionVotesCount = (votes[String(optIdx)] || []).length;
      return Math.round((optionVotesCount / totalVotes) * 100);
    };

    return (
      <div className="mt-4 p-4 rounded-2xl bg-zinc-50/60 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/80 flex flex-col gap-3 select-none">
        <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-550 font-mono text-[9px] font-bold uppercase tracking-wider select-none">
          <BarChart3 className="w-3.5 h-3.5 text-[#1877f2]" />
          <span>Active Community Poll</span>
        </div>
        
        <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-sans leading-snug">
          {question}
        </h4>
        
        <div className="flex flex-col gap-2 mt-1">
          {options.map((opt, idx) => {
            const percent = getPercent(idx);
            const votesCount = (votes[String(idx)] || []).length;
            const isVotedByMe = userVotedOptionIdx === idx;
            
            const showResults = hasVoted || isExpired || !user;
            
            if (showResults) {
              return (
                <button
                  key={idx}
                  disabled={isExpired || !user}
                  type="button"
                  onClick={() => handleVote(idx)}
                  className="relative overflow-hidden w-full h-10 border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl bg-white dark:bg-zinc-900 text-left transition-all hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer flex items-center justify-between px-4 group"
                >
                  <div 
                    className="absolute top-0 left-0 bottom-0 bg-blue-50/70 dark:bg-blue-950/20 transition-all duration-500 ease-out z-0"
                    style={{ width: `${percent}%` }}
                  />
                  <div className="z-10 flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate pr-4">
                    {isVotedByMe && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-500 shrink-0 select-none animate-pulse" />
                    )}
                    <span className="truncate">{opt}</span>
                    {isVotedByMe && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium italic select-none">
                        (your vote)
                      </span>
                    )}
                  </div>
                  <div className="z-10 shrink-0 font-mono text-[11px] text-zinc-500 dark:text-zinc-400 font-bold flex items-center gap-1.5">
                    <span>{percent}%</span>
                    <span className="font-medium text-[9px] opacity-60">({votesCount})</span>
                  </div>
                </button>
              );
            }
            
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleVote(idx)}
                className="w-full h-10 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-300 px-4 transition-all hover:border-zinc-500 dark:hover:border-zinc-500 cursor-pointer active:scale-[0.99]"
              >
                {opt}
              </button>
            );
          })}
        </div>
        
        <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-550 font-mono mt-1">
          <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
          <span>
            {isExpired 
              ? 'Closed poll' 
              : `Ends: ${new Date(expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
            }
          </span>
        </div>
      </div>
    );
  };

  // Grid layout helper for Instagram multi-media view
  const renderMediaGrid = () => {
    const urls = memo.mediaUrls || [];
    if (urls.length === 0) return null;

    if (activeImage && !urls.includes(activeImage)) {
      setActiveImage(urls[0]);
    }

    return (
      <div className="flex flex-col gap-2.5 mt-3">
        {/* Main large display image */}
        <div className="relative rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200 aspect-[16/10] max-h-[480px]">
          <img
            src={activeImage || urls[0]}
            alt="Main display"
            className="w-full h-full object-contain"
          />
          {memo.visibility !== 'public' && (
            <div className="absolute top-3 left-3 bg-zinc-900/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs text-white font-bold tracking-wide uppercase shadow-sm">
              {memo.visibility === 'followers' ? <Shield className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{memo.visibility}</span>
            </div>
          )}
        </div>

        {/* Small grid thumbnails if multiple */}
        {urls.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {urls.map((u, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveImage(u)}
                className={`w-14 h-14 rounded-lg shrink-0 overflow-hidden border-2 transition-all cursor-pointer ${
                  activeImage === u ? 'border-zinc-900 scale-102 shadow-xs' : 'border-zinc-200 hover:border-zinc-300 opacity-80'
                }`}
              >
                <img src={u} alt={`thumbnail ${i}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isHidden) {
    return (
      <div className="bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 text-center text-xs text-zinc-500 dark:text-zinc-400 select-none animate-fade-in flex items-center justify-between">
        <span className="font-medium">This Circle post has been hidden from your timeline.</span>
        <button 
          onClick={() => setIsHidden(false)} 
          className="text-zinc-900 dark:text-white font-bold hover:underline cursor-pointer bg-zinc-200/55 dark:bg-zinc-800/55 px-2.5 py-1 rounded-lg"
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <article className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs transition-all hover:bg-zinc-50/20 dark:hover:bg-zinc-900/60 relative">
      {/* Header metadata */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={memo.avatarUrl}
            alt={memo.displayName}
            onClick={() => navigate('/' + memo.username)}
            className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 shadow-xs cursor-pointer hover:opacity-85 transition-opacity"
          />
          <div className="min-w-0">
            <div 
              onClick={() => navigate('/' + memo.username)}
              className="flex items-center gap-1.5 flex-wrap cursor-pointer group"
            >
              <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-50 truncate group-hover:underline">
                {memo.displayName}
              </h2>
              <span className="text-zinc-400 dark:text-zinc-500 text-xs">@{memo.username}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-450 font-bold font-mono mt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-400 dark:text-zinc-550" />
                {formatTimestamp(memo.createdAt)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 uppercase tracking-wide">
                {memo.visibility === 'public' && <Globe className="w-3 h-3 text-zinc-400" />}
                {memo.visibility === 'followers' && <Shield className="w-3 h-3 text-zinc-400" />}
                {memo.visibility === 'private' && <Lock className="w-3 h-3 text-zinc-400" />}
                {memo.visibility}
              </span>
            </div>
          </div>
        </div>

        {/* Social control actions */}
        <div className="flex items-center gap-2 shrink-0">
          {user && memo.userId !== user.uid && (
            <button
              id={`btn-follow-${memo.userId}`}
              onClick={handleFollowToggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold select-none transition-all cursor-pointer ${
                following
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:text-red-600 hover:bg-zinc-200 dark:hover:bg-zinc-750'
                  : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-805 dark:hover:bg-zinc-200 shadow-sm'
              }`}
            >
              {following ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span>{following ? 'Following' : 'Follow'}</span>
            </button>
          )}

          {user && memo.userId === user.uid && (
            <button
              id={`btn-del-memo-${memo.id}`}
              onClick={handleDeleteMemo}
              className="p-2 rounded-xl text-zinc-400 dark:text-zinc-500 hover:text-red-655 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900/40 cursor-pointer"
              title="Delete Circle"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Options Dropdown Trigger */}
          <div className="relative shrink-0">
            <button
              id={`btn-options-dropdown-${memo.id}`}
              onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
              className="p-2 rounded-xl text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer border border-transparent hover:border-zinc-200/55"
              title="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showOptionsDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-[100] bg-black/20 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none transition-all" 
                  onClick={() => setShowOptionsDropdown(false)} 
                />
                
                <div className="fixed bottom-0 left-0 right-0 sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:mt-2 w-full sm:w-52 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] sm:shadow-lg z-[101] py-4 sm:py-1.5 animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 duration-200 text-xs font-sans overflow-hidden sm:pb-1.5 pb-safe-bottom flex flex-col gap-1 sm:gap-0 max-h-[85vh] overflow-y-auto">
                  <div className="w-12 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-2 sm:hidden shrink-0" />
                  
                  <button
                    type="button"
                    onClick={() => {
                      handleCopyLink();
                      setShowOptionsDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 sm:py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-350 flex items-center gap-3 sm:gap-2.5 cursor-pointer font-bold active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors"
                  >
                    <Copy className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-zinc-400" />
                    <span className="text-sm sm:text-xs">{copied ? 'Link Copied!' : 'Copy Link to Post'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleSpeakToggle();
                      setShowOptionsDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 sm:py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-350 flex items-center gap-3 sm:gap-2.5 cursor-pointer font-bold active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors"
                  >
                    {isSpeaking ? (
                      <>
                        <VolumeX className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-red-500" />
                        <span className="text-red-500 text-sm sm:text-xs">Stop Reading</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-zinc-400" />
                        <span className="text-sm sm:text-xs">Read Aloud (TTS)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleTranslate();
                      setShowOptionsDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 sm:py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-350 flex items-center gap-3 sm:gap-2.5 cursor-pointer font-bold active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors"
                  >
                    <Languages className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-zinc-400" />
                    <span className="text-sm sm:text-xs">{translation ? 'Show Original' : 'Instant Translate'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFocusReader(true);
                      setShowOptionsDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 sm:py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-350 flex items-center gap-3 sm:gap-2.5 cursor-pointer font-bold active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors"
                  >
                    <BookOpen className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-zinc-400" />
                    <span className="text-sm sm:text-xs">Immersive Reader</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFontSize(prev => prev === 'normal' ? 'lg' : prev === 'lg' ? 'xl' : 'normal');
                      setShowOptionsDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 sm:py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-350 flex items-center gap-3 sm:gap-2.5 cursor-pointer font-bold active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors"
                  >
                    <Scaling className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-zinc-400" />
                    <span className="flex-1 text-sm sm:text-xs flex items-center">
                      Font Size: <span className="ml-2 uppercase font-mono text-[9px] text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded leading-none">{fontSize}</span>
                    </span>
                  </button>

                  <div className="border-t border-zinc-100 dark:border-zinc-900 my-1 sm:my-1 w-full mx-auto" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsHidden(true);
                      setShowOptionsDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 sm:py-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 flex items-center gap-3 sm:gap-2.5 cursor-pointer font-bold active:bg-red-100 dark:active:bg-red-900 transition-colors"
                  >
                    <EyeOff className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    <span className="text-sm sm:text-xs">Hide Post</span>
                  </button>
                  
                  {user && memo.userId === user.uid && (
                     <button
                     type="button"
                     onClick={() => {
                       handleDeleteMemo();
                       setShowOptionsDropdown(false);
                     }}
                     className="w-full text-left px-4 py-3 sm:py-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 flex items-center gap-3 sm:gap-2.5 cursor-pointer font-bold active:bg-red-100 dark:active:bg-red-900 transition-colors sm:hidden"
                   >
                     <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                     <span className="text-sm sm:text-xs">Delete Circle</span>
                   </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Circle body/content */}
      <div className={`mt-4 text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap select-text break-words font-sans ${
        fontSize === 'normal' ? 'text-sm' : fontSize === 'lg' ? 'text-base' : 'text-lg'
      }`}>
        {renderFormattedContent(memo.content)}
      </div>

      {/* Translation banner if active */}
      {translation && (
        <div className="mt-4 p-3 bg-zinc-50/70 dark:bg-zinc-950/70 rounded-xl border border-zinc-200/50 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed italic animate-fade-in select-text">
          <div className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500 font-mono text-[9px] font-bold uppercase tracking-wider mb-1 select-none">
            <Languages className="w-3.5 h-3.5" />
            <span>Translated Block</span>
          </div>
          {translation}
        </div>
      )}

      {/* Dynamic Link Preview */}
      {(() => {
        const textUrl = getFirstUrlInText(memo.content);
        return textUrl ? <LinkPreview url={textUrl} /> : null;
      })()}

      {/* Dynamic Poll Component */}
      {renderPoll()}

      {/* Photo grid / attachment visualizers */}
      {renderMediaGrid()}

      {/* Interaction Metrics Footer */}
      <div className="flex items-center gap-6 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <button
          id={`btn-like-${memo.id}`}
          onClick={handleLikeToggle}
          className={`flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer group ${
            liked ? 'text-red-600 dark:text-red-550' : 'text-zinc-500 dark:text-zinc-455 hover:text-red-650'
          }`}
        >
          <Heart className={`w-4 h-4 transition-transform group-active:scale-125 ${liked ? 'fill-red-600 text-red-600 dark:fill-red-550 dark:text-red-550' : ''}`} />
          <span className="font-mono text-xs">{localLikesCount}</span>
        </button>

        <button
          id={`btn-comment-toggle-${memo.id}`}
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-2 text-xs font-bold cursor-pointer transition-colors ${
            showComments ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-455 hover:text-zinc-900'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span className="font-mono text-xs">{memo.commentsCount || 0}</span>
        </button>

        {/* Inline Copy Link Action */}
        <button
          id={`btn-copy-link-direct-${memo.id}`}
          type="button"
          onClick={handleCopyLink}
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            copied 
              ? 'text-green-600 dark:text-green-500 bg-green-500/10' 
              : 'text-zinc-500 dark:text-zinc-455 hover:text-[#1877f2] hover:bg-zinc-100 dark:hover:bg-zinc-850'
          }`}
          title={copied ? "Copied!" : "Copy link to clipboard"}
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600 dark:text-green-500 animate-bounce" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
        </button>

        {/* Bookmarking Action */}
        <button
          id={`btn-bookmark-${memo.id}`}
          onClick={handleBookmarkToggle}
          className={`flex items-center gap-2 text-xs font-bold cursor-pointer transition-colors ml-auto group ${
            bookmarked ? 'text-amber-600 dark:text-amber-500' : 'text-zinc-500 dark:text-zinc-455 hover:text-amber-600'
          }`}
          title={bookmarked ? "Remove Bookmark" : "Bookmark Circle"}
        >
          <Bookmark className={`w-4 h-4 transition-transform group-active:scale-125 ${bookmarked ? 'fill-amber-600 text-amber-600 dark:fill-amber-500 dark:text-amber-500' : ''}`} />
          <span className="sr-only">Bookmark</span>
        </button>
      </div>

      {/* Reactive Comments Panel / Nested drawer */}
      {showComments && (
        <div id={`comments-panel-${memo.id}`} className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded-2xl p-4">
          <h3 className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest mb-3 select-none">
            Comments
          </h3>

          {/* Comments List */}
          <div className="flex flex-col gap-3 max-h-60 overflow-y-auto mb-3 scrollbar-none">
            {comments.length === 0 ? (
              <p className="text-xs text-zinc-450 dark:text-zinc-500 py-1 italic select-none">
                No comments yet. Write the first response!
              </p>
            ) : (
              comments.map(c => (
                <div key={c.id} className="flex gap-2.5 items-start text-xs border-b border-zinc-200/40 dark:border-zinc-900 pb-2.5 last:border-b-0 group">
                  <img
                    src={c.avatarUrl}
                    alt={c.displayName}
                    onClick={() => navigate('/' + c.username)}
                    className="w-7 h-7 rounded-full object-cover mt-0.5 bg-zinc-100 dark:bg-zinc-800 cursor-pointer hover:opacity-85 transition-opacity shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span 
                        onClick={() => navigate('/' + c.username)}
                        className="font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer hover:underline"
                      >
                        {c.displayName}
                      </span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">@{c.username}</span>
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono ml-auto select-none">
                        {formatTimestamp(c.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4 mt-1">
                      <p className="text-zinc-705 dark:text-zinc-300 leading-relaxed break-all select-text flex-1">
                        {c.content}
                      </p>
                      {user && (user.uid === c.userId || user.uid === memo.userId) && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg shrink-0"
                          title="Delete Comment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* New comment input form */}
          {user ? (
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                id={`input-comment-${memo.id}`}
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write an elegant response..."
                className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl px-3 py-2 text-xs placeholder-zinc-400 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900/10 dark:focus:ring-white/10"
                maxLength={2000}
              />
              <button
                id={`btn-submit-comment-${memo.id}`}
                type="submit"
                disabled={!commentText.trim()}
                className="p-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-105 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-500 italic text-center select-none">
              Please sign in to comment.
            </p>
          )}
        </div>
      )}

      {/* Immersive Focus Reader Modal */}
      {focusReader && (
        <div className="fixed inset-0 bg-black/75 dark:bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative p-8 sm:p-10">
            {/* Close trigger */}
            <button
              onClick={() => {
                if (isSpeaking) {
                  window.speechSynthesis.cancel();
                  setIsSpeaking(false);
                }
                setFocusReader(false);
              }}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-zinc-105 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header / Author info */}
            <div className="flex items-center gap-3.5 mb-8">
              <img
                src={memo.avatarUrl}
                alt={memo.displayName}
                className="w-12 h-12 rounded-full object-cover border border-zinc-200 dark:border-zinc-800"
              />
              <div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-white leading-tight">
                  {memo.displayName}
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-550 font-mono">@{memo.username}</p>
              </div>

              {/* Speech Toggle in Focus Mode */}
              <button
                onClick={handleSpeakToggle}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all cursor-pointer"
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                    <span>Stop Read</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Read Aloud</span>
                  </>
                )}
              </button>
            </div>

            {/* Immersive Text */}
            <div className={`text-zinc-850 dark:text-zinc-100 leading-relaxed font-sans tracking-wide break-words select-text mb-8 ${
              fontSize === 'normal' ? 'text-lg' : fontSize === 'lg' ? 'text-xl' : 'text-2xl'
            }`}>
              {memo.content}
            </div>

            {/* Translation under-screen */}
            {translation && (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950/50 rounded-2xl border border-zinc-200/50 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed italic mb-8 select-text animate-fade-in">
                <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1.5 font-mono select-none">
                  <Languages className="w-3 h-3" />
                  <span>Reader Translation</span>
                </div>
                {translation}
              </div>
            )}

            {/* Footer option details */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-6 text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Published {formatTimestamp(memo.createdAt)}
              </span>
              <span>•</span>
              <span>{memo.content.split(/\s+/).length} Words</span>
              <span>•</span>
              <button
                onClick={() => setFontSize(prev => prev === 'normal' ? 'lg' : prev === 'lg' ? 'xl' : 'normal')}
                className="text-zinc-900 dark:text-white hover:underline cursor-pointer"
              >
                Font Sizing ({fontSize})
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
};
