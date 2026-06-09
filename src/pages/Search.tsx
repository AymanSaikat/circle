import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, UserPlus, UserCheck, Sparkles, Hash, MessageSquare, AlertCircle } from 'lucide-react';
import { collection, query, getDocs, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseClient';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { CircleCard } from '../components/CircleCard';
import { CirclesSkeleton } from '../components/CirclesSkeleton';
import { UserProfile, Memo } from '../types';

export const Search: React.FC = () => {
  const { user, profile } = useAuth();
  const { navigate } = useRouter();

  const [activeTab, setActiveTab] = useState<'users' | 'circles'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allMemos, setAllMemos] = useState<Memo[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // 1. Fetch live following list to manage follow button states
  useEffect(() => {
    if (!user) return;
    
    // Listen to real-time following list for current user
    const unsub = onSnapshot(collection(db, 'follows'), (snap) => {
      const ids = new Set<string>();
      snap.forEach(d => {
        const data = d.data();
        if (data.followerId === user.uid) {
          ids.add(data.followingId);
        }
      });
      setFollowingIds(ids);
    });

    return unsub;
  }, [user]);

  // 2. Load all users and public/visible memos for easy instant searching
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const loadData = async () => {
      try {
        // Fetch users
        const usersSnap = await getDocs(collection(db, 'users'));
        const uList: UserProfile[] = [];
        usersSnap.forEach(d => {
          if (d.id !== user.uid) {
            uList.push({ id: d.id, ...d.data() } as UserProfile);
          }
        });
        setAllUsers(uList);

        // Fetch public/visible memos
        const memosRef = collection(db, 'memos');
        
        // Split queries to satisfy firestore security rules
        const pubSnap = await getDocs(query(memosRef, where('visibility', 'in', ['public', 'followers'])));
        const ownSnap = await getDocs(query(memosRef, where('userId', '==', user.uid)));
        
        const mList: Memo[] = [];
        const addedIds = new Set<string>();
        
        pubSnap.forEach(d => {
          addedIds.add(d.id);
          mList.push({ id: d.id, ...d.data() } as Memo);
        });
        
        ownSnap.forEach(d => {
          if (!addedIds.has(d.id)) {
            mList.push({ id: d.id, ...d.data() } as Memo);
          }
        });
        
        // Sort chronologically
        mList.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
        setAllMemos(mList);
      } catch (err) {
        console.error('Failed to pre-cache search indexes', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Handle follow toggle
  const handleFollowToggle = async (targetUser: UserProfile) => {
    if (!user || user.uid === targetUser.id) return;

    const followId = `${user.uid}_${targetUser.id}`;
    const followRef = doc(db, 'follows', followId);
    const isCurrentlyFollowing = followingIds.has(targetUser.id);

    try {
      if (isCurrentlyFollowing) {
        await deleteDoc(followRef);
        setFollowingIds(prev => {
          const next = new Set(prev);
          next.delete(targetUser.id);
          return next;
        });
      } else {
        await setDoc(followRef, {
          followerId: user.uid,
          followingId: targetUser.id,
          createdAt: serverTimestamp()
        });
        setFollowingIds(prev => {
          const next = new Set(prev);
          next.add(targetUser.id);
          return next;
        });
      }
    } catch (err) {
      console.error('Search follow toggle failed', err);
    }
  };

  // Filter lists based on input query
  const queryTerm = searchQuery.toLowerCase().trim();

  const filteredUsers = allUsers.filter(u => {
    if (!queryTerm) return true;
    return (
      u.displayName?.toLowerCase().includes(queryTerm) ||
      u.username?.toLowerCase().includes(queryTerm) ||
      u.bio?.toLowerCase().includes(queryTerm)
    );
  });

  const filteredMemos = allMemos.filter(m => {
    if (!queryTerm) return true;
    const contentMatch = m.content?.toLowerCase().includes(queryTerm);
    const tagMatch = m.tags?.some(tag => tag.toLowerCase().includes(queryTerm));
    const userMatch = m.displayName?.toLowerCase().includes(queryTerm) || m.username?.toLowerCase().includes(queryTerm);
    return contentMatch || tagMatch || userMatch;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950/10 p-4 md:p-8 max-w-4xl mx-auto w-full select-none">
      <div className="mb-6 flex flex-col gap-1">
        <h2 className="text-2xl font-bold font-sans tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-zinc-900 dark:text-zinc-50" />
          <span>Global Search Engine</span>
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs text-sans">Locate publishers, read popular circles, and discover tags</p>
      </div>

      {/* Modern High-Contrast Search bar wrapper */}
      <div className="relative mb-6">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-405 dark:text-zinc-500" />
        <input
          id="input-global-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-sans pl-11 pr-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-805 focus:border-zinc-950 dark:focus:border-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-950/10 dark:focus:ring-white/10 placeholder-zinc-450 dark:placeholder-zinc-500 text-sm shadow-xs transition-all font-medium"
          placeholder="Search by keywords, display names, bios, usernames, or tag labels..."
        />
      </div>

      {/* Tabs selectors representation */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6 gap-6">
        <button
          id="btn-search-tab-users"
          onClick={() => setActiveTab('users')}
          className={`pb-3 font-semibold text-sm transition-all focus:outline-none cursor-pointer border-b-2 ${
            activeTab === 'users'
              ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          Publishers ({filteredUsers.length})
        </button>
        <button
          id="btn-search-tab-memos"
          onClick={() => setActiveTab('circles')}
          className={`pb-3 font-semibold text-sm transition-all focus:outline-none cursor-pointer border-b-2 ${
            activeTab === 'circles'
              ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-bold'
              : 'border-transparent text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          Public Circles ({filteredMemos.length})
        </button>
      </div>

      {/* Loading state indicator */}
      {loading ? (
        <div className="flex flex-col gap-6">
          <CirclesSkeleton />
          <CirclesSkeleton />
          <CirclesSkeleton />
        </div>
      ) : activeTab === 'users' ? (
        filteredUsers.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center text-zinc-500 dark:text-zinc-400 shadow-xs flex flex-col gap-2 items-center justify-center">
            <AlertCircle className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No publishers found</p>
            <p className="text-xs text-zinc-450 dark:text-zinc-500 italic">Try searching with a different user nickname or display tag</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredUsers.map(u => {
              const isFollowing = followingIds.has(u.id);
              return (
                <div key={u.id} className="bg-white dark:bg-zinc-900 hover:bg-zinc-100/30 dark:hover:bg-zinc-850/40 transition-all border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between shadow-xs gap-3">
                  <div className="flex items-start gap-3 cursor-pointer" onClick={() => navigate('/' + u.username)}>
                    <img
                      src={u.avatarUrl}
                      alt={u.displayName}
                      className="w-12 h-12 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 hover:underline truncate">{u.displayName}</p>
                      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-450 truncate">@{u.username}</p>
                      {u.bio && <p className="text-xs text-zinc-650 dark:text-zinc-300 line-clamp-2 mt-1.5 leading-relaxed">{u.bio}</p>}
                    </div>
                  </div>

                  <div className="flex gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-3 mt-1.5 justify-end">
                    <button
                      id={`btn-search-chat-${u.username}`}
                      onClick={() => navigate('/messages?to=' + u.username)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </button>
                    <button
                      id={`btn-search-follow-${u.username}`}
                      onClick={() => handleFollowToggle(u)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        isFollowing
                          ? 'border border-zinc-250 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-650 dark:hover:text-red-400 hover:border-red-200'
                          : 'bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 shadow-xs'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        filteredMemos.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center text-zinc-500 dark:text-zinc-400 shadow-xs flex flex-col gap-2 items-center justify-center">
            <AlertCircle className="w-8 h-8 text-zinc-400 dark:text-zinc-505" />
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No public circles found</p>
            <p className="text-xs text-zinc-450 dark:text-zinc-500 italic">Try searching hashtag topics like #minimalist or keyword triggers</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {filteredMemos.map(memo => (
              <CircleCard
                key={memo.id}
                memo={memo}
                onTagClick={(tag) => {
                  setSearchQuery(tag);
                  setActiveTab('circles');
                }}
                onDeleteSuccess={() => {}}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
};
