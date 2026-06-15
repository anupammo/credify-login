'use client';

import { useState, useEffect, useRef } from 'react';

const products = ['CRM', 'Form Builder', 'Credentialing', 'Billing', 'Engagement'];

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Cooldown after failed login (seconds)
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sign in state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Sign up state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [hearAbout, setHearAbout] = useState('');
  const [hearOther, setHearOther] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isOtherVisible, setIsOtherVisible] = useState(false);

  // Password rules
  const [passwordRules, setPasswordRules] = useState({
    len: false, upper: false, lower: false, num: false, special: false,
  });
  const [showRules, setShowRules] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Rotating word animation
  const [cycleIndex, setCycleIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownSeconds <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldownSeconds]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCycleIndex((prev) => (prev + 1) % products.length);
        setIsAnimating(false);
      }, 430);
    }, 2600);
    return () => clearInterval(interval);
  }, []);

  // Check existing session – redirect to external login page if already logged in
  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.user) {
          window.location.href = 'https://forms.credifyfast.com';
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Live password validation
  useEffect(() => {
    setPasswordRules({
      len: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      num: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    });
  }, [password]);

  useEffect(() => {
    setPasswordMatch(password === confirmPassword || confirmPassword === '');
  }, [password, confirmPassword]);

  useEffect(() => {
    setIsOtherVisible(hearAbout === 'other');
  }, [hearAbout]);

  const clearMessages = () => { setError(''); setSuccess(''); };

  const startCooldown = () => {
    setCooldownSeconds(30);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownSeconds > 0) {
      setError(`Please wait ${cooldownSeconds} seconds before trying again.`);
      return;
    }
    clearMessages();
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signInEmail, password: signInPassword, remember: rememberMe }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Redirect to external login page after successful sign-in
      window.location.href = 'https://forms.credifyfast.com';
    } catch (err: any) {
      setError(err.message);
      startCooldown();  // Start 30-second cooldown on failure
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!firstName.trim()) return setError('First name required');
    if (!lastName.trim()) return setError('Last name required');
    if (!signUpEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signUpEmail)) return setError('Valid email required');
    if (!passwordRules.len || !passwordRules.upper || !passwordRules.lower || !passwordRules.num || !passwordRules.special) {
      setShowRules(true);
      return setError('Password does not meet requirements');
    }
    if (password !== confirmPassword) return setError('Passwords do not match');
    if (!company.trim()) return setError('Company name required');
    if (phone.replace(/\D/g, '').length < 10) return setError('Valid phone number required');
    if (!hearAbout) return setError('Please tell how you heard about us');
    if (hearAbout === 'other' && !hearOther.trim()) return setError('Please tell us how you heard');
    if (!termsAccepted) return setError('You must accept the Terms and Privacy Policy');

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName, lastName, email: signUpEmail, password, company, phone,
          source: hearAbout, sourceLabel: hearAbout === 'other' ? hearOther : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMode('signin');
      setSignInEmail(signUpEmail);
      setSignInPassword('');
      setSuccess('Account created — sign in to continue.');
      // Reset signup form
      setFirstName(''); setLastName(''); setSignUpEmail(''); setPassword(''); setConfirmPassword('');
      setCompany(''); setPhone(''); setHearAbout(''); setHearOther(''); setTermsAccepted(false); setShowRules(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForgotSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSSO = (provider: string) => {
    setError(`${provider} sign-in isn't available yet — please use email and password.`);
  };

  const ForgotModal = () => (
    <div className={`overlay ${isForgotOpen ? 'open' : ''}`} onClick={(e) => e.target === e.currentTarget && setIsForgotOpen(false)}>
      <div className="modal">
        <button className="modal-close" onClick={() => setIsForgotOpen(false)}>✕</button>
        {!forgotSent ? (
          <div className="ask">
            <div className="ico">🔐</div>
            <h2>Reset your password</h2>
            <p>Enter the email tied to your Credify account and we'll send a reset link.</p>
            <form onSubmit={handleForgot}>
              <div className="field">
                <label htmlFor="fp-email">Work email<span className="req-star">*</span></label>
                <input type="email" id="fp-email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary" disabled={isLoading}>{isLoading ? 'Sending...' : 'Send reset link'}</button>
            </form>
            <button className="link back" onClick={() => setIsForgotOpen(false)}>Back to sign in</button>
          </div>
        ) : (
          <div className="sent">
            <div className="sent-badge">✓</div>
            <h2>Check your inbox</h2>
            <p>If an account exists for that address, a reset link is on its way.</p>
            <button className="btn-primary" onClick={() => setIsForgotOpen(false)}>Back to sign in</button>
          </div>
        )}
      </div>
    </div>
  );

  const isSignInDisabled = isLoading || cooldownSeconds > 0;

  return (
    <>
      <div className="shell">
        <aside className="brand">
          <div className="brand-top">
            <div className="logo-lockup">
              <span className="logo-ring">⦿</span>
              <span className="logo-word">Credify</span>
            </div>
          </div>
          <div className="brand-hero">
            <span className="kicker">Run your practice on</span>
            <h2 className="hero-word">
              <span className="cycle-wrap">
                <span className="cycle" style={{ transition: isAnimating ? 'transform .42s ease, opacity .42s ease' : 'none', transform: isAnimating ? 'translateY(-110%)' : 'translateY(0)', opacity: isAnimating ? 0 : 1 }}>
                  {products[cycleIndex]}
                </span>
              </span>
            </h2>
            <span className="hero-rule"></span>
            <p className="hero-sub">One secure login for the entire Credify suite.</p>
            <ul className="hero-list">
              <li>Revenue cycle &amp; billing, end to end</li>
              <li>Credentialing without the busywork</li>
              <li>Intake forms &amp; client engagement</li>
              <li>A CRM built for behavioral health</li>
            </ul>
          </div>
          <div className="brand-foot">
            <span className="tagline">Behavioral Health Growth Engine</span>
            <span className="trust">🛡️ HIPAA-aligned · encrypted in transit and at rest</span>
          </div>
        </aside>

        <main className="panel">
          <div className="card">
            <div className="mobile-brand"><span className="mark">C</span> Credify</div>
            <div className="tabs">
              <button className={`tab ${mode === 'signin' ? 'active' : ''}`} onClick={() => { setMode('signin'); clearMessages(); }}>Sign in</button>
              <button className={`tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => { setMode('signup'); clearMessages(); }}>Create account</button>
            </div>
            {error && <div className="err show">{error}</div>}
            {success && <div className="ok-note show">{success}</div>}

            {mode === 'signin' && (
              <section>
                <span className="eyebrow">Secure sign-in</span>
                <h1>Welcome back</h1>
                <div className="sso">
                  <button className="sso-btn" onClick={() => handleSSO('Google')}>🔐 Continue with Google</button>
                  <button className="sso-btn" onClick={() => handleSSO('Microsoft')}>💼 Continue with Microsoft</button>
                </div>
                <div className="divider">or use email</div>
                <form onSubmit={handleSignIn}>
                  <div className="field">
                    <label>Work email<span className="req-star">*</span></label>
                    <input
                      type="email"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      disabled={cooldownSeconds > 0}
                      required
                    />
                  </div>
                  <div className="field has-toggle">
                    <label>Password<span className="req-star">*</span></label>
                    <div className="input-wrap">
                      <input
                        type={showSignInPassword ? 'text' : 'password'}
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        disabled={cooldownSeconds > 0}
                        required
                      />
                      <button type="button" className="toggle-pw" onClick={() => setShowSignInPassword(!showSignInPassword)}>👁️</button>
                    </div>
                  </div>
                  <div className="row">
                    <label className="check">
                      <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} disabled={cooldownSeconds > 0} />
                      <span className="box">✓</span>
                      Keep me signed in
                    </label>
                    <button type="button" className="link" onClick={() => setIsForgotOpen(true)}>Forgot password?</button>
                  </div>
                  <button type="submit" className="btn-primary" disabled={isSignInDisabled}>
                    {cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : (isLoading ? 'Working...' : 'Sign in')}
                  </button>
                  {cooldownSeconds > 0 && (
                    <p className="field-hint" style={{ textAlign: 'center', marginTop: '12px', color: 'var(--problem)' }}>
                      Too many attempts. Please wait {cooldownSeconds} seconds.
                    </p>
                  )}
                </form>
              </section>
            )}

            {mode === 'signup' && (
              <section>
                <span className="eyebrow">Create your account</span>
                <h1>Get started</h1>
                <div className="sso">
                  <button className="sso-btn" onClick={() => handleSSO('Google')}>🔐 Sign up with Google</button>
                  <button className="sso-btn" onClick={() => handleSSO('Microsoft')}>💼 Sign up with Microsoft</button>
                </div>
                <div className="divider">or use email</div>
                <form onSubmit={handleSignUp}>
                  <div className="grid-2">
                    <div className="field"><label>First name*</label><input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
                    <div className="field"><label>Last name*</label><input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
                  </div>
                  <div className="field"><label>Work email*</label><input type="email" value={signUpEmail} onChange={(e) => setSignUpEmail(e.target.value)} /></div>
                  <div className="field has-toggle">
                    <label>Password*</label>
                    <div className="input-wrap">
                      <input type={showPassword ? 'text' : 'password'} value={password} onFocus={() => setShowRules(true)} onChange={(e) => setPassword(e.target.value)} />
                      <button type="button" className="toggle-pw" onClick={() => setShowPassword(!showPassword)}>👁️</button>
                    </div>
                  </div>
                  <div className={`pw-reqs ${showRules ? 'show' : ''}`}>
                    <div className={`req ${passwordRules.len ? 'met' : ''}`}><span className="tick">✓</span>8+ characters</div>
                    <div className={`req ${passwordRules.upper ? 'met' : ''}`}><span className="tick">✓</span>Uppercase</div>
                    <div className={`req ${passwordRules.lower ? 'met' : ''}`}><span className="tick">✓</span>Lowercase</div>
                    <div className={`req ${passwordRules.num ? 'met' : ''}`}><span className="tick">✓</span>Number</div>
                    <div className={`req ${passwordRules.special ? 'met' : ''}`}><span className="tick">✓</span>Special char</div>
                  </div>
                  <div className="field has-toggle">
                    <label>Confirm password*</label>
                    <div className="input-wrap">
                      <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                      <button type="button" className="toggle-pw" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>👁️</button>
                    </div>
                    {confirmPassword && <p className={`field-hint ${!passwordMatch ? 'bad' : ''}`}>{passwordMatch ? 'Passwords match.' : 'Passwords do not match.'}</p>}
                  </div>
                  <div className="field"><label>Company / practice name*</label><input value={company} onChange={(e) => setCompany(e.target.value)} /></div>
                  <div className="field"><label>Phone*</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                  <div className="field">
                    <label>How did you hear about us?*</label>
                    <select className="cf-native" value={hearAbout} onChange={(e) => setHearAbout(e.target.value)}>
                      <option value="">Select an option</option>
                      <option value="search">Google or web search</option>
                      <option value="referral">Referral from a colleague</option>
                      <option value="social">Social media</option>
                      <option value="conference">Conference or event</option>
                      <option value="webinar">Webinar or podcast</option>
                      <option value="customer">Existing Credify customer</option>
                      <option value="reseller">Partner or reseller</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  {isOtherVisible && (
                    <div className="field"><label>Tell us how*</label><input value={hearOther} onChange={(e) => setHearOther(e.target.value)} /></div>
                  )}
                  <label className="check">
                    <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
                    <span className="box">✓</span>
                    I agree to the <a href="https://www.credifyfast.com/disclaimer" target="_blank" className="link">Terms of Service</a> and <a href="https://www.credifyfast.com/privacy-policy" target="_blank" className="link">Privacy Policy</a>.
                  </label>
                  <button type="submit" className="btn-primary" disabled={isLoading}>{isLoading ? 'Creating...' : 'Create account'}</button>
                </form>
              </section>
            )}
          </div>
        </main>
      </div>
      <ForgotModal />
    </>
  );
}