import React, { useState } from 'react';
import { Mail, Lock, User, Sparkles, LogIn, ChevronRight, UserPlus, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { signInWithGoogle, signUpWithEmail, signInWithEmail, checkUsernameUnique, resetPassword } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    try {
      if (isResetPassword) {
        if (!cleanEmail) {
           throw new Error('Please enter your email to reset your password.');
        }
        await resetPassword(cleanEmail);
        setMessage('Password reset email sent! Check your inbox.');
        setIsResetPassword(false);
      } else if (isRegister) {
        const cleanUser = username.trim().toLowerCase();
        const cleanDisplay = displayName.trim();

        if (cleanUser.length < 3 || cleanUser.length > 30) {
          throw new Error('Username must be between 3 and 30 characters.');
        }

        if (!/^[a-zA-Z0-9_\-]+$/.test(cleanUser)) {
          throw new Error('Username can only contain alphanumeric characters, underscores, or hyphens.');
        }

        // Verify uniqueness
        const isUnique = await checkUsernameUnique(cleanUser);
        if (!isUnique) {
          throw new Error('This username is already claimed by another user.');
        }

        await signUpWithEmail(cleanEmail, cleanPassword, cleanUser, cleanDisplay);
      } else {
        await signInWithEmail(cleanEmail, cleanPassword);
      }
    } catch (err: any) {
      console.error(err);
      let errorMessage = err.message || 'Authorization failed. Please check your credentials.';
      try {
        if (errorMessage.startsWith('{')) {
          const parsed = JSON.parse(errorMessage);
          if (parsed.error) {
            errorMessage = parsed.error;
          }
        } else if (errorMessage.includes('auth/invalid-credential')) {
           errorMessage = 'Invalid email or password. Please try again.';
        } else if (errorMessage.includes('auth/email-already-in-use')) {
           errorMessage = 'This email address is already registered. Please sign in instead.';
        }
      } catch (e) {
        // ignore parse errors
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      setError('Google Sign-In canceled or failed due to safety policies.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] h-full sm:h-[100dvh] bg-zinc-50 dark:bg-zinc-950 flex flex-col md:flex-row items-stretch justify-center relative overflow-y-auto sm:overflow-hidden select-none">
      
      {/* Left Form Section */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 z-10 relative bg-zinc-50 dark:bg-zinc-950">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-205 dark:border-zinc-800 rounded-3xl p-8 shadow-xs relative transition-all">
          
          {/* Brand identity */}
          <div className="flex flex-col items-center text-center gap-2 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center font-bold text-white dark:text-zinc-950 shadow-sm text-2xl">
              C
            </div>
            <div>
              <h1 className="text-2xl font-bold font-sans tracking-tight text-zinc-900 dark:text-zinc-50">
                Circle
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Microblogging Meets Visual Stories
              </p>
            </div>
          </div>

          {/* Authorization Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {isRegister && (
              <>
                {/* Username Picker */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Username</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-450 dark:text-zinc-550 text-xs font-bold font-mono">@</span>
                    <input
                      id="input-signup-username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="john_doe"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250/80 dark:border-zinc-800 rounded-xl pl-8 pr-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-105 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-950/10 dark:focus:ring-white/10 transition-all placeholder-zinc-455 dark:placeholder-zinc-500 font-medium"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Display Name Picker */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Display Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-455 dark:text-zinc-500">
                      <User className="w-3.5 h-3.5" />
                    </span>
                    <input
                      id="input-signup-displayname"
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250/80 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-105 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-950/10 dark:focus:ring-white/10 transition-all placeholder-zinc-455 dark:placeholder-zinc-500 font-medium"
                      disabled={loading}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email input field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400 dark:text-zinc-500">
                  <Mail className="w-3.5 h-3.5" />
                </span>
                <input
                  id="input-auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250/80 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-105 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-950/10 dark:focus:ring-white/10 transition-all placeholder-zinc-455 dark:placeholder-zinc-500 font-medium"
                  disabled={loading}
                />
              </div>
            </div>

            {!isResetPassword && (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Password</label>
                  {!isRegister && (
                    <button 
                      type="button" 
                      onClick={() => { setIsResetPassword(true); setError(null); setMessage(null); }}
                      className="text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400 dark:text-zinc-500">
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                  <input
                    id="input-auth-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250/80 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-105 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-950/10 dark:focus:ring-white/10 transition-all placeholder-zinc-455 dark:placeholder-zinc-500 font-medium"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 p-3 rounded-xl text-[11px] text-red-650 dark:text-red-400 font-mono font-bold break-words whitespace-pre-wrap">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/40 p-3 rounded-xl text-[11px] text-green-650 dark:text-green-400 font-mono font-bold">
                {message}
              </div>
            )}

            {/* Action Trigger Button */}
            <button
              type="submit"
              id="btn-auth-submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl font-bold bg-zinc-900 dark:bg-zinc-105 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 shadow-md shadow-zinc-200/50 dark:shadow-none transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isResetPassword ? <Mail className="w-4 h-4" /> : isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              <span>{loading ? 'Processing...' : isResetPassword ? 'Send Reset Link' : isRegister ? 'Create Account' : 'Sign In'}</span>
            </button>
          </form>

          {!isResetPassword && (
            <>
              {/* Separator */}
              <div className="relative flex py-4 items-center justify-center">
                <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
                <span className="flex-shrink mx-3 text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-sans font-bold">
                  or connect with
                </span>
                <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
              </div>

              {/* Google Authentication Trigger */}
              <button
                type="button"
                id="btn-auth-google"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer"
              >
                {/* Custom vector Google Icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </>
          )}

          {/* Toggle Account Mode Footnote */}
          <div className="text-center mt-6">
            <button
              type="button"
              id="btn-toggle-auth-mode"
              onClick={() => {
                if (isResetPassword) {
                  setIsResetPassword(false);
                } else {
                  setIsRegister(!isRegister);
                }
                setError(null);
                setMessage(null);
              }}
              className="text-xs text-zinc-900 dark:text-zinc-100 hover:text-zinc-700 dark:hover:text-zinc-300 font-bold underline cursor-pointer"
            >
              {isResetPassword 
                ? 'Back to Sign In' 
                : isRegister 
                  ? 'Already have an account? Sign In' 
                  : "Don't have an account yet? Sign Up"}
            </button>
          </div>
        </div>

        {/* Humble Footer info */}
        <div className="mt-8 flex items-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500 font-medium font-sans select-none">
          <span>Circle • Secure Protocol</span>
        </div>
      </div>

      {/* Right Visual Panel Section */}
      <div className="hidden md:flex flex-1 flex-col justify-between p-12 bg-zinc-950 dark:bg-black text-white relative overflow-hidden border-l border-zinc-200 dark:border-zinc-850">
        {/* Animated fluid gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-900 opacity-60 pointer-events-none" />
        <div className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] bg-white/5 rounded-full blur-[100px] mix-blend-color-dodge pointer-events-none" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-white/5 rounded-full blur-[80px] mix-blend-color-dodge pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 max-w-xl mt-auto mb-auto">
          <div className="w-16 h-16 rounded-3xl bg-white text-zinc-950 flex items-center justify-center font-extrabold text-3xl shadow-2xl mb-4">
            C
          </div>
          <h2 className="text-5xl font-black tracking-tight leading-none text-white drop-shadow-sm font-sans">
            Minimal.  <br/> Authentic. 
          </h2>
          <p className="text-zinc-400 text-lg font-medium max-w-sm mt-2 leading-relaxed">
            Join the decentralized community of creators shaping the new web. Free from noise, focused on connections.
          </p>
          
          <div className="flex -space-x-4 mt-8">
             <div className="w-12 h-12 rounded-full border-2 border-zinc-950 bg-zinc-800 flex items-center justify-center overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=josh&backgroundColor=b6e3f4`} alt="User 1" className="w-full h-full object-cover" />
             </div>
             <div className="w-12 h-12 rounded-full border-2 border-zinc-950 bg-zinc-800 flex items-center justify-center overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=alice&backgroundColor=ffdfbf`} alt="User 2" className="w-full h-full object-cover" />
             </div>
             <div className="w-12 h-12 rounded-full border-2 border-zinc-950 bg-zinc-800 flex items-center justify-center overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=sam&backgroundColor=c0aede`} alt="User 3" className="w-full h-full object-cover" />
             </div>
             <div className="w-12 h-12 rounded-full border-2 border-zinc-950 bg-white flex items-center justify-center relative overfow-hidden text-zinc-900 font-bold text-xs space-x-0.5">
                +9K
             </div>
          </div>
        </div>
        
        <div className="relative z-10 font-mono text-[10px] tracking-widest text-zinc-500 uppercase flex items-center justify-between mt-auto">
          <span>Encrypted Sync</span>
          <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/> All Systems Operational</span>
        </div>
      </div>
    </div>
  );
};
