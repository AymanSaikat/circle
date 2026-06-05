import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile as updateAuthProfile
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebaseClient';
import { UserProfile } from '../types';
import { validateUsername, RESERVED_WORDS } from '../utils/username';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, username: string, displayName: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  saveProfile: (displayName: string, bio: string, avatarUrl: string, newUsername?: string) => Promise<void>;
  checkUsernameUnique: (username: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    const profileRef = doc(db, 'users', uid);
    try {
      const snap = await getDoc(profileRef);
      if (snap.exists()) {
        setProfile({ id: snap.id, ...snap.data() } as UserProfile);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  };

  const refreshProfile = async () => {
    if (user?.uid) {
      await fetchProfile(user.uid);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        // Fetch/create profile trigger will occur in the state change or immediately
        await fetchProfile(result.user.uid);
      }
    } catch (error) {
      console.error('Google Auth Error:', error);
      throw error;
    }
  };

  const checkUsernameUnique = async (username: string): Promise<boolean> => {
    const term = username.trim().toLowerCase();
    if (!term || RESERVED_WORDS.has(term)) return false;
    
    const claimRef = doc(db, 'usernames', term);
    try {
      const snap = await getDoc(claimRef);
      if (!snap.exists()) return true;
      const data = snap.data();
      // If it exists but belongs to current user, it's valid
      if (data && data.userId === user?.uid) {
        return true;
      }
      return false;
    } catch (error) {
      return handleFirestoreError(error, OperationType.GET, `usernames/${term}`);
    }
  };

  const signUpWithEmail = async (email: string, password: string, username: string, displayName: string) => {
    try {
      const cleanUsername = username.trim();
      const claimSlug = cleanUsername.toLowerCase();

      // 1. Validate rules
      const valResult = validateUsername(cleanUsername);
      if (!valResult.isValid) {
        throw new Error(valResult.error);
      }

      // 2. Enforce unique check
      const isUnique = await checkUsernameUnique(claimSlug);
      if (!isUnique) {
        throw new Error('Username is already taken.');
      }

      // 3. Auth create original user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      
      // Update display name in Firebase Auth
      await updateAuthProfile(newUser, { displayName });

      // 4. Create public profile & registry claim inside a secure atom write batch
      const userRef = doc(db, 'users', newUser.uid);
      const claimRef = doc(db, 'usernames', claimSlug);
      const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`;
      
      const profileData = {
        username: cleanUsername, // preserves casing for display
        displayName: displayName || cleanUsername,
        avatarUrl: defaultAvatar,
        bio: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const claimData = {
        userId: newUser.uid,
        createdAt: serverTimestamp()
      };

      const batch = writeBatch(db);
      batch.set(claimRef, claimData);
      batch.set(userRef, profileData);
      await batch.commit();

      setProfile({ id: newUser.uid, ...profileData } as any);
      setUser(newUser);
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
      setProfile(null);
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const saveProfile = async (displayName: string, bio: string, avatarUrl: string, newUsername?: string) => {
    if (!user) throw new Error('Not authenticated');
    
    const userRef = doc(db, 'users', user.uid);
    try {
      const snap = await getDoc(userRef);
      const cleanAvatar = avatarUrl.trim() || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(profile?.username || user.uid)}`;
      
      const updatedData: any = {
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl: cleanAvatar,
        updatedAt: serverTimestamp(),
      };

      const isInitialClaim = !snap.exists();

      if (isInitialClaim) {
        let cleanUsername = (newUsername || '').trim();
        if (!cleanUsername) {
          const baseName = user.displayName || `user_${Math.floor(1000 + Math.random() * 9000)}`;
          cleanUsername = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
        }
        
        if (cleanUsername.length < 3) {
          cleanUsername = `user_${Math.floor(1000 + Math.random() * 9000)}`;
        }

        const cleanUsernameLower = cleanUsername.toLowerCase();

        // 1. Validate
        const validation = validateUsername(cleanUsername);
        if (!validation.isValid) {
          throw new Error(validation.error);
        }

        // 2. Check uniqueness
        const isUnique = await checkUsernameUnique(cleanUsernameLower);
        if (!isUnique) {
          throw new Error('Username is already taken.');
        }

        updatedData.username = cleanUsername; // casing preserved
        updatedData.createdAt = serverTimestamp();

        const batch = writeBatch(db);
        batch.set(doc(db, 'usernames', cleanUsernameLower), {
          userId: user.uid,
          createdAt: serverTimestamp()
        });
        batch.set(userRef, updatedData);
        await batch.commit();

        // Atomic & immediate local state update so context reacts instantly
        setProfile({
          id: user.uid,
          ...updatedData,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);
      } else {
        const currentUsername = profile?.username || snap.data()?.username;
        const hasNewUsername = newUsername && newUsername.trim() !== '';
        const isChangingUsername = currentUsername && hasNewUsername && newUsername!.trim().toLowerCase() !== currentUsername.toLowerCase();

        if (isChangingUsername) {
          const cleanNew = newUsername!.trim();
          const cleanNewLower = cleanNew.toLowerCase();

          // 1. Validate
          const validation = validateUsername(cleanNew);
          if (!validation.isValid) {
            throw new Error(validation.error);
          }

          // 2. Check uniqueness 
          const isUnique = await checkUsernameUnique(cleanNewLower);
          if (!isUnique) {
            throw new Error('Username is already taken.');
          }

          const batch = writeBatch(db);

          // a. Create new username registry entry
          const newClaimRef = doc(db, 'usernames', cleanNewLower);
          batch.set(newClaimRef, {
            userId: user.uid,
            createdAt: serverTimestamp()
          });

          // b. Create redirect for legacy username (if existed)
          if (currentUsername) {
            const oldClaimRef = doc(db, 'usernames', currentUsername.toLowerCase());
            batch.set(oldClaimRef, {
              userId: user.uid,
              isRedirect: true,
              redirectTo: cleanNewLower,
              createdAt: serverTimestamp()
            });
          }

          updatedData.username = cleanNew; // casing preserved
          batch.set(userRef, updatedData, { merge: true });
          await batch.commit();

          setProfile({
            ...profile,
            ...updatedData,
            updatedAt: new Date(),
          } as any);
        } else {
          await setDoc(userRef, updatedData, { merge: true });
          setProfile({
            ...profile,
            ...updatedData,
            updatedAt: new Date(),
          } as any);
        }
      }

      await fetchProfile(user.uid);
    } catch (error) {
      return handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signInWithGoogle,
      signUpWithEmail,
      signInWithEmail,
      logOut,
      saveProfile,
      checkUsernameUnique,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
