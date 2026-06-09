import React, { useState, useEffect } from 'react';
import { LayoutGrid, List, FileEdit, Users, Calendar, Hash, Image, Save, Sparkles, RefreshCw, Bookmark } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, getDoc, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebaseClient';
import { useAuth } from '../context/AuthContext';
import { CircleCard } from '../components/CircleCard';
import { CirclesSkeleton } from '../components/CirclesSkeleton';
import { Memo } from '../types';

interface ProfileProps {
  onTagClick: (tag: string) => void;
  targetUserId?: string | null; // Optional: viewing a different user's profile
}

export const Profile: React.FC<ProfileProps> = ({ onTagClick, targetUserId }) => {
  const { user, profile, saveProfile } = useAuth();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  
  // Custom states for profile detail queries
  const [viewedProfile, setViewedProfile] = useState<any>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  
  // Custom states for editing profile
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const effectiveUserId = targetUserId || user?.uid;
  const isOwnProfile = !targetUserId || targetUserId === user?.uid;

  // 1. Fetch analyzed profile metadata (handles both viewing self and others)
  useEffect(() => {
    if (!effectiveUserId) return;
    
    setLoading(true);
    const profileRef = doc(db, 'users', effectiveUserId);
    
    const unsub = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        const details: any = { id: snap.id, ...snap.data() };
        setViewedProfile(details);
        // Pre-populate edits
        setEditDisplayName(details.displayName || '');
        setEditBio(details.bio || '');
        setEditAvatarUrl(details.avatarUrl || '');
      } else if (isOwnProfile && profile) {
        setViewedProfile(profile);
      } else {
        setViewedProfile(null);
      }
    });

    return unsub;
  }, [effectiveUserId, isOwnProfile, profile]);

  // 2. Fetch follower counts dynamically
  useEffect(() => {
    if (!effectiveUserId) return;

    const followsRef = collection(db, 'follows');
    
    // Followers query
    const qFollowers = query(followsRef, where('followingId', '==', effectiveUserId));
    const unsubFollowers = onSnapshot(qFollowers, (snap) => {
      setFollowerCount(snap.size);
    });

    // Following query
    const qFollowing = query(followsRef, where('followerId', '==', effectiveUserId));
    const unsubFollowing = onSnapshot(qFollowing, (snap) => {
      setFollowingCount(snap.size);
    });

    return () => {
      unsubFollowers();
      unsubFollowing();
    };
  }, [effectiveUserId]);

  // 3. Fetch list of memo documents authored by this user
  useEffect(() => {
    if (!effectiveUserId) return;

    const memosRef = collection(db, 'memos');
    
    // Choose the secure query structure based on profile ownership
    let q;
    if (effectiveUserId === user?.uid) {
      q = query(memosRef, where('userId', '==', effectiveUserId), orderBy('createdAt', 'desc'));
    } else {
      q = query(memosRef, where('userId', '==', effectiveUserId), where('visibility', '==', 'public'), orderBy('createdAt', 'desc'));
    }

    // Try live snapshot, catch index errors and fallback if necessary
    const unsub = onSnapshot(q, (snap) => {
      const list: Memo[] = [];
      snap.forEach(d => {
        const m = d.data() as any;
        list.push({ id: d.id, ...m } as Memo);
      });
      setMemos(list);
      setLoading(false);
    }, (err) => {
      console.warn('Index not created yet? Executing safe chronological client sort.', err);
      // Fallback query to bypass index creation failures: fetch own or public depending on ownership
      let fallbackQuery;
      if (effectiveUserId === user?.uid) {
        fallbackQuery = query(memosRef, where('userId', '==', effectiveUserId));
      } else {
        fallbackQuery = query(memosRef, where('userId', '==', effectiveUserId), where('visibility', '==', 'public'));
      }
      getDocs(fallbackQuery).then((snapshot) => {
        const list: Memo[] = [];
        snapshot.forEach((d) => {
          const m = d.data() as any;
          list.push({ id: d.id, ...m } as Memo);
        });
        // Sort chronologically on client
        list.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
        setMemos(list);
        setLoading(false);
      }).catch(fallbackErr => {
        console.error('Fallback query failed', fallbackErr);
        setLoading(false);
      });
    });

    return unsub;
  }, [effectiveUserId]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwnProfile || saving) return;

    if (!editDisplayName.trim()) {
      setEditError('Display name is required');
      return;
    }

    setSaving(true);
    setEditError(null);

    try {
      await saveProfile(editDisplayName, editBio, editAvatarUrl);
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      setEditError('Could not update user profile details. Check rules.');
    } finally {
      setSaving(false);
    }
  };

  // Extract all media URLs to build natural Instagram Gallery Grid
  const getProfileMediaPosts = () => {
    return memos.filter(m => m.mediaUrls && m.mediaUrls.length > 0);
  };

  const mediaPosts = getProfileMediaPosts();

  // Helper date formatter
  const formatDate = (stamp: any) => {
    if (!stamp) return 'Joined today';
    const date = stamp.toDate ? stamp.toDate() : new Date(stamp);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (!viewedProfile && !loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-203 dark:border-zinc-800 p-12 rounded-2xl max-w-sm shadow-xs">
          <Bookmark className="w-10 h-10 text-zinc-400 dark:text-zinc-500 mx-auto mb-4" />
          <h2 className="text-zinc-900 dark:text-zinc-50 font-bold text-lg">No profile found</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">This user profile hasn't been initialized inside the social client yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto w-full">
      <div className="max-w-5xl mx-auto w-full p-4 md:p-8 select-none">
      
      {/* Profile Detail header card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-205 dark:border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xs mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-100/50 dark:bg-zinc-800/10 rounded-full blur-3xl pointer-events-none" />
        
        {isEditing ? (
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4 relative z-10">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-zinc-900 dark:text-zinc-105" /> Modify Public Profile
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Display Name</label>
                <input
                  id="input-profile-edit-name"
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-105 rounded-xl p-3 text-xs border border-zinc-200 dark:border-zinc-800 focus:border-zinc-950 dark:focus:border-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-950/10 dark:focus:ring-white/10 transition-all font-medium"
                  placeholder="Cool display name"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Avatar Image URL</label>
                <input
                  id="input-profile-edit-avatar"
                  type="text"
                  value={editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-xl p-3 text-xs border border-zinc-200 dark:border-zinc-800 focus:border-zinc-950 dark:focus:border-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-950/10 dark:focus:ring-white/10 transition-all font-medium"
                  placeholder="https://api.dicebear.com/..."
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Short Bio</label>
              <textarea
                id="textarea-profile-edit-bio"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={3}
                className="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-xl p-3 text-xs border border-zinc-200 dark:border-zinc-800 focus:border-zinc-950 dark:focus:border-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-950/10 dark:focus:ring-white/10 resize-none transition-all"
                placeholder="Share something friendly with your followers..."
                maxLength={500}
              />
            </div>

            {editError && (
              <p className="text-red-600 dark:text-red-400 text-xs font-mono font-bold">{editError}</p>
            )}

            <div className="flex gap-2.5 justify-end mt-2">
              <button
                type="button"
                id="btn-edit-profile-cancel"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-707 dark:text-zinc-300 rounded-xl hover:bg-zinc-205 dark:hover:bg-zinc-700 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-edit-profile-save"
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 rounded-xl shadow-md cursor-pointer disabled:opacity-50 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save details'}</span>
              </button>
            </div>
          </form>
        ) : viewedProfile ? (
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left relative z-10">
            <img
              src={viewedProfile.avatarUrl}
              alt={viewedProfile.displayName}
              className="w-24 h-24 rounded-full object-cover border transition-transform duration-300 hover:scale-[1.03] border-zinc-200 dark:border-zinc-800 shadow-md bg-zinc-100 dark:bg-zinc-800"
            />
            
            <div className="flex-1 flex flex-col gap-4">
              <div>
                <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-sans">
                      {viewedProfile.displayName}
                    </h2>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm font-bold">@{viewedProfile.username}</p>
                  </div>

                  {isOwnProfile && (
                    <button
                      id="btn-trigger-edit-profile"
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-250 rounded-xl transition-all select-none cursor-pointer"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>Edit details</span>
                    </button>
                  )}
                </div>

                <p className="text-zinc-650 dark:text-zinc-300 text-sm mt-3 max-w-xl leading-relaxed whitespace-pre-wrap select-text">
                  {viewedProfile.bio || 'This user is busy microblogging and forgot to compose their public biography.'}
                </p>
              </div>

              {/* Dynamic followers counting tags */}
              <div className="flex items-center flex-wrap gap-6 justify-center md:justify-start border-t border-zinc-150 dark:border-zinc-800/80 pt-4 mt-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 font-sans text-lg">{memos.length}</span>
                  <span className="text-zinc-500 dark:text-zinc-400 text-xs">Circles</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 font-sans text-lg">{followerCount}</span>
                  <span className="text-zinc-500 dark:text-zinc-400 text-xs flex items-center gap-1">
                    <Users className="w-3 h-3 text-zinc-500 dark:text-zinc-400" /> Followers
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="font-bold text-zinc-900 dark:text-zinc-105 font-sans text-lg">{followingCount}</span>
                  <span className="text-zinc-500 dark:text-zinc-400 text-xs">Following</span>
                </div>

                <div className="text-zinc-400 dark:text-zinc-500 text-xs font-mono font-bold ml-auto hidden lg:flex items-center gap-1.5 select-none">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                  <span>Joined {formatDate(viewedProfile.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs animate-pulse select-none my-2.5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-zinc-250 dark:bg-zinc-800" />
              <div className="flex-1 flex flex-col gap-2.5">
                <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-3 w-48 bg-zinc-200 dark:bg-zinc-850 rounded" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Alternative View triggers (Instagram Grid vs Circles microblog list) */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-6">
        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-sans">
          {viewType === 'grid' ? 'Media Publications Gallery' : 'Microblog Publications Timeline'}
        </h3>

        <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-1">
          <button
            id="btn-view-type-grid"
            onClick={() => setViewType('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              viewType === 'grid'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow shadow-zinc-900/10 font-bold'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Grid view</span>
          </button>
          
          <button
            id="btn-view-type-list"
            onClick={() => setViewType('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              viewType === 'list'
                ? 'bg-zinc-900 dark:bg-zinc-101 text-white dark:text-zinc-950 shadow shadow-zinc-900/10 font-bold'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>List view</span>
          </button>
        </div>
      </div>

      {/* Render results based on layout selector */}
      {loading ? (
        <div className="flex flex-col gap-6">
          <CirclesSkeleton />
          <CirclesSkeleton />
        </div>
      ) : memos.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center text-zinc-500 dark:text-zinc-400 shadow-xs">
          <p className="text-xs italic select-none">There are no publications under this feed yet.</p>
        </div>
      ) : viewType === 'grid' ? (
        mediaPosts.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center text-zinc-500 dark:text-zinc-400 shadow-xs flex flex-col gap-2 items-center">
            <Image className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
            <p className="text-xs italic select-none">No media publications found. Try adding attachments to your circles!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {mediaPosts.map(m => (
              <div 
                key={m.id} 
                className="relative aspect-square group rounded-xl overflow-hidden hover:scale-[1.01] border border-zinc-200 bg-zinc-50 transition-all cursor-pointer shadow-xs"
                onClick={() => setViewType('list')} // Quick toggle to read the post
              >
                <img
                  src={m.mediaUrls[0]}
                  alt="publication attachment"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-zinc-950/90 backdrop-blur-xs flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-1.5 p-3 h-full">
                  <p className="text-white text-xs font-medium line-clamp-2 text-center px-2 leading-relaxed">
                    {m.content}
                  </p>
                  <span className="text-[9px] text-zinc-900 font-bold tracking-widest font-sans uppercase bg-white px-2 py-1 rounded shadow-xs mt-1.5">
                    Read Post
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="flex flex-col gap-6">
          {memos.map(memo => (
            <CircleCard
              key={memo.id}
              memo={memo}
              onTagClick={onTagClick}
              onDeleteSuccess={() => {}}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  );
};
