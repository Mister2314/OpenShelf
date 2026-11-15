import React, { useState } from 'react';
import { database } from '../../lib/supabase';
import { useReading } from '../../context/ReadingContext';
import { X, Check, ArrowRight, Sparkles, Shield, Mail } from 'lucide-react';
import { userError } from '../../lib/user-error';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login } = useReading();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e:React.FormEvent) => {
    e.preventDefault();setBusy(true);setError('');setNotice('');
    try {
      const db=database();
      if(useMagicLink) {
        const {error}=await db.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin,shouldCreateUser:authMode==='signup'}});
        if(error) throw error; setMagicLinkSent(true);
      } else if(authMode==='signup') {
        const {data,error}=await db.auth.signUp({email,password,options:{data:{display_name:name},emailRedirectTo:window.location.origin}});
        if(error) throw error;
        if(!data.session) setNotice('Check your email to confirm your account.');
      } else await login(email,password);
    } catch(error) {setError(userError(error,'We couldn’t complete sign in. Please try again.'));}
    finally {setBusy(false);}
  };
  const googleLogin=async()=> {
    try {const {error}=await database().auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}});if(error) throw error;}
    catch(error) {setError(userError(error,'Google sign in couldn’t start. Please try again.'));}
  };
  return (
    <div 
      className="auth-overlay"
      onClick={closeAuthModal}
    >
      <div 
        className="auth-panel relative w-full max-w-4xl bg-[var(--color-surface)] rounded-3xl shadow-2xl border border-[var(--color-border)] overflow-hidden flex flex-col md:flex-row max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label={authMode === 'signin' ? 'Sign in to OpenShelf' : 'Create an OpenShelf account'}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { closeAuthModal(); return; }
          if (event.key !== 'Tab') return;
          const focusable = event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]');
          if (!focusable.length) return;
          const first = focusable[0], last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }}
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          aria-label="Close sign-in dialog"
          autoFocus
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-[var(--color-surface-warm)] hover:bg-[var(--color-surface-container)] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-ink)] transition-colors shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Column: Sanctuary Editorial Introduction */}
        <div className="md:w-5/12 bg-[var(--color-surface-warm)] p-8 sm:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[var(--color-border)]">
          <div className="space-y-6">
            {/* Signature book arch window illustration */}
            <div className="w-16 h-20 rounded-t-full rounded-b-md bg-[var(--color-canvas)] border border-[var(--color-border)] flex flex-col items-center justify-center relative overflow-hidden shadow-sm">
              <div className="w-6 h-6 rounded-full bg-[#FBE1D2] mb-1"></div>
              <div className="w-3.5 h-7 rounded-sm bg-[#3559B5] shadow-xs"></div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-primary font-ui">
                Welcome to OpenShelf
              </span>
              <h2 className="font-reading text-2xl sm:text-3xl text-[var(--color-ink)] font-normal leading-tight">
                A quiet harbor for your reading life.
              </h2>
              <p className="font-ui text-sm text-[var(--color-text-secondary)] leading-relaxed pt-1">
                Keep your books, reading progress, and notes together. Open a story when you have a quiet moment, then pick up where you left off.
              </p>
            </div>

            {/* Sanctuary Assurances */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Access your account across devices.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Private data uses account-based access.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Personal reading settings and notes.
                </span>
              </div>
            </div>
          </div>

          <div className="pt-8 text-[11px] text-[var(--color-text-tertiary)] flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span>Open standard • Account-based access</span>
          </div>
        </div>

        {/* Right Column: Tactile Authentication Form */}
        <div className="md:w-7/12 p-8 sm:p-10 flex flex-col justify-between">
          <div>
            {/* Segmented Pill Tab Switcher */}
            <div className="flex items-center gap-1.5 bg-[var(--color-surface-warm)] p-1 rounded-full w-fit mb-6">
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className={`px-5 py-2 rounded-full text-xs font-semibold transition-all ${
                  authMode === 'signin'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-ink)]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`px-5 py-2 rounded-full text-xs font-semibold transition-all ${
                  authMode === 'signup'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-ink)]'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Social Authentication: Google */}
            <button
              type="button"
              onClick={googleLogin}
              className="w-full h-12 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-warm)] text-[var(--color-ink)] text-sm font-semibold flex items-center justify-center gap-3 transition-colors shadow-sm active:scale-[0.99]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Separator */}
            <div className="relative my-6 flex items-center justify-center">
              <div className="w-full border-t border-[var(--color-border)]"></div>
              <span className="absolute px-3 bg-[var(--color-surface)] text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium">
                or with email
              </span>
            </div>

            {error && <p role="alert" className="app-inline-alert">{error}</p>}{notice && <p role="status" className="py-3">{notice}</p>}
            {/* Form */}
            {magicLinkSent ? (
              <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                <Sparkles className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-semibold text-emerald-900 dark:text-emerald-200 text-sm">
                  Magic link on its way!
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  We sent a quiet sign-in link to <strong className="font-medium">{email || 'your email'}</strong>. Open the link in your inbox to sign in.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1.5">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Elena Vance"
                      className="w-full h-12 px-4 rounded-xl bg-[var(--color-surface-warm)] border border-[var(--color-border)] text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-primary focus:bg-[var(--color-surface)] transition-all"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="elena@solitude.org"
                    className="w-full h-12 px-4 rounded-xl bg-[var(--color-surface-warm)] border border-[var(--color-border)] text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-primary focus:bg-[var(--color-surface)] transition-all"
                  />
                </div>

                {!useMagicLink && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-[var(--color-ink)]">
                        Password
                      </label>
                      <span className="text-xs text-[var(--color-text-secondary)]">Use a magic link if you forgot your password.</span>
                    </div>
                    <input
                      type="password" required minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full h-12 px-4 rounded-xl bg-[var(--color-surface-warm)] border border-[var(--color-border)] text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-primary focus:bg-[var(--color-surface)] transition-all"
                    />
                  </div>
                )}

                {/* Passwordless Magic Link Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setUseMagicLink(!useMagicLink)}
                    className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{useMagicLink ? 'Use standard password instead' : 'Email me a passwordless Magic Link'}</span>
                  </button>
                </div>

                {/* Primary Button */}
                <button
                  type="submit" disabled={busy}
                  className="w-full h-12 rounded-full bg-primary hover:bg-[#294899] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:translate-y-0.5 mt-2"
                >
                  <span>{authMode === 'signin' ? 'Sign in to your library' : 'Create reading sanctuary'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>

          {/* Privacy Sanctuary Reassurance Note */}
          <p className="text-[11px] text-[var(--color-text-tertiary)] text-center pt-6 leading-relaxed">
            By entering OpenShelf, you choose an ad-free, quiet reading space. We never sell reading habits or distribute reader annotations.
          </p>
        </div>
      </div>
    </div>
  );
};
