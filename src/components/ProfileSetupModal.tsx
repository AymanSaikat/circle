import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { Camera, Sparkles, AlertCircle, RefreshCw, Upload, Check, X } from 'lucide-react';
import { validateUsername } from '../utils/username';
import Cropper from 'react-easy-crop';

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

const getCroppedImg = (imageSrc: string, pixelCrop: Area): Promise<string> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No 2D canvas context available'));
        return;
      }

      // Crop to a standard 300x300 high resolution representation
      const targetSize = 300;
      canvas.width = targetSize;
      canvas.height = targetSize;

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        targetSize,
        targetSize
      );

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    image.onerror = (err) => {
      reject(err);
    };
  });
};

interface ProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  forceOnboarding: boolean;
}

export const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({ isOpen, onClose, forceOnboarding }) => {
  const { profile, saveProfile, checkUsernameUnique, user } = useAuth();
  const { navigate } = useRouter();
  
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Crop & Upload States
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropScreen, setShowCropScreen] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatarUrl || '');
      setAvailable(true);
    } else if (user) {
      setDisplayName(user.displayName || '');
      const seed = user.email ? user.email.split('@')[0] : `user_${Math.floor(1000 + Math.random() * 9000)}`;
      const docClean = seed.toLowerCase().replace(/[^a-z0-9]/g, '');
      const finalClean = docClean.length >= 3 ? docClean : `user_${Math.floor(1000 + Math.random() * 9000)}`;
      setUsername(finalClean);
      setAvatarUrl(`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(finalClean)}`);
      
      // Auto checking of suggested username uniqueness on mount/on login
      setChecking(true);
      checkUsernameUnique(finalClean.toLowerCase())
        .then((isUnique) => {
          setAvailable(isUnique);
        })
        .catch(() => {
          setAvailable(null);
        })
        .finally(() => {
          setChecking(false);
        });
    }
  }, [profile, user, isOpen]);

  // Handle unique username check
  const handleUsernameCheck = async (val: string) => {
    const clean = val.trim();
    setUsername(clean);
    const cleanLower = clean.toLowerCase();

    if (profile && cleanLower === profile.username.toLowerCase()) {
      setAvailable(true);
      return;
    }

    // Run rules first
    const validation = validateUsername(clean);
    if (!validation.isValid) {
      setAvailable(false);
      return;
    }

    setChecking(true);
    try {
      const isUnique = await checkUsernameUnique(cleanLower);
      setAvailable(isUnique);
    } catch {
      setAvailable(null);
    } finally {
      setChecking(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanDisplay = displayName.trim();
    const cleanBio = bio.trim();
    const cleanAvatar = avatarUrl.trim();
    const cleanUsername = username.trim();

    try {
      // Validate username rules
      const validation = validateUsername(cleanUsername);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // If we adjusted/updated the username, double check checking results
      const isNewUsername = !profile || cleanUsername.toLowerCase() !== profile.username.toLowerCase();
      if (isNewUsername) {
        const isUnique = await checkUsernameUnique(cleanUsername.toLowerCase());
        if (!isUnique) {
          throw new Error('Username is already taken.');
        }
      }

      // Save profile
      await saveProfile(cleanDisplay || cleanUsername, cleanBio, cleanAvatar, cleanUsername);
      onClose();
      // Ensure the user is directed to their new profile.
      navigate('/' + cleanUsername.toLowerCase());
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update profile. Please review fields.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (showCropScreen && imageSrc) {
    return (
      <div className="fixed inset-0 bg-zinc-950/60 dark:bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-6 z-50">
        <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl relative flex flex-col select-none">
          <div className="flex flex-col gap-1 mb-4 text-center">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Crop Profile Photo</h3>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Position and zoom your photo for a perfect circular fit</p>
          </div>

          {/* Fixed height container for react-easy-crop */}
          <div className="relative w-full h-64 bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
            />
          </div>

          {/* Slider trigger */}
          <div className="mt-4 flex flex-col gap-1.5 px-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 dark:text-zinc-500 font-mono">
              <span>ZOOM LEVEL</span>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-ew-resize accent-zinc-900 dark:accent-white focus:outline-none transition-all"
            />
          </div>

          <div className="flex gap-2.5 justify-end mt-6">
            <button
              type="button"
              onClick={() => {
                setShowCropScreen(false);
                setImageSrc(null);
              }}
              className="px-4 py-2 text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-750 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (imageSrc && croppedAreaPixels) {
                  try {
                    setLoading(true);
                    const croppedB64 = await getCroppedImg(imageSrc, croppedAreaPixels);
                    setAvatarUrl(croppedB64);
                    setShowCropScreen(false);
                    setImageSrc(null);
                  } catch (err) {
                    console.error("Error cropping image:", err);
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-zinc-900 dark:bg-zinc-105 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 shadow-md transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Crop</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-zinc-950/60 dark:bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-6 z-50">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl relative">
        
        {/* Header title */}
        <div className="flex flex-col gap-1 mb-6 text-center">
          <div className="mx-auto w-10 h-10 rounded-xl bg-zinc-900/5 dark:bg-white/5 flex items-center justify-center mb-2">
            <Sparkles className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {forceOnboarding ? 'Claim Social Identity' : 'Customize Profile'}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {forceOnboarding 
              ? 'Complete onboarding by reserving your dynamic unique microblog username'
              : 'Pick matching avatar tags and edit bios smoothly for followers'}
          </p>
        </div>

        {/* Input box form */}
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          
          {/* Avatar Preview Selector with Custom Crop Integration */}
          <div className="flex flex-col items-center gap-3 bg-zinc-50/50 dark:bg-zinc-900/30 p-4 border border-zinc-150 dark:border-zinc-850 rounded-2xl">
            <div className="relative group">
              <img
                src={avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=placeholder'}
                alt="Avatar simulation"
                className="w-20 h-20 rounded-full border-4 border-white dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 object-cover shadow-md"
              />
              <div className="absolute inset-0 bg-black/10 dark:bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
            </div>

            <div className="flex items-center gap-2">
              <label 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-xl text-[10px] font-bold cursor-pointer transition-all shadow-sm select-none"
                title="Upload custom image file"
              >
                <Upload className="w-3 h-3" />
                <span>Upload Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      const file = e.target.files[0];
                      const reader = new FileReader();
                      reader.addEventListener('load', () => {
                        setImageSrc(reader.result as string);
                        setCrop({ x: 0, y: 0 });
                        setZoom(1);
                        setShowCropScreen(true);
                      });
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  const rSeed = Math.floor(Math.random() * 10000);
                  setAvatarUrl(`https://api.dicebear.com/7.x/bottts/svg?seed=${rSeed}`);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-250 dark:border-zinc-800 hover:bg-zinc-105 dark:hover:bg-zinc-850/40 text-zinc-700 dark:text-zinc-300 rounded-xl text-[10px] font-bold cursor-pointer transition-all select-none"
                title="Generate standard robotic seed"
              >
                <RefreshCw className="w-3 h-3 text-zinc-500" />
                <span>Robot Seed</span>
              </button>
            </div>
            <span className="text-[9px] text-zinc-400 dark:text-zinc-550 font-mono tracking-wide text-center">
              Crop local images perfectly or generate automated unique vector seeds
            </span>
          </div>

          {/* Username */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Unique Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400 font-bold text-xs">@</span>
              <input
                id="modal-username-input"
                type="text"
                required
                value={username}
                onChange={(e) => handleUsernameCheck(e.target.value)}
                placeholder="john_doe"
                className={`w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-405 dark:placeholder-zinc-600 rounded-xl pl-8 pr-10 py-2.5 text-xs focus:outline-none transition-all border ${
                  available === true ? 'border-emerald-500 focus:ring-1 focus:ring-emerald-500/20' :
                  available === false ? 'border-red-500 focus:ring-1 focus:ring-red-500/20' : 'border-zinc-200 dark:border-zinc-800 focus:border-zinc-950 dark:focus:border-zinc-100'
                }`}
              />
              
              {/* Checking status text indicators */}
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                {checking ? (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1877f2] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1877f2]"></span>
                  </span>
                ) : available === true ? (
                  <span className="text-emerald-500 text-xs font-bold">✓</span>
                ) : available === false ? (
                  <span className="text-red-500 text-xs font-bold">✕</span>
                ) : null}
              </span>
            </div>
            {available === false && (
              <span className="text-[10px] text-red-500 dark:text-red-400 font-medium">Username is taken or does not follow criteria.</span>
            )}
            {available === true && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Username is available!</span>
            )}
          </div>

          {/* Display Name Input */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Display Name</label>
            <input
              id="modal-displayname-input"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none border border-zinc-200 dark:border-zinc-800 focus:border-zinc-950 dark:focus:border-zinc-100 transition-all"
            />
          </div>

          {/* Custom Avatar string input URL */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Or enter Custom URL</label>
            <input
              id="modal-avatarurl-input"
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-105 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none border border-zinc-200 dark:border-zinc-800 focus:border-zinc-950 dark:focus:border-zinc-100 transition-all font-medium"
            />
          </div>

          {/* Biography Input */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Short Bio</label>
            <textarea
              id="modal-bio-input"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Coder by day, reader by night..."
              className="w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-xl p-3 text-xs focus:outline-none border border-zinc-200 dark:border-zinc-800 focus:border-zinc-950 dark:focus:border-zinc-100 transition-all resize-none"
              maxLength={500}
            />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-3 rounded-xl text-[10px] text-red-650 dark:text-red-400 font-mono flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submission and Action panels */}
          <div className="flex gap-3 justify-end mt-2">
            {!forceOnboarding && (
              <button
                type="button"
                id="btn-modal-close"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all cursor-pointer"
              >
                Close
              </button>
            )}
            <button
              type="submit"
              id="btn-modal-save"
              disabled={loading || (forceOnboarding && available !== true)}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 dark:bg-zinc-105 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 shadow-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Compiling ID...' : forceOnboarding ? 'Claim Identity' : 'Save Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
