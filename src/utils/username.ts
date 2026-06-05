/**
 * List of reserved words that cannot be claimed as usernames
 * to prevent conflicts with core application routing and system services.
 */
export const RESERVED_WORDS = new Set([
  'admin', 'settings', 'login', 'signup', 'logout', 'api', 'help', 'support', 
  'about', 'privacy', 'terms', 'explore', 'search', 'notifications', 
  'messages', 'home', 'index', 'feed', 'private', 'profile', 'user', 'users',
  'memos', 'follows', 'usernames', 'comments', 'likes', 'null', 'undefined', 'static', 'assets'
]);

/**
 * Validates a username against the strict criteria:
 * - Length between 3 and 30 characters
 * - Only lowercase/uppercase alphanumeric, underscores, or hyphens
 * - No consecutive underscores or hyphens
 * - No leading or trailing underscores or hyphens
 * - Cannot be a reserved system route or keyword
 */
export function validateUsername(username: string): { isValid: boolean; error?: string } {
  if (!username) {
    return { isValid: false, error: 'Username is required.' };
  }

  const trimmed = username.trim();
  const lower = trimmed.toLowerCase();

  // Length check
  if (trimmed.length < 3 || trimmed.length > 30) {
    return { isValid: false, error: 'Username must be between 3 and 30 characters.' };
  }

  // Reserved word check
  if (RESERVED_WORDS.has(lower)) {
    return { isValid: false, error: `"${trimmed}" is a reserved system route and cannot be claimed.` };
  }

  // Character set check (alphanumeric, hyphens, underscores)
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { isValid: false, error: 'Username can only contain alphanumeric characters, hyphens, and underscores.' };
  }

  // Leading symbol check
  if (/^[_-]/.test(trimmed)) {
    return { isValid: false, error: 'Username cannot start with a hyphen or underscore.' };
  }

  // Trailing symbol check
  if (/[_-]$/.test(trimmed)) {
    return { isValid: false, error: 'Username cannot end with a hyphen or underscore.' };
  }

  // Consecutive symbols check
  if (/[_-]{2,}/.test(trimmed)) {
    return { isValid: false, error: 'Username cannot contain consecutive underscores or hyphens.' };
  }

  return { isValid: true };
}
