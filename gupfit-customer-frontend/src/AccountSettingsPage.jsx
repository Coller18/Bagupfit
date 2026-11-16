import { useEffect, useState } from 'react'
import brandLogo from './logo-white.png'
import { supabase } from './supabase.js'
import SiteFooter from './SiteFooter.jsx'
import './App.css'

function normalizePhilippinePhone(value) {
  const compact = String(value || '').trim().replace(/[\s()-]/g, '')
  if (/^09\d{9}$/.test(compact)) return `+63${compact.slice(1)}`
  if (/^639\d{9}$/.test(compact)) return `+${compact}`
  if (/^\+639\d{9}$/.test(compact)) return compact
  return ''
}

export default function AccountSettingsPage() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({ full_name: '', phone: '' })

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
    if (!authLoading && !session) {
      window.location.replace('/account?mode=login&next=%2Faccount-settings')
      return
    }
    if (session) {
      const metadata = session.user.user_metadata || {}
      setForm({ full_name: metadata.full_name || '', phone: metadata.phone || '' })
    }
  }, [authLoading, session])

  async function saveProfile(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    const fullName = form.full_name.trim()
    const phone = normalizePhilippinePhone(form.phone)
    if (!fullName) {
      setError('Enter your full name.')
      return
    }
    if (!phone) {
      setError('Enter a valid Philippine mobile number, such as 09171234567 or +639171234567.')
      return
    }

    setSaving(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ data: { full_name: fullName, phone } })
      if (updateError) throw updateError
      const { data, error: refreshError } = await supabase.auth.refreshSession()
      if (refreshError) throw refreshError
      setSession(data.session)
      setForm({ full_name: fullName, phone })
      setNotice('Your account details have been saved.')
    } catch (saveError) {
      setError(saveError.message || 'Could not save your account details. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function signOut() {
    await supabase?.auth.signOut()
    window.location.replace('/')
  }

  return (
    <main className="booking-page account-settings-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Gupfit home"><img className="site-logo" src={brandLogo} alt="Gupfit" /></a>
        <nav className="site-nav" aria-label="Main navigation"><a href="/my-bookings">My bookings</a><a className="nav-cta" href="/booking">Book a time</a></nav>
      </header>
      <section className="booking-page-heading">
        <a className="back-link" href="/my-bookings">&#8592; Back to my bookings</a>
        <p className="eyebrow">YOUR GUPFIT ACCOUNT</p>
        <h1>Account settings.</h1>
        <p>Manage the details used for your bookings.</p>
      </section>
      <section className="account-settings-content" aria-labelledby="account-settings-title">
        {authLoading ? <p className="info-panel">Checking your account...</p> : session && <div className="booking-form account-form account-form-standalone account-settings-form">
          <div className="account-form-heading"><p className="eyebrow">PROFILE DETAILS</p><h2 id="account-settings-title">Your account</h2><p>{session.user.email}</p></div>
          {error && <p className="form-message form-message-error" role="alert">{error}</p>}
          {notice && <p className="form-message form-message-success" role="status">{notice}</p>}
          <form className="customer-auth-form" onSubmit={saveProfile}>
            <label>Full name<input autoComplete="name" maxLength="150" required value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></label>
            <label>Philippine mobile number<input autoComplete="tel" inputMode="tel" placeholder="09XXXXXXXXX or +639XXXXXXXXX" required type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /><small>Enter a Philippine mobile number starting with 09 or +639.</small></label>
            <button className="primary-link submit-button" disabled={saving} type="submit">{saving ? 'Saving...' : 'Save changes'} <span aria-hidden="true">&#8594;</span></button>
          </form>
          <div className="account-settings-signout"><div><strong>Sign out</strong><p>End your Gupfit session on this device.</p></div><button className="wizard-back" onClick={signOut} type="button">Sign out</button></div>
        </div>}
      </section>
      <SiteFooter />
    </main>
  )
}
