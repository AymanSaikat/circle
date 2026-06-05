import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Hash, Search, RefreshCw, Layers, Clock, Calendar, UserPlus, UserCheck, Users, HelpCircle, ArrowRight, Check } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, getDocs, where, limit, startAfter, Timestamp, doc, setDoc, addDoc } from 'firebase/firestore';
import { useRouter } from '../context/RouterContext';
import { motion } from 'motion/react';
import { db } from '../firebaseClient';
import { useAuth } from '../context/AuthContext';
import { CircleComposer } from '../components/CircleComposer';
import { CircleCard } from '../components/CircleCard';
import { CirclesSkeleton } from '../components/CirclesSkeleton';
import { Memo } from '../types';

interface FeedProps {
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  currentTab: string; // 'feed' | 'profile' | 'private'
}

export const Feed: React.FC<FeedProps> = ({ selectedTag, setSelectedTag, currentTab }) => {
  const { user, profile } = useAuth();
  const { navigate } = useRouter();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingTags, setTrendingTags] = useState<{ name: string; count: number }[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [scheduledMemos, setScheduledMemos] = useState<Memo[]>([]);

  // Suggested connection states for the dynamic Who to Follow engine
  interface SuggestedUser {
    uid: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    bio?: string;
    mutualCount: number;
    sharedTagsCount: number;
    mutualNames: string[];
    score: number;
  }

  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Pagination states matching X/Twitter and Instagram infinite scroll design
  const [lastVisiblePublic, setLastVisiblePublic] = useState<any>(null);
  const [lastVisibleOwn, setLastVisibleOwn] = useState<any>(null);
  const [hasMorePublic, setHasMorePublic] = useState(true);
  const [hasMoreOwn, setHasMoreOwn] = useState(true);

  const PAGE_SIZE = 7;
  const observerTarget = useRef<HTMLDivElement>(null);

  // 1. Listen live to users' following list to apply "Followers Only" feed filters dynamically
  useEffect(() => {
    if (!user) return;
    const followsRef = collection(db, 'follows');
    const q = query(followsRef, where('followerId', '==', user.uid));
    
    const unsub = onSnapshot(q, (snap) => {
      const ids = new Set<string>();
      snap.forEach(d => {
        const data = d.data();
        if (data.followingId) {
          ids.add(data.followingId);
        }
      });
      setFollowingIds(ids);
    }, (err) => {
      console.error('Follow subscription failed', err);
    });
    return unsub;
  }, [user]);

  // 1b. Listen live to user's future scheduled drafts
  useEffect(() => {
    if (!user) return;
    const memosRef = collection(db, 'memos');
    const qSched = query(
      memosRef,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(qSched, (snap) => {
      const list: Memo[] = [];
      snap.forEach(d => {
        const data = d.data() as any;
        if (data.publishAt) {
          const publishTime = data.publishAt.toDate ? data.publishAt.toDate() : new Date(data.publishAt);
          if (publishTime > new Date()) {
            list.push({ id: d.id, ...data } as Memo);
          }
        }
      });
      setScheduledMemos(list);
    }, (err) => {
      console.warn('Scheduled watch error:', err);
    });
    return unsub;
  }, [user]);

  // 1c. Build Suggested Users based on shared tag counts and mutual connection paths
  useEffect(() => {
    if (!user) return;

    const generateRecommendations = async () => {
      setLoadingSuggestions(true);
      try {
        // A. Load other potential users
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);
        const allUsers: any[] = [];
        usersSnap.forEach(d => {
          const uData = d.data();
          if (d.id !== user.uid && !followingIds.has(d.id)) {
            allUsers.push({ uid: d.id, ...uData });
          }
        });

        if (allUsers.length === 0) {
          setSuggestedUsers([]);
          setLoadingSuggestions(false);
          return;
        }

        // B. Load follows documents to trace mutual connection paths
        const followsRef = collection(db, 'follows');
        const followsSnap = await getDocs(followsRef);
        const followsList: any[] = [];
        followsSnap.forEach(d => {
          followsList.push(d.data());
        });

        // C. Load list of memos to extract hashtag history mapped to userIds
        const memosRef = collection(db, 'memos');
        const memosSnap = await getDocs(query(memosRef, limit(150)));
        const userHashtagsMap: Record<string, Set<string>> = {};
        
        memosSnap.forEach(d => {
          const memoData = d.data();
          const authorId = memoData.userId;
          const text = memoData.content || '';
          if (authorId) {
            if (!userHashtagsMap[authorId]) {
              userHashtagsMap[authorId] = new Set<string>();
            }
            // Parse tags
            const tags = text.match(/#[a-zA-Z0-9_]+/g) || [];
            tags.forEach((t: string) => {
              userHashtagsMap[authorId].add(t.toLowerCase());
            });
          }
        });

        // Current User's active tags
        const currentUserTags = userHashtagsMap[user.uid] || new Set<string>();

        // D. Calculate suggestion score
        const suggestedList: SuggestedUser[] = allUsers.map(candidate => {
          // Identify mutual followers:
          // X follows candidate, where current user is also following X.
          let mutualCount = 0;
          const mutualNames: string[] = [];

          followsList.forEach(rel => {
            if (rel.followingId === candidate.uid && followingIds.has(rel.followerId)) {
              mutualCount++;
              // find the friend object to show name
              const friend = allUsers.find(u => u.uid === rel.followerId);
              if (friend && mutualNames.length < 2) {
                mutualNames.push(friend.displayName || `@${friend.username}`);
              }
            }
          });

          // Identify shared tags:
          let sharedTagsCount = 0;
          const candidateTags = userHashtagsMap[candidate.uid] || new Set<string>();
          candidateTags.forEach(t => {
            if (currentUserTags.has(t)) {
              sharedTagsCount++;
            }
          });

          // Composite score modeling: weight mutual paths highly
          const score = (mutualCount * 4) + (sharedTagsCount * 2) + (candidate.avatarUrl ? 1 : 0);

          return {
            uid: candidate.uid,
            username: candidate.username || '',
            displayName: candidate.displayName || 'Circle Creator',
            avatarUrl: candidate.avatarUrl,
            bio: candidate.bio,
            mutualCount,
            sharedTagsCount,
            mutualNames,
            score
          };
        });

        // Filter and Sort desc
        const sorted = suggestedList
          .filter(u => u.score > 0 || Math.random() > 0.1) // keep relevant candidates + sprinkle diverse ones
          .sort((a, b) => b.score - a.score)
          .slice(0, 4);

        setSuggestedUsers(sorted);
      } catch (err) {
        console.warn('Recommendation gen error:', err);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    generateRecommendations();
  }, [user, followingIds]);

  // Handle follow triggered from suggested user
  const handleFollowSuggestedUser = async (targetUid: string) => {
    if (!user) return;
    try {
      const followId = `${user.uid}_${targetUid}`;
      await setDoc(doc(db, 'follows', followId), {
        followerId: user.uid,
        followingId: targetUid,
        createdAt: new Date().toISOString()
      });

      // Issue follow notification
      const notifsRef = collection(db, 'users', targetUid, 'notifications');
      await addDoc(notifsRef, {
        type: 'follow',
        senderId: user.uid,
        senderName: profile?.displayName || 'A circle user',
        senderAvatar: profile?.avatarUrl || '',
        createdAt: new Date().toISOString(),
        read: false
      });
    } catch (err) {
      console.error('Follow suggestion failed', err);
    }
  };

  // 2. Fetch initial batch of memos (public + user-specific matching privacy requirements)
  const fetchInitialMemos = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const memosRef = collection(db, 'memos');
      
      // Special: Bookmarks loading handler
      if (currentTab === 'bookmarks') {
        const bookmarksRef = collection(db, 'users', user.uid, 'bookmarks');
        const qBookmarked = query(bookmarksRef, orderBy('bookmarkedAt', 'desc'), limit(PAGE_SIZE));
        const bookmarksSnap = await getDocs(qBookmarked);
        const fetchedBms: Memo[] = [];
        bookmarksSnap.forEach(d => {
          fetchedBms.push({ id: d.id, ...d.data() } as any);
        });
        const lastBm = bookmarksSnap.docs[bookmarksSnap.docs.length - 1] || null;
        setLastVisiblePublic(lastBm);
        setHasMorePublic(bookmarksSnap.docs.length === PAGE_SIZE);
        setMemos(fetchedBms);
        setLoading(false);
        return;
      }

      // Initial fetch: Public memos
      const qPublic = query(
        memosRef,
        where('visibility', '==', 'public'),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );
      const publicSnap = await getDocs(qPublic);
      const fetchedPublic: Memo[] = [];
      publicSnap.forEach(d => {
        fetchedPublic.push({ id: d.id, ...d.data() } as Memo);
      });
      const lastPub = publicSnap.docs[publicSnap.docs.length - 1] || null;
      setLastVisiblePublic(lastPub);
      setHasMorePublic(publicSnap.docs.length === PAGE_SIZE);

      // Initial fetch: Own memos (which covers private notes)
      const qOwn = query(
        memosRef,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );
      const ownSnap = await getDocs(qOwn);
      const fetchedOwn: Memo[] = [];
      ownSnap.forEach(d => {
        fetchedOwn.push({ id: d.id, ...d.data() } as Memo);
      });
      const lastOwn = ownSnap.docs[ownSnap.docs.length - 1] || null;
      setLastVisibleOwn(lastOwn);
      setHasMoreOwn(ownSnap.docs.length === PAGE_SIZE);

      // Merge public and own memos (de-duplicating by unique document ID)
      const mergedMap = new Map<string, Memo>();
      fetchedPublic.forEach(m => mergedMap.set(m.id, m));
      fetchedOwn.forEach(m => mergedMap.set(m.id, m));

      const sorted = Array.from(mergedMap.values()).sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setMemos(sorted);
    } catch (err) {
      console.error('Failed to load initial memos batch:', err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Load next pages of memos on intersection trigger using cursors
  const fetchMoreMemos = async () => {
    if (!user || loadingMore) return;
    
    // Special: Bookmarks Pagination handler
    if (currentTab === 'bookmarks') {
      if (!hasMorePublic || !lastVisiblePublic) return;
      setLoadingMore(true);
      try {
        const bookmarksRef = collection(db, 'users', user.uid, 'bookmarks');
        const qBookmarked = query(
          bookmarksRef,
          orderBy('bookmarkedAt', 'desc'),
          startAfter(lastVisiblePublic),
          limit(PAGE_SIZE)
        );
        const bookmarksSnap = await getDocs(qBookmarked);
        const fetchedBms: Memo[] = [];
        bookmarksSnap.forEach(d => {
          fetchedBms.push({ id: d.id, ...d.data() } as any);
        });
        const lastBm = bookmarksSnap.docs[bookmarksSnap.docs.length - 1] || null;
        setLastVisiblePublic(lastBm);
        setHasMorePublic(bookmarksSnap.docs.length === PAGE_SIZE);
        
        setMemos(prev => {
          const mergedMap = new Map<string, Memo>();
          prev.forEach(m => mergedMap.set(m.id, m));
          fetchedBms.forEach(m => mergedMap.set(m.id, m));
          return Array.from(mergedMap.values()).sort((a, b) => {
            const btimeA = b.bookmarkedAt?.seconds || 0;
            const btimeB = a.bookmarkedAt?.seconds || 0;
            return btimeA - btimeB;
          });
        });
      } catch (err) {
        console.error('Bookmarks cursors load error:', err);
      } finally {
        setLoadingMore(false);
      }
      return;
    }

    if (!hasMorePublic && !hasMoreOwn) return;

    setLoadingMore(true);
    try {
      const memosRef = collection(db, 'memos');
      const newMemos: Memo[] = [];

      // Query cursors for public path and personal path
      if (hasMorePublic && lastVisiblePublic) {
        const qPublic = query(
          memosRef,
          where('visibility', '==', 'public'),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisiblePublic),
          limit(PAGE_SIZE)
        );
        const publicSnap = await getDocs(qPublic);
        publicSnap.forEach(d => {
          newMemos.push({ id: d.id, ...d.data() } as Memo);
        });
        const lastPub = publicSnap.docs[publicSnap.docs.length - 1] || null;
        setLastVisiblePublic(lastPub);
        setHasMorePublic(publicSnap.docs.length === PAGE_SIZE);
      }

      if (hasMoreOwn && lastVisibleOwn) {
        const qOwn = query(
          memosRef,
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisibleOwn),
          limit(PAGE_SIZE)
        );
        const ownSnap = await getDocs(qOwn);
        ownSnap.forEach(d => {
          newMemos.push({ id: d.id, ...d.data() } as Memo);
        });
        const lastOwn = ownSnap.docs[ownSnap.docs.length - 1] || null;
        setLastVisibleOwn(lastOwn);
        setHasMoreOwn(ownSnap.docs.length === PAGE_SIZE);
      }

      if (newMemos.length > 0) {
        setMemos(prev => {
          const mergedMap = new Map<string, Memo>();
          prev.forEach(m => mergedMap.set(m.id, m));
          newMemos.forEach(m => mergedMap.set(m.id, m));

          return Array.from(mergedMap.values()).sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
          });
        });
      }
    } catch (err) {
      console.error('Failed to load paginated cursors:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Sync initial batch fetcher with profile/track selections
  useEffect(() => {
    fetchInitialMemos();
  }, [user, currentTab]);

  // Infinite Scroll IntersectionObserver implementation
  useEffect(() => {
    const currentTarget = observerTarget.current;
    if (!currentTarget) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && !loadingMore && (hasMorePublic || hasMoreOwn)) {
          fetchMoreMemos();
        }
      },
      { threshold: 0.1, rootMargin: '120px' }
    );

    observer.observe(currentTarget);

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [loading, loadingMore, hasMorePublic, hasMoreOwn, lastVisiblePublic, lastVisibleOwn]);

  // 4. Aggregate trending hashtags dynamically from all visible posts
  useEffect(() => {
    if (memos.length === 0) {
      setTrendingTags([]);
      return;
    }

    const counts: { [key: string]: number } = {};
    memos.forEach(m => {
      // Only count tags from public memos to keep privacy boundaries secure
      if (m.visibility === 'public' && m.tags) {
        m.tags.forEach(tag => {
          const lower = tag.toLowerCase().trim();
          counts[lower] = (counts[lower] || 0) + 1;
        });
      }
    });

    const parsed = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Display top 10 tags

    setTrendingTags(parsed);
  }, [memos]);

  const handleComposeSuccess = () => {
    // Successfully posted, trigger hot reload of first batch to prepend post
    fetchInitialMemos();
  };

  // Filter logic implementing privacy constraints and tab selections
  const getFilteredMemos = () => {
    return memos.filter(memo => {
      // 0. Invisible future release scheduled files
      if (memo.publishAt) {
        const publishTime = memo.publishAt.toDate ? memo.publishAt.toDate() : new Date(memo.publishAt);
        if (publishTime > new Date()) {
          return false; // hide scheduled ones from general streams (they display in special owner trays)
        }
      }

      // 1. Hard Privacy Filtering (Zero-Trust Security Alignment)
      // Private memos - only creator can see
      if (memo.visibility === 'private' && memo.userId !== user?.uid) {
        return false;
      }
      
      // Followers memos - visible to author + followed users
      if (memo.visibility === 'followers' && memo.userId !== user?.uid && !followingIds.has(memo.userId)) {
        return false;
      }

      // 2. Tab Selection Constraints
      if (currentTab === 'private') {
        // Private Notes view
        return memo.userId === user?.uid && memo.visibility === 'private';
      }

      // Timeline Feed view (displays followed posts, own posts, and general public postings)
      if (currentTab === 'feed') {
        if (memo.visibility === 'private' && memo.userId !== user?.uid) return false;
      }

      // 3. Hashtag Filter Matcher
      if (selectedTag) {
        if (!memo.tags || !memo.tags.some(t => t.toLowerCase() === selectedTag.toLowerCase())) {
          return false;
        }
      }

      // 4. Keyword Search Matcher
      if (searchQuery.trim()) {
        const queryTerm = searchQuery.toLowerCase().trim();
        const contentMatch = memo.content?.toLowerCase().includes(queryTerm);
        const userMatch = memo.displayName?.toLowerCase().includes(queryTerm) || memo.username?.toLowerCase().includes(queryTerm);
        if (!contentMatch && !userMatch) {
          return false;
        }
      }

      return true;
    });
  };

  const filteredMemos = getFilteredMemos();

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-6 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full select-none">
      {/* Central feed timeline */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Banner/Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold font-sans tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-zinc-900 dark:text-zinc-50" />
              <span>
                {currentTab === 'private' ? 'Private Diaries' : currentTab === 'bookmarks' ? 'Saved Bookmarks' : selectedTag ? `Circles tagged: #${selectedTag}` : 'Timeline Feed'}
              </span>
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">
              {currentTab === 'private' 
                ? 'Your personal private notes, locked strictly for your eyes only'
                : currentTab === 'bookmarks'
                ? 'Your private bookmarked publications stack'
                : 'Aggregating posts from your follow network and public logs'}
            </p>
          </div>
        </div>

        {/* Search tool block */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="input-feed-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search circles, tags, names..."
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-450 dark:placeholder-zinc-500 rounded-xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              id="btn-clear-search"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-bold cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Circle Creator (only show on standard feed tab) */}
        {currentTab === 'feed' && <CircleComposer onSuccess={handleComposeSuccess} />}

        {/* Scheduled Memos panel */}
        {currentTab === 'feed' && scheduledMemos.length > 0 && (
          <div className="bg-amber-500/5 dark:bg-amber-500/2 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl p-4 mb-6 shadow-xs select-none">
            <h3 className="font-bold text-xs tracking-wider uppercase text-amber-800 dark:text-amber-400 flex items-center justify-between pointer-events-auto">
              <span className="flex items-center gap-1.5 leading-none">
                <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                Your Scheduled Publications ({scheduledMemos.length})
              </span>
            </h3>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
              These drafted circles are slated to be released publicly at their scheduled release times.
            </p>
            <div className="flex flex-col gap-3 mt-3">
              {scheduledMemos.map(sched => (
                <div key={sched.id} className="bg-white dark:bg-zinc-900/80 border border-amber-100 dark:border-amber-900/20 rounded-xl p-3 text-xs relative flex items-start gap-3 select-text">
                  <div className="flex-1">
                    <p className="text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed max-w-xl truncate prose prose-zinc">{sched.content}</p>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-amber-700 dark:text-amber-450 font-bold font-mono">
                      <Clock className="w-3.5 h-3.5 animate-pulse" />
                      <span>Publishes: {sched.publishAt?.toDate ? sched.publishAt.toDate().toLocaleString() : new Date(sched.publishAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Circles cards list */}
        <div className="flex flex-col gap-6">
          {loading ? (
            <div className="flex flex-col gap-6">
              <CirclesSkeleton />
              <CirclesSkeleton />
              <CirclesSkeleton />
            </div>
          ) : filteredMemos.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center shadow-xs">
              <Layers className="w-10 h-10 text-zinc-400 dark:text-zinc-500 mx-auto mb-4" />
              <h3 className="text-zinc-900 dark:text-zinc-100 font-bold text-base mb-1">No matches found</h3>
              <p className="text-zinc-500 dark:text-zinc-405 text-xs max-w-sm mx-auto leading-relaxed">
                We couldn't locate any circles that align with your current filter or keyword. Try searching for something else or write a new public post!
              </p>
            </div>
          ) : (
            <>
              {filteredMemos.map((memo, idx) => (
                <motion.div
                  key={memo.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut', delay: Math.min(idx * 0.05, 0.2) }}
                >
                  <CircleCard
                    memo={memo}
                    onTagClick={(tag) => setSelectedTag(tag)}
                    onDeleteSuccess={() => {}}
                  />
                </motion.div>
              ))}

              {/* Observer sensor element for infinite scrolling */}
              <div ref={observerTarget} className="py-8 flex flex-col items-center justify-center border-t border-zinc-100 dark:border-zinc-900 mt-6 select-none">
                {loadingMore ? (
                  <div className="flex items-center gap-2.5 text-zinc-500 dark:text-zinc-400 text-xs font-mono">
                    <RefreshCw className="w-4 h-4 text-zinc-400 dark:text-zinc-500 animate-spin" />
                    <span>Streaming older publications...</span>
                  </div>
                ) : (hasMorePublic || hasMoreOwn) ? (
                  <button
                    onClick={fetchMoreMemos}
                    className="text-xs font-semibold px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-205 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-all cursor-pointer font-sans"
                  >
                    Load More circles
                  </button>
                ) : (
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-505 font-mono tracking-wider select-none text-center">
                    — YOU HAVE REACHED THE DAWN OF THE TIMELINE —
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sidebar: trending tags and organization */}
      <div className="w-full md:w-80 shrink-0">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sticky top-8 shadow-xs">
          <div className="flex items-center gap-2 mb-4 border-b border-zinc-150 dark:border-zinc-800 pb-3">
            <Hash className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-sans">
              Trending Hashtags
            </h3>
          </div>

          {trendingTags.length === 0 ? (
            <p className="text-xs text-zinc-450 dark:text-zinc-500 italic py-2">
              Share public circles with tags like <span className="text-zinc-900 dark:text-zinc-100 font-bold">#coding</span> to populate the trending wall.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {trendingTags.map((tag) => (
                <button
                  key={tag.name}
                  id={`tag-sidebar-${tag.name}`}
                  onClick={() => setSelectedTag(tag.name)}
                  className={`flex items-center justify-between text-xs py-2 px-3.5 rounded-xl transition-all cursor-pointer ${
                    selectedTag === tag.name
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold'
                      : 'bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-950/60 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <span className="truncate">#{tag.name}</span>
                  <span className={`font-mono text-[10px] rounded px-1.5 py-0.5 ${
                    selectedTag === tag.name ? 'bg-zinc-800 dark:bg-zinc-200 dark:text-zinc-900 text-white' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500'
                  }`}>
                    {tag.count}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Who to Follow list - requested section */}
          {suggestedUsers.length > 0 && (
            <div className="mt-6 border-t border-zinc-155 dark:border-zinc-800/80 pt-5 select-none">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-sans">
                  Who to Follow
                </h3>
              </div>

              <div className="flex flex-col gap-2.5">
                {suggestedUsers.map((sug) => (
                  <div 
                    key={sug.uid} 
                    className="flex items-center justify-between gap-3 p-2 rounded-xl bg-zinc-50/40 dark:bg-zinc-950/20 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-all border border-zinc-150/40 dark:border-zinc-850/25"
                  >
                    {/* Left: Avatar with initials fallback */}
                    <div 
                      onClick={() => navigate('/' + sug.username)}
                      className="w-9 h-9 rounded-full bg-zinc-105 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs ring-1 ring-zinc-200 dark:ring-zinc-850 shrink-0 cursor-pointer overflow-hidden hover:scale-105 transition-all"
                    >
                      {sug.avatarUrl ? (
                        <img 
                          src={sug.avatarUrl} 
                          alt={sug.displayName} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <span className="text-zinc-650 dark:text-zinc-300">
                          {sug.displayName.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Middle: User details and recommendation context */}
                    <div className="flex-1 min-w-0">
                      <div 
                        onClick={() => navigate('/' + sug.username)}
                        className="font-bold text-xs text-zinc-920 dark:text-zinc-100 truncate hover:underline cursor-pointer select-text"
                      >
                        {sug.displayName}
                      </div>
                      <div className="text-[10px] text-zinc-450 dark:text-zinc-500 truncate select-text">
                        @{sug.username}
                      </div>

                      {/* Display connection context naturally */}
                      <div className="text-[9px] font-mono text-zinc-450 dark:text-zinc-510 truncate mt-0.5 select-text">
                        {sug.mutualCount > 0 ? (
                          <span className="text-zinc-500 dark:text-zinc-400">
                            👥 Followed by <strong className="font-bold">{sug.mutualNames[0]}</strong>
                            {sug.mutualNames.length > 1 && ' + more'}
                          </span>
                        ) : sug.sharedTagsCount > 0 ? (
                          <span className="text-amber-600 dark:text-amber-450 font-bold">
                            ⭐️ Shares tag interests
                          </span>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-550">Suggested for you</span>
                        )}
                      </div>
                    </div>

                    {/* Right: Follow button */}
                    <button
                      type="button"
                      onClick={() => handleFollowSuggestedUser(sug.uid)}
                      className="text-[10px] font-extrabold px-3 py-1.5 bg-[#1877f2] hover:bg-[#166fe5] text-white rounded-lg transition-all shrink-0 cursor-pointer grow-0 flex items-center gap-1 hover:scale-105 duration-100 shadow-2xs"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Follow</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick instructions box matching Memos feel */}
          <div className="mt-6 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
            <p className="font-bold text-zinc-900 dark:text-zinc-100 mb-1 flex items-center gap-1.5 text-xs">
              💡 Microblogging Tip
            </p>
            Type keywords prefixed with '#' to instantly tag posts. Click hashtags on card boards to run instant micro-queries.
          </div>
        </div>
      </div>
    </div>
  );
};
