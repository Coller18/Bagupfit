import { useEffect, useState } from 'react'
import brandLogo from './logo-white.png'
import { supabase } from './supabase.js'
import SiteFooter from './SiteFooter.jsx'
import CustomerNav from './CustomerNav.jsx'
import MyBookingsPage from './MyBookingsPage.jsx'
import { apiRequest } from './api.js'
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
  const [telegramAvailable, setTelegramAvailable] = useState(false)
  const [telegramConnected, setTelegramConnected] = useState(false)
  const [telegramStatusLoading, setTelegramStatusLoading] = useState(true)
  const [telegramLoading, setTelegramLoading] = useState(false)
  const [telegramError, setTelegramError] = useState('')

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

  useEffect(() => {
    if (!session?.access_token) return
    setTelegramStatusLoading(true)
    apiRequest('/api/my/telegram-link/', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((result) => {
        setTelegramAvailable(Boolean(result.available))
        setTelegramConnected(Boolean(result.connected))
      })
      .catch(() => setTelegramError('Could not check your Telegram connection. Please try again.'))
      .finally(() => setTelegramStatusLoading(false))
  }, [session])

  async function connectTelegram() {
    setTelegramError('')
    const popup = window.open('about:blank', '_blank')
    if (popup) popup.opener = null
    setTelegramLoading(true)
    try {
      const result = await apiRequest('/api/my/telegram-link/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (result.connected) {
        popup?.close()
        setTelegramConnected(true)
      } else if (result.telegram_link_url && popup) {
        popup.location.href = result.telegram_link_url
      } else if (result.telegram_link_url) {
        window.location.href = result.telegram_link_url
      }
    } catch (connectError) {
      popup?.close()
      setTelegramError(connectError.message || 'Could not create a Telegram link. Please try again.')
    } finally {
      setTelegramLoading(false)
    }
  }

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
        <CustomerNav session={session} showLogin active="profile" />
      </header>
      <section className="booking-page-heading">
        <a className="back-link" href="/my-bookings">&#8592; Back to my bookings</a>
        <p className="eyebrow">YOUR GUPFIT ACCOUNT</p>
        <h1>Your profile.</h1>
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
          <div className={`telegram-connect-card${telegramConnected ? ' telegram-connect-card-connected' : ''}`}>
            <span className="telegram-brand-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.7 4.4 18.5 20c-.2 1.1-.9 1.3-1.8.8l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L6 13.4 1.1 11.9c-1.1-.3-1.1-1 .2-1.5L20.4 3c.9-.3 1.7.2 1.3 1.4Z" /></svg></span>
            <div className="telegram-connect-copy"><p className="eyebrow">BOOKING NOTIFICATIONS</p><h2>{telegramConnected ? 'Telegram is connected.' : 'Connect Telegram'}</h2><p>{telegramConnected ? 'We’ll message you when your bookings are confirmed or cancelled.' : 'Connect to Telegram to receive notifications about your bookings.'}</p></div>
            {telegramConnected ? <span className="telegram-connected-badge"><span aria-hidden="true">&#10003;</span> Connected</span> : telegramAvailable ? <button className="telegram-connect-button" disabled={telegramLoading || telegramStatusLoading} onClick={connectTelegram} type="button"><span>{telegramLoading ? 'Connecting...' : 'Connect Telegram'}</span><span aria-hidden="true">&#8594;</span></button> : telegramStatusLoading ? <span className="telegram-unavailable-note">Checking connection...</span> : <span className="telegram-unavailable-note">Telegram connection is unavailable right now.</span>}
          </div>
          {!telegramConnected && telegramAvailable && <p className="telegram-connect-hint">After Telegram opens, tap <strong>Start</strong> to finish connecting.</p>}
          {telegramError && <p className="form-message form-message-error" role="alert">{telegramError}</p>}
          <div className="account-settings-signout"><div><strong>Sign out</strong><p>End your Gupfit session on this device.</p></div><button className="wizard-back" onClick={signOut} type="button">Sign out</button></div>
        </div>}
      </section>
      <MyBookingsPage embedded />
      <SiteFooter />
    </main>
  )
}
