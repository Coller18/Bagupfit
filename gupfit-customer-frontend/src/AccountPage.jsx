import { useEffect, useState } from 'react'
import brandLogo from './logo-white.png'
import { supabase } from './supabase.js'
import './App.css'

const requestedNext = new URLSearchParams(window.location.search).get('next')
const nextPath = ['/booking', '/my-bookings', '/account-settings'].includes(requestedNext) ? requestedNext : '/booking'
const GOOGLE_PROFILE_DRAFT_KEY = 'gupfit-google-profile-draft'
const PRIVACY_POLICY_VERSION = '2026-11-13'

function normalizePhilippinePhone(value) {
  const compact = String(value || '').trim().replace(/[\s()-]/g, '')
  if (/^09\d{9}$/.test(compact)) return `+63${compact.slice(1)}`
  if (/^639\d{9}$/.test(compact)) return `+${compact}`
  if (/^\+639\d{9}$/.test(compact)) return compact
  return ''
}

export default function AccountPage() {
  const [authMode, setAuthMode] = useState(() => new URLSearchParams(window.location.search).get('mode') === 'login' ? 'signin' : 'signup')
  const [authForm, setAuthForm] = useState({ full_name: '', phone: '', email: '', password: '' })
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [authError, setAuthError] = useState('')
  const [profileRequired, setProfileRequired] = useState(false)
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '' })
  const [profileRequiresConsent, setProfileRequiresConsent] = useState(false)
  const [profilePrivacyAccepted, setProfilePrivacyAccepted] = useState(false)
  const [profileConsentTimestamp, setProfileConsentTimestamp] = useState('')

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      return undefined
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (authLoading || !session) return

    let draft = null
    try {
      draft = JSON.parse(sessionStorage.getItem(GOOGLE_PROFILE_DRAFT_KEY) || 'null')
    } catch {
      sessionStorage.removeItem(GOOGLE_PROFILE_DRAFT_KEY)
    }
    const metadata = session.user.user_metadata || {}
    const fullName = String(draft?.full_name || metadata.full_name || '').trim()
    const phone = normalizePhilippinePhone(draft?.phone || metadata.phone)
    const hasConsent = Boolean(draft?.privacy_policy_accepted_at || metadata.privacy_policy_accepted_at)
    if (!fullName || !phone || !hasConsent) {
      setProfileForm({ full_name: draft?.full_name || metadata.full_name || '', phone: draft?.phone || metadata.phone || '' })
      const alreadyConsented = Boolean(draft?.privacy_policy_accepted_at || metadata.privacy_policy_accepted_at)
      setProfileRequiresConsent(!alreadyConsented)
      setProfilePrivacyAccepted(alreadyConsented)
      setProfileConsentTimestamp(draft?.privacy_policy_accepted_at || metadata.privacy_policy_accepted_at || '')
      setProfileRequired(true)
      return
    }
    if (draft?.privacy_policy_accepted_at && !metadata.privacy_policy_accepted_at) {
      setProfileForm({ full_name: fullName, phone })
      setProfileRequiresConsent(false)
      setProfilePrivacyAccepted(true)
      setProfileConsentTimestamp(draft.privacy_policy_accepted_at)
      setProfileRequired(true)
      return
    }
    sessionStorage.removeItem(GOOGLE_PROFILE_DRAFT_KEY)
    window.location.replace(nextPath)
  }, [authLoading, session])

  async function submitAuth(event) {
    event.preventDefault()
    setAuthError('')
    setAuthMessage('')
    if (!supabase) {
      setAuthError('Customer sign-in is not configured. Add the Supabase URL and publishable key to .env.local.')
      return
    }
    if (submitting) return

    setSubmitting(true)
    try {
      if (authMode === 'signup') {
        if (!privacyAccepted) {
          setAuthError('Please accept the Privacy Policy to create an account.')
          return
        }
        const phone = normalizePhilippinePhone(authForm.phone)
        if (!phone) {
          setAuthError('Enter a valid Philippine mobile number, such as 09171234567 or +639171234567.')
          return
        }
        const { data, error } = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password,
          options: {
            data: {
              full_name: authForm.full_name.trim(),
              phone,
              privacy_policy_version: PRIVACY_POLICY_VERSION,
              privacy_policy_accepted_at: new Date().toISOString(),
            },
            emailRedirectTo: `${window.location.origin}/booking`,
          },
        })
        if (error) setAuthError(error.message)
        else if (data.session) setSession(data.session)
        else {
          setAuthMessage('Account created. Check your email and confirm your address, then sign in to continue.')
          setAuthMode('signin')
        }
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email: authForm.email, password: authForm.password })
      if (error) setAuthError(error.message)
      else setSession(data.session)
    } finally {
      setSubmitting(false)
    }
  }

  async function signInWithGoogle() {
    setAuthError('')
    setAuthMessage('')
    if (!supabase) {
      setAuthError('Customer sign-in is not configured. Add the Supabase URL and publishable key to .env.local.')
      return
    }
    if (authMode === 'signup' && !privacyAccepted) {
      setAuthError('Please accept the Privacy Policy to create an account.')
      return
    }
    let profileDraft = null
    if (authMode === 'signup') {
      const phone = normalizePhilippinePhone(authForm.phone)
      if (!authForm.full_name.trim()) {
        setAuthError('Enter your full name to create your Gupfit account.')
        return
      }
      if (!phone) {
        setAuthError('Enter a valid Philippine mobile number, such as 09171234567 or +639171234567.')
        return
      }
      profileDraft = {
        full_name: authForm.full_name.trim(),
        phone,
        privacy_policy_version: PRIVACY_POLICY_VERSION,
        privacy_policy_accepted_at: new Date().toISOString(),
      }
    }
    if (submitting) return

    setSubmitting(true)
    try {
      if (profileDraft) sessionStorage.setItem(GOOGLE_PROFILE_DRAFT_KEY, JSON.stringify(profileDraft))
      const redirectTo = new URL(`/account?mode=login&next=${encodeURIComponent(nextPath)}`, window.location.origin).toString()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, queryParams: { prompt: 'select_account' } },
      })
      if (error) {
        sessionStorage.removeItem(GOOGLE_PROFILE_DRAFT_KEY)
        setAuthError(error.message)
      }
    } catch (error) {
      sessionStorage.removeItem(GOOGLE_PROFILE_DRAFT_KEY)
      setAuthError(error.message || 'Could not start Google sign-in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function saveRequiredProfile(event) {
    event.preventDefault()
    setAuthError('')
    const fullName = profileForm.full_name.trim()
    const phone = normalizePhilippinePhone(profileForm.phone)
    if (!fullName) {
      setAuthError('Enter your full name to continue.')
      return
    }
    if (!phone) {
      setAuthError('Enter a valid Philippine mobile number, such as 09171234567 or +639171234567.')
      return
    }
    if (profileRequiresConsent && !profilePrivacyAccepted) {
      setAuthError('Please accept the Privacy Policy to create your account.')
      return
    }

    setSubmitting(true)
    try {
      const userMetadata = { full_name: fullName, phone }
      if (profileRequiresConsent) {
        userMetadata.privacy_policy_version = PRIVACY_POLICY_VERSION
        userMetadata.privacy_policy_accepted_at = new Date().toISOString()
      } else if (profileConsentTimestamp && !session.user.user_metadata.privacy_policy_accepted_at) {
        userMetadata.privacy_policy_version = PRIVACY_POLICY_VERSION
        userMetadata.privacy_policy_accepted_at = profileConsentTimestamp
      }
      const { error } = await supabase.auth.updateUser({ data: userMetadata })
      if (error) throw error
      const { data, error: refreshError } = await supabase.auth.refreshSession()
      if (refreshError) throw refreshError
      sessionStorage.removeItem(GOOGLE_PROFILE_DRAFT_KEY)
      setSession(data.session)
      window.location.replace(nextPath)
    } catch (error) {
      setAuthError(error.message || 'Could not save your profile. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function signOutFromProfile() {
    await supabase?.auth.signOut()
    setProfileRequired(false)
    setSession(null)
  }

  function switchMode(mode) {
    setAuthMode(mode)
    setPrivacyAccepted(false)
    setAuthError('')
    setAuthMessage('')
  }

  return (
    <main className={`account-page account-page-standalone account-page-${authMode}`}>
      <section className="account-auth-shell" aria-label="Customer account">
        <a className="account-auth-brand" href="/" aria-label="Gupfit home"><img src={brandLogo} alt="Gupfit" /></a>
        <div className="booking-form account-form account-form-standalone">
          <div className="account-form-heading"><p className="eyebrow">{authMode === 'signup' ? 'JOIN GUPFIT' : 'CUSTOMER LOGIN'}</p><h1>{authMode === 'signup' ? 'Create account' : 'Welcome back'}</h1><p>{authMode === 'signup' ? 'Create an account to book your appointment.' : 'Sign in to continue to your appointment.'}</p></div>
          {!session && <div className="auth-tabs" role="tablist" aria-label="Account options">
            <button aria-selected={authMode === 'signup'} className={authMode === 'signup' ? 'auth-tab auth-tab-active' : 'auth-tab'} onClick={() => switchMode('signup')} role="tab" type="button">Create account</button>
            <button aria-selected={authMode === 'signin'} className={authMode === 'signin' ? 'auth-tab auth-tab-active' : 'auth-tab'} onClick={() => switchMode('signin')} role="tab" type="button">Sign in</button>
          </div>}
          {authLoading && <p className="info-panel">Checking your account...</p>}
          {!authLoading && session && profileRequired && <section className="account-profile-completion" aria-labelledby="profile-completion-title">
            <div className="account-form-heading"><p className="eyebrow">ONE LAST STEP</p><h1 id="profile-completion-title">Complete your profile</h1><p>Add your name and Philippine mobile number so the shop can manage your bookings.</p></div>
            {authError && <p className="form-message form-message-error" role="alert">{authError}</p>}
            <form className="customer-auth-form" onSubmit={saveRequiredProfile}>
              <label>Full name<input autoComplete="name" maxLength="150" required value={profileForm.full_name} onChange={(event) => setProfileForm({ ...profileForm, full_name: event.target.value })} /></label>
              <label>Philippine mobile number<input autoComplete="tel" inputMode="tel" placeholder="09XXXXXXXXX or +639XXXXXXXXX" required type="tel" value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} /><small>Enter a Philippine mobile number starting with 09 or +639.</small></label>
              {profileRequiresConsent && <label className="privacy-consent"><input checked={profilePrivacyAccepted} onChange={(event) => setProfilePrivacyAccepted(event.target.checked)} required type="checkbox" /><span>I have read the <a href="/privacy" rel="noreferrer" target="_blank">Privacy Policy</a> and consent to the use of my information for account and booking services.</span></label>}
              <button className="primary-link submit-button" disabled={submitting} type="submit">{submitting ? 'Saving profile...' : 'Save and continue'} <span aria-hidden="true">&#8594;</span></button>
            </form>
            <button className="wizard-back" disabled={submitting} onClick={signOutFromProfile} type="button">Sign out and use a different account</button>
          </section>}
          {!authLoading && !session && <>
            {authError && <p className="form-message form-message-error" role="alert">{authError}</p>}
            {authMessage && <p className="form-message form-message-success" role="status">{authMessage}</p>}
            <form className="customer-auth-form" onSubmit={submitAuth}>
              {authMode === 'signup' && <>
                <label>Full name<input autoComplete="name" maxLength="150" required value={authForm.full_name} onChange={(event) => setAuthForm({ ...authForm, full_name: event.target.value })} /></label>
                <label>Philippine mobile number<input autoComplete="tel" inputMode="tel" placeholder="09XXXXXXXXX or +639XXXXXXXXX" required type="tel" value={authForm.phone} onChange={(event) => setAuthForm({ ...authForm, phone: event.target.value })} /><small>Enter a Philippine mobile number starting with 09 or +639.</small></label>
              </>}
              <label>Email<input autoComplete="email" required type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} /></label>
              <label>Password<input autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} minLength="8" required type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} /></label>
              {authMode === 'signup' && <label className="privacy-consent"><input checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} required type="checkbox" /><span>I have read the <a href="/privacy" rel="noreferrer" target="_blank">Privacy Policy</a> and consent to the use of my information for account and booking services.</span></label>}
              <button className="primary-link submit-button" disabled={submitting} type="submit">{submitting ? 'Please wait...' : authMode === 'signup' ? 'Create account' : 'Sign in'} <span aria-hidden="true">&#8594;</span></button>
            </form>
            {authMode === 'signup' && <p className="privacy-note">Email sign-up sends a verification link. Google accounts are verified during sign-in.</p>}
            <div className="social-auth-divider"><span>or continue with</span></div>
            <button className="google-auth-button" disabled={submitting} onClick={signInWithGoogle} type="button">
              <svg aria-hidden="true" viewBox="0 0 48 48" focusable="false"><path fill="#4285F4" d="M43.6 24.5c0-1.5-.1-3-.4-4.4H24v8.3h11a9.5 9.5 0 0 1-4.1 6.2v5.2h6.7c3.9-3.6 6-8.9 6-15.3Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.2c-1.8 1.2-4.1 2-6.8 2-5.2 0-9.6-3.5-11.2-8.1H5.9v5.4C9.3 39.7 16 44 24 44Z"/><path fill="#FBBC05" d="M12.8 27.8a12 12 0 0 1 0-7.6v-5.4H5.9a20 20 0 0 0 0 18.4l6.9-5.4Z"/><path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 6 29.5 4 24 4 16 4 9.3 8.3 5.9 14.8l6.9 5.4c1.6-4.6 6-8.1 11.2-8.1Z"/></svg>
              <span>{submitting ? 'Connecting...' : 'Continue with Google'}</span>
            </button>
          </>}
        </div>
        <div className="account-auth-links"><a href="/">&#8592; Back to Gupfit</a><a href="/privacy">Privacy policy</a></div>
      </section>
    </main>
  )
}
