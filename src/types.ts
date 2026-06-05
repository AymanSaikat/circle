export interface UserProfile {
  id: string; // User authentication UID
  username: string; // Unique URL name slug
  displayName: string;
  avatarUrl: string;
  bio: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface PollData {
  question: string;
  options: string[];
  votes: Record<string, string[]>; // map of optionIndex string -> array of user uids who voted
  expiresAt: string; // ISO datetime string
}

export interface Memo {
  id: string; // Document ID
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  content: string; // Supports hashtag detection and markdown
  mediaUrls: string[]; // Base64 stored strings or external URLs
  visibility: 'public' | 'followers' | 'private';
  tags: string[];
  likesCount: number;
  commentsCount: number;
  createdAt: any; // Firestore Timestamp
  bookmarkedAt?: any; // Firestore Timestamp (optional, for saved context)
  publishAt?: any; // Firestore Timestamp (optional, for scheduled context)
  poll?: PollData; // Optional polling attachment
}

export interface Comment {
  id: string;
  memoId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  content: string;
  createdAt: any; // Firestore Timestamp
}

export interface Follow {
  followerId: string;
  followingId: string;
  createdAt: any; // Firestore Timestamp
}

export interface AuthState {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
}
