import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest, displayDate } from './api.js'
import brandLogo from './logo-white.png'
import { supabase } from './supabase.js'
import SiteFooter from './SiteFooter.jsx'
import './App.css'

const localDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function MyBookingsPage() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  const loadBookings = useCallback(async () => {
    if (!session?.access_token) return
    setLoading(true)
    setError('')
    try {
      setBookings(await apiRequest('/api/my/bookings/', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }))
    } catch (requestError) {
      setError(requestError.message || 'Could not load your bookings.')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    if (session?.access_token) loadBookings()
    else setBookings([])
  }, [loadBookings, session])

  const { upcomingBookings, previousBookings } = useMemo(() => {
    const today = localDateKey(new Date())
    const sorted = [...bookings].sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`))
    return {
      upcomingBookings: sorted.filter((booking) => booking.date >= today && !['cancelled', 'canceled'].includes(String(booking.status).toLowerCase())),
      previousBookings: sorted.filter((booking) => booking.date < today || ['cancelled', 'canceled'].includes(String(booking.status).toLowerCase())).reverse(),
    }
  }, [bookings])

  async function signOut() {
    await supabase?.auth.signOut()
    setSession(null)
  }

  function renderBooking(booking) {
    return <article className="booking-history-card" key={booking.id}>
      <div className="booking-history-date"><span>{displayDate(booking.date)}</span><strong>{booking.start_time.slice(0, 5)}{booking.end_time ? ` - ${booking.end_time.slice(0, 5)}` : ''}</strong></div>
      <div className="booking-history-details"><span className="team-kicker">BARBER</span><strong>{booking.barber_name}</strong></div>
      <span className={`booking-status booking-status--${booking.status}`}>{booking.status === 'pending_review' ? 'Payment under review' : booking.status}</span>
    </article>
  }

  return (
    <main className="booking-page my-bookings-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Gupfit home"><img className="site-logo" src={brandLogo} alt="Gupfit" /></a>
        <nav className="site-nav" aria-label="Main navigation"><a href="/#team">Our team</a>{session && <a href="/my-bookings" aria-current="page">My bookings</a>}<a className="nav-cta" href="/booking">Book a time</a></nav>
      </header>

      <section className="booking-page-heading">
        <a className="back-link" href="/booking">&#8592; Back to booking</a>
        <p className="eyebrow">YOUR GUPFIT ACCOUNT</p>
        <h1>My bookings.</h1>
        <p>View your upcoming appointments and booking history.</p>
      </section>

      <section className="booking-history-content" aria-labelledby="booking-history-title">
        {authLoading ? <p className="info-panel">Checking your account...</p> : !session ? (
          <div className="booking-history-empty"><h2 id="booking-history-title">Sign in to see your bookings</h2><p>Your appointments are saved to your Gupfit account.</p><a className="primary-link" href="/account?mode=login&amp;next=%2Fmy-bookings">Sign in <span aria-hidden="true">&#8594;</span></a></div>
        ) : <>
          <div className="booking-history-toolbar"><div><p className="eyebrow">SIGNED IN AS</p><h2 id="booking-history-title">{session.user.user_metadata?.full_name || session.user.email}</h2></div><div className="booking-history-actions"><button className="wizard-back" onClick={loadBookings} type="button">Refresh</button><button className="wizard-back" onClick={signOut} type="button">Sign out</button></div></div>
          {error && <p className="form-message form-message-error" role="alert">{error}</p>}
          {loading ? <p className="info-panel">Loading your bookings...</p> : <>
            <section className="booking-history-section"><div className="booking-history-section-heading"><h3>Upcoming</h3><span>{upcomingBookings.length}</span></div>
              {upcomingBookings.length ? <div className="booking-history-list">{upcomingBookings.map(renderBooking)}</div> : <div className="booking-history-empty"><p>You have no upcoming appointments.</p><a className="primary-link" href="/booking">Book an appointment <span aria-hidden="true">&#8594;</span></a></div>}
            </section>
            {previousBookings.length > 0 && <section className="booking-history-section"><div className="booking-history-section-heading"><h3>Past and cancelled</h3><span>{previousBookings.length}</span></div><div className="booking-history-list">{previousBookings.map(renderBooking)}</div></section>}
          </>}
        </>}
      </section>

      <SiteFooter />
    </main>
  )
}
