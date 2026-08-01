import React, { useState } from 'react';
import { X, Lock, Mail, User, AlertCircle, ShoppingBag, MapPin, KeyRound, Send, CheckCircle2, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess
}: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  
  // Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // OTP State
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);

  // UI state
  const [lookupMessage, setLookupMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setPincode('');
    setCity('');
    setState('');
    setOtp('');
    setOtpSent(false);
    setOtpSending(false);
    setLookupMessage('');
    setError(null);
    setLoading(false);
  };

  React.useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const handlePincodeChange = async (val: string) => {
    const cleaned = val.replace(/\D/g, '').substring(0, 6);
    setPincode(cleaned);
    
    if (cleaned.length === 6) {
      setLookupMessage("🔍 Querying Indian PIN Directory...");
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${cleaned}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice?.[0]) {
            const office = data[0].PostOffice[0];
            setCity(office.District || office.Name);
            setState(office.State);
            setLookupMessage(`📍 ${office.District}, ${office.State}`);
          } else {
            setLookupMessage("⚠️ PIN code not resolved. Specify manually.");
          }
        } else {
          setLookupMessage("⚠️ Service busy. Specify city/state manually.");
        }
      } catch (err) {
        setLookupMessage("⚠️ Error looking up PIN. Enter manually.");
      }
    } else {
      setLookupMessage("");
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }

    setError(null);
    setOtpSending(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send OTP code.");
      }

      setOtpSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP code.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (!displayName.trim()) {
          setError("Please specify your name.");
          setLoading(false);
          return;
        }

        if (!pincode || pincode.length !== 6) {
          setError("Please specify a valid 6-digit Indian PIN code.");
          setLoading(false);
          return;
        }

        if (!city.trim() || !state.trim()) {
          setError("Please specify both city and state.");
          setLoading(false);
          return;
        }

        // Backend Registration
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
            displayName: displayName.trim(),
            pincode: pincode.trim(),
            city: city.trim(),
            state: state.trim()
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Registration failed. Verify your details.");
        }

        // Save token & user profile
        localStorage.setItem('aura_token', data.token);
        localStorage.setItem('aura_pincode', pincode.trim());
        localStorage.setItem('aura_city', city.trim());
        localStorage.setItem('aura_state', state.trim());

        onSuccess(data.user);
        resetForm();
        onClose();
      } else {
        // Sign In Flow (Password or OTP)
        if (loginMethod === 'otp') {
          if (!otpSent) {
            await handleSendOtp();
            setLoading(false);
            return;
          }

          if (!otp || otp.trim().length !== 6) {
            setError("Please enter the 6-digit OTP verification code.");
            setLoading(false);
            return;
          }

          const response = await fetch('/api/auth/login-otp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: email.trim(),
              otp: otp.trim()
            })
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "Incorrect OTP code.");
          }

          localStorage.setItem('aura_token', data.token);
          if (data.user.pincode) localStorage.setItem('aura_pincode', data.user.pincode);
          if (data.user.city) localStorage.setItem('aura_city', data.user.city);
          if (data.user.state) localStorage.setItem('aura_state', data.user.state);

          onSuccess(data.user);
          resetForm();
          onClose();
        } else {
          // Password Login
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: email.trim(),
              password
            })
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "Incorrect credentials. Try again.");
          }

          localStorage.setItem('aura_token', data.token);
          if (data.user.pincode) localStorage.setItem('aura_pincode', data.user.pincode);
          if (data.user.city) localStorage.setItem('aura_city', data.user.city);
          if (data.user.state) localStorage.setItem('aura_state', data.user.state);

          onSuccess(data.user);
          resetForm();
          onClose();
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div 
        id="auth-modal-panel"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] p-6 sm:p-8 my-auto border border-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-neutral-900 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-950 text-white shadow-md mb-3">
            <ShoppingBag className="h-5.5 w-5.5" />
          </div>
          <h2 className="font-sans font-extrabold text-xl text-neutral-900 tracking-tight">
            {isSignUp ? "Create your Aura Account" : "Welcome back to Aura"}
          </h2>
          <p className="text-xs text-neutral-400 mt-1.5">
            {isSignUp 
              ? "Register a free account to access exclusive deals, saved items, and express delivery." 
              : "Sign in via Email OTP or Security Password to access your account."
            }
          </p>
        </div>

        {/* Login Mode Switcher */}
        {!isSignUp && (
          <div className="flex bg-neutral-100 p-1 rounded-xl mb-5 border border-neutral-200/80">
            <button
              type="button"
              onClick={() => { setLoginMethod('password'); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                loginMethod === 'password'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Password Login</span>
            </button>
            <button
              type="button"
              onClick={() => { setLoginMethod('otp'); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                loginMethod === 'otp'
                  ? 'bg-white text-indigo-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Send className="h-3.5 w-3.5 text-indigo-600" />
              <span>Email OTP Login</span>
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 rounded-xl text-xs text-red-600 font-semibold flex items-center gap-1.5 border border-red-100 animate-fade-in">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name - Sign Up Only */}
          {isSignUp && (
            <div>
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">Your Full Name</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-4 w-4 text-neutral-400" />
                </div>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="E.g., Alex Morgan"
                  className="w-full text-xs p-2.5 pl-9 border border-neutral-200 rounded-lg bg-neutral-50 focus:bg-white focus:border-neutral-900 outline-none"
                />
              </div>
            </div>
          )}

          {/* Email Address */}
          <div>
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">Email Address</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-4 w-4 text-neutral-400" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full text-xs p-2.5 pl-9 border border-neutral-200 rounded-lg bg-neutral-50 focus:bg-white focus:border-neutral-900 outline-none"
              />
            </div>
          </div>

          {/* Password (for Sign Up OR Password Login mode) */}
          {(isSignUp || loginMethod === 'password') && (
            <div>
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">Security Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-neutral-400" />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full text-xs p-2.5 pl-9 border border-neutral-200 rounded-lg bg-neutral-50 focus:bg-white focus:border-neutral-900 outline-none"
                />
              </div>
            </div>
          )}

          {/* OTP Section (for Email OTP Login mode) */}
          {!isSignUp && loginMethod === 'otp' && (
            <div className="space-y-3 pt-1">
              {otpSent && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-2 text-xs text-indigo-950 font-semibold animate-fade-in">
                  <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>A 6-digit verification code has been sent to <strong>{email}</strong>. Please check your inbox.</span>
                </div>
              )}

              {otpSent ? (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                      6-Digit OTP Code
                    </label>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpSending}
                      className="text-[10px] font-bold text-indigo-600 hover:underline"
                    >
                      {otpSending ? "Resending..." : "Resend Code"}
                    </button>
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock className="h-4 w-4 text-indigo-600" />
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').substring(0, 6))}
                      placeholder="Enter 6-digit OTP"
                      className="w-full text-xs p-2.5 pl-9 border border-indigo-200 rounded-lg bg-indigo-50/20 focus:bg-white focus:border-indigo-600 outline-none font-mono tracking-widest font-bold text-neutral-900"
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpSending}
                  className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Send className="h-3.5 w-3.5 text-indigo-600" />
                  <span>{otpSending ? "Sending Verification Code..." : "Send Email OTP Code"}</span>
                </button>
              )}
            </div>
          )}

          {/* Indian Location Info (PIN Code, City, State) - Sign Up Only */}
          {isSignUp && (
            <div className="space-y-3 bg-neutral-50 p-3.5 rounded-xl border border-neutral-100 animate-fade-in">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block border-b border-neutral-100 pb-1.5 mb-2">
                🇮🇳 Indian Location Details
              </span>
              
              <div>
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">6-Digit PIN Code</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <MapPin className="h-4 w-4 text-neutral-400" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    placeholder="E.g., 110001"
                    className="w-full text-xs p-2.5 pl-9 border border-neutral-200 rounded-lg bg-white focus:border-neutral-900 outline-none font-mono"
                  />
                </div>
                {lookupMessage && (
                  <p className="text-[10px] text-indigo-600 font-semibold mt-1">
                    {lookupMessage}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">City / District</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="New Delhi"
                    className="w-full text-xs p-2.5 border border-neutral-200 rounded-lg bg-white focus:border-neutral-900 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Delhi"
                    className="w-full text-xs p-2.5 border border-neutral-200 rounded-lg bg-white focus:border-neutral-900 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || otpSending}
            className="w-full h-11 bg-neutral-950 text-white hover:bg-neutral-800 transition-colors rounded-xl text-xs font-bold shadow-md flex items-center justify-center select-none"
          >
            <span>
              {loading 
                ? "Authenticating Account..." 
                : isSignUp 
                  ? "Sign Up Free" 
                  : (loginMethod === 'otp' && !otpSent)
                    ? "Send OTP & Continue"
                    : "Log In Securely"
              }
            </span>
          </button>
        </form>

        <div className="mt-6 border-t border-neutral-100 pt-4 text-center">
          <p className="text-xs text-neutral-500">
            {isSignUp ? "Already have an account?" : "New to our shop?"}{" "}
            <button
              onClick={() => { 
                setIsSignUp(!isSignUp); 
                setError(null); 
                setOtpSent(false);
                setOtp('');
              }}
              className="font-bold text-indigo-600 hover:underline transition-colors"
            >
              {isSignUp ? "Sign In Instead" : "Register a Free Account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
