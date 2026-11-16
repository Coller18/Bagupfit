import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest, displayDate } from './api.js'
import brandLogo from './logo-white.png'
import { supabase } from './supabase.js'
import SiteFooter from './SiteFooter.jsx'
import './App.css'

const BOOKINGS_PER_PAGE = 5

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
  const [upcomingPage, setUpcomingPage] = useState(1)
  const [previousPage, setPreviousPage] = useState(1)

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
  const upcomingPageCount = Math.ceil(upcomingBookings.length / BOOKINGS_PER_PAGE)
  const previousPageCount = Math.ceil(previousBookings.length / BOOKINGS_PER_PAGE)
  const visibleUpcomingBookings = useMemo(
    () => upcomingBookings.slice((upcomingPage - 1) * BOOKINGS_PER_PAGE, upcomingPage * BOOKINGS_PER_PAGE),
    [upcomingBookings, upcomingPage],
  )
  const visiblePreviousBookings = useMemo(
    () => previousBookings.slice((previousPage - 1) * BOOKINGS_PER_PAGE, previousPage * BOOKINGS_PER_PAGE),
    [previousBookings, previousPage],
  )

  useEffect(() => {
    setUpcomingPage(1)
    setPreviousPage(1)
  }, [bookings])

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
        <nav className="site-nav" aria-label="Main navigation"><a href="/works">All haircuts</a>{session && <><a href="/my-bookings" aria-current="page">My bookings</a><a href="/account-settings">Account settings</a></>}<a className="nav-cta" href="/booking">Book a time</a></nav>
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
          <div className="booking-history-toolbar"><div><p className="eyebrow">YOUR APPOINTMENTS</p><h2 id="booking-history-title">Booking history</h2></div><div className="booking-history-actions"><button className="wizard-back" onClick={loadBookings} type="button">Refresh</button></div></div>
          {error && <p className="form-message form-message-error" role="alert">{error}</p>}
          {loading ? <p className="info-panel">Loading your bookings...</p> : <>
            <section className="booking-history-section"><div className="booking-history-section-heading"><h3>Upcoming</h3><span>{upcomingBookings.length}</span></div>
              {upcomingBookings.length ? <>
                <div className="booking-history-list">{visibleUpcomingBookings.map(renderBooking)}</div>
                <BookingPagination currentPage={upcomingPage} pageCount={upcomingPageCount} pageSize={BOOKINGS_PER_PAGE} totalItems={upcomingBookings.length} onPageChange={setUpcomingPage} />
              </> : <div className="booking-history-empty"><p>You have no upcoming appointments.</p><a className="primary-link" href="/booking">Book an appointment <span aria-hidden="true">&#8594;</span></a></div>}
            </section>
            {previousBookings.length > 0 && <section className="booking-history-section"><div className="booking-history-section-heading"><h3>Past and cancelled</h3><span>{previousBookings.length}</span></div><div className="booking-history-list">{visiblePreviousBookings.map(renderBooking)}</div><BookingPagination currentPage={previousPage} pageCount={previousPageCount} pageSize={BOOKINGS_PER_PAGE} totalItems={previousBookings.length} onPageChange={setPreviousPage} /></section>}
          </>}
        </>}
      </section>

      <SiteFooter />
    </main>
  )
}

function BookingPagination({ currentPage, pageCount, pageSize, totalItems, onPageChange }) {
  if (pageCount <= 1) return null

  const firstItem = (currentPage - 1) * pageSize + 1
  const lastItem = Math.min(currentPage * pageSize, totalItems)
  return (
    <nav className="booking-pagination" aria-label="Booking pages">
      <span aria-live="polite">Showing {firstItem}–{lastItem} of {totalItems}</span>
      <div>
        <button disabled={currentPage <= 1} onClick={() => onPageChange((page) => Math.max(1, page - 1))} type="button" aria-label="Previous page">&#8592; <span>Previous</span></button>
        <strong aria-current="page">{currentPage} <span>of</span> {pageCount}</strong>
        <button disabled={currentPage >= pageCount} onClick={() => onPageChange((page) => Math.min(pageCount, page + 1))} type="button" aria-label="Next page"><span>Next</span> &#8594;</button>
      </div>
    </nav>
  )
}
