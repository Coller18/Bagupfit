import { useEffect, useState } from 'react'
import brandLogo from './logo-white.png'
import { supabase } from './supabase.js'
import './App.css'

const requestedNext = new URLSearchParams(window.location.search).get('next')
const nextPath = ['/booking', '/my-bookings'].includes(requestedNext) ? requestedNext : '/booking'
//commenting only
export default function AccountPage() {
  const [authMode, setAuthMode] = useState(() => new URLSearchParams(window.location.search).get('mode') === 'login' ? 'signin' : 'signup')
  const [authForm, setAuthForm] = useState({ full_name: '', phone: '', email: '', password: '' })
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [authError, setAuthError] = useState('')

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
    if (!authLoading && session) window.location.replace(nextPath)
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
        const { data, error } = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password,
          options: {
            data: {
              full_name: authForm.full_name.trim(),
              phone: authForm.phone.trim(),
              privacy_policy_version: '2026-11-13',
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
          <div className="auth-tabs" role="tablist" aria-label="Account options">
            <button aria-selected={authMode === 'signup'} className={authMode === 'signup' ? 'auth-tab auth-tab-active' : 'auth-tab'} onClick={() => switchMode('signup')} role="tab" type="button">Create account</button>
            <button aria-selected={authMode === 'signin'} className={authMode === 'signin' ? 'auth-tab auth-tab-active' : 'auth-tab'} onClick={() => switchMode('signin')} role="tab" type="button">Sign in</button>
          </div>
          {authLoading && <p className="info-panel">Checking your account...</p>}
          {!authLoading && !session && <>
            {authError && <p className="form-message form-message-error" role="alert">{authError}</p>}
            {authMessage && <p className="form-message form-message-success" role="status">{authMessage}</p>}
            <form className="customer-auth-form" onSubmit={submitAuth}>
              {authMode === 'signup' && <>
                <label>Full name<input autoComplete="name" maxLength="150" required value={authForm.full_name} onChange={(event) => setAuthForm({ ...authForm, full_name: event.target.value })} /></label>
                <label>Phone number<input autoComplete="tel" required type="tel" value={authForm.phone} onChange={(event) => setAuthForm({ ...authForm, phone: event.target.value })} /></label>
              </>}
              <label>Email<input autoComplete="email" required type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} /></label>
              <label>Password<input autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} minLength="8" required type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} /></label>
              {authMode === 'signup' && <label className="privacy-consent"><input checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} required type="checkbox" /><span>I have read the <a href="/privacy" rel="noreferrer" target="_blank">Privacy Policy</a> and consent to the use of my information for account and booking services.</span></label>}
              <button className="primary-link submit-button" disabled={submitting} type="submit">{submitting ? 'Please wait...' : authMode === 'signup' ? 'Create account' : 'Sign in'} <span aria-hidden="true">&#8594;</span></button>
            </form>
            {authMode === 'signup' && <p className="privacy-note">We will email you a link to verify your address.</p>}
          </>}
        </div>
        <div className="account-auth-links"><a href="/">&#8592; Back to Gupfit</a><a href="/privacy">Privacy policy</a></div>
      </section>
    </main>
  )
}
