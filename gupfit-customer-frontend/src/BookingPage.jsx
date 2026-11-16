import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest, displayDate } from './api.js'
import brandLogo from './logo-white.png'
import paymentQr from './qrcode.jpg'
import { supabase } from './supabase.js'
import SiteFooter from './SiteFooter.jsx'
import './App.css'

const dateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const dateFromKey = (value) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const monthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1)

export default function BookingPage() {
  const [barbers, setBarbers] = useState([])
  const [availability, setAvailability] = useState([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [bookingError, setBookingError] = useState('')
  const [success, setSuccess] = useState('')
  const [submittedBooking, setSubmittedBooking] = useState(null)
  const [telegramLinkUrl, setTelegramLinkUrl] = useState('')
  const [telegramConnected, setTelegramConnected] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [paymentReceipt, setPaymentReceipt] = useState(null)
  const [form, setForm] = useState({ barber: '', date: '', availability: '' })
  const [calendarMonth, setCalendarMonth] = useState(() => monthStart(new Date()))
  const [bookingStep, setBookingStep] = useState(1)

  const loadPublicData = useCallback(async () => {
    setLoading(true)
    try {
      const [barberData, slotData] = await Promise.all([
        apiRequest('/api/barbers/'),
        apiRequest('/api/availability/'),
      ])
      setBarbers(barberData)
      setAvailability(slotData)
    } catch (error) {
      setBookingError(error.message || 'Could not load appointment availability.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPublicData() }, [loadPublicData])

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
    if (!authLoading && !session) window.location.replace('/account?mode=login&next=%2Fbooking')
  }, [authLoading, session])

  const availableBarbers = useMemo(() => barbers.filter((barber) => barber.is_active), [barbers])
  const selectedBarber = useMemo(
    () => availableBarbers.find((barber) => String(barber.id) === form.barber),
    [availableBarbers, form.barber],
  )
  const today = dateKey(new Date())
  const barberSlots = useMemo(
    () => availability.filter((slot) => String(slot.barber) === form.barber && slot.date >= today),
    [availability, form.barber, today],
  )
  const availableDates = useMemo(() => [...new Set(barberSlots.map((slot) => slot.date))].sort(), [barberSlots])
  const dateSlots = useMemo(() => barberSlots.filter((slot) => slot.date === form.date), [barberSlots, form.date])
  const selectedSlot = useMemo(
    () => dateSlots.find((slot) => String(slot.id) === form.availability),
    [dateSlots, form.availability],
  )
  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const offset = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ]
  }, [calendarMonth])
  const currentMonthKey = dateKey(monthStart(new Date())).slice(0, 7)
  const calendarMonthKey = dateKey(calendarMonth).slice(0, 7)
  const lastAvailableMonth = availableDates.at(-1)?.slice(0, 7) || currentMonthKey

  async function signOutCustomer() {
    await supabase?.auth.signOut()
    setSession(null)
  }

  function chooseBarber(barberId) {
    setForm({ barber: barberId, date: '', availability: '' })
    setPaymentReceipt(null)
    const nextOpenDate = availability
      .filter((slot) => String(slot.barber) === barberId && slot.date >= today)
      .map((slot) => slot.date)
      .sort()[0]
    setCalendarMonth(nextOpenDate ? monthStart(dateFromKey(nextOpenDate)) : monthStart(new Date()))
  }

  function selectPaymentReceipt(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      setBookingError('Choose a JPG, PNG, WebP, or PDF receipt.')
      setPaymentReceipt(null)
      event.target.value = ''
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setBookingError('Your receipt must be 10 MB or smaller.')
      setPaymentReceipt(null)
      event.target.value = ''
      return
    }
    setBookingError('')
    setPaymentReceipt(file)
  }

  async function submitBooking(event) {
    event?.preventDefault()
    setSubmitting(true)
    setBookingError('')
    setSuccess('')
    setSubmittedBooking(null)
    setTelegramLinkUrl('')
    setTelegramConnected(false)
    try {
      const bookingData = new FormData()
      bookingData.append('availability', String(Number(form.availability)))
      bookingData.append('payment_receipt', paymentReceipt)
      const result = await apiRequest('/api/bookings/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: bookingData,
      })
      setSuccess('Receipt submitted. Your time is held while the shop reviews your payment.')
      setSubmittedBooking({
        id: result.id,
        barberName: selectedBarber?.name,
        date: form.date,
        startTime: selectedSlot?.start_time,
        endTime: selectedSlot?.end_time,
        receiptName: paymentReceipt?.name,
      })
      setTelegramLinkUrl(result.telegram_link_url || '')
      setTelegramConnected(Boolean(result.telegram_connected))
      setPaymentReceipt(null)
      setForm({ barber: '', date: '', availability: '' })
      setBookingStep(1)
      try { setAvailability(await apiRequest('/api/availability/')) } catch { /* The booking was submitted; keep showing its confirmation. */ }
    } catch (error) {
      setBookingError(error.message || 'Could not complete the booking.')
      try { setAvailability(await apiRequest('/api/availability/')) } catch { /* Keep the booking error visible. */ }
    } finally {
      setSubmitting(false)
    }
  }

  function startAnotherBooking() {
    setSuccess('')
    setSubmittedBooking(null)
    setTelegramLinkUrl('')
    setTelegramConnected(false)
    setPaymentReceipt(null)
    setForm({ barber: '', date: '', availability: '' })
    setBookingStep(1)
  }

  return (
    <main className="booking-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Gupfit home"><img className="site-logo" src={brandLogo} alt="Gupfit" /></a>
        <nav className="site-nav" aria-label="Main navigation"><a href="/works">All haircuts</a>{session && <a href="/my-bookings">My bookings</a>}<a className="nav-cta" href="/account?mode=login&next=%2Fbooking">Book a time</a></nav>
      </header>

      <section className="booking-page-heading booking-page-heading-simple">
        <a className="back-link" href="/">&#8592; Back to Gupfit</a>
      </section>

      <section className="booking-page-content booking-page-content-wizard" id="appointment">
        <div className={`booking-form${session ? ' booking-form-wizard' : ''}`}>
          {authLoading || !session ? <p className="info-panel">{authLoading ? 'Checking your account...' : 'Opening account sign-in...'}</p> : (
            <>
              <div className="form-title customer-account-heading"><span className="form-title-icon">{session.user.user_metadata?.full_name?.charAt(0)?.toUpperCase() || 'G'}</span><div><span className="team-kicker">SIGNED IN</span><h3>{session.user.user_metadata?.full_name || session.user.email}</h3><small>{session.user.email}</small></div><button className="text-button" onClick={signOutCustomer} type="button">Sign out</button></div>
              {bookingError && <p className="form-message form-message-error" role="alert">{bookingError}</p>}
              {success ? <BookingSubmittedPanel booking={submittedBooking} telegramLinkUrl={telegramLinkUrl} telegramConnected={telegramConnected} onBookAnother={startAnotherBooking} /> : loading ? <p className="info-panel">Loading available times...</p> : availableBarbers.length === 0 ? <p className="info-panel">No appointment times are available yet.</p> : (
                <div className="booking-wizard">
                  <ol className="booking-progress" aria-label="Booking progress">
                    {['Barber', 'Date', 'Time', 'Confirm'].map((label, index) => <li className={bookingStep === index + 1 ? 'booking-progress-current' : bookingStep > index + 1 ? 'booking-progress-complete' : ''} key={label}><span>{bookingStep > index + 1 ? <CheckIcon /> : `0${index + 1}`}</span><small>{label}</small></li>)}
                  </ol>

                  {bookingStep === 1 && <section className="wizard-step" aria-labelledby="wizard-barber-title">
                    <div className="wizard-step-heading"><p className="eyebrow">STEP 01</p><h2 id="wizard-barber-title">Choose your barber</h2><p>Select who you would like to see.</p></div>
                    <div className="barber-choice-grid">
                      {availableBarbers.map((barber) => {
                        const selected = form.barber === String(barber.id)
                        return <button aria-pressed={selected} className={`barber-choice${selected ? ' barber-choice-selected' : ''}`} key={barber.id} onClick={() => chooseBarber(String(barber.id))} type="button">
                          {barber.photo_url ? <img src={barber.photo_url} alt="" /> : <span className="barber-choice-placeholder">{barber.name.charAt(0).toUpperCase()}</span>}
                          <span className="barber-choice-copy"><strong>{barber.name}</strong><small>{selected ? 'Selected' : 'Choose barber'}</small></span>
                          <span className="barber-choice-mark" aria-hidden="true">{selected ? <CheckIcon /> : <PlusIcon />}</span>
                        </button>
                      })}
                    </div>
                    <div className="wizard-actions wizard-actions-end"><button className="primary-link" disabled={!form.barber} onClick={() => setBookingStep(2)} type="button">Choose a date <span aria-hidden="true">&#8594;</span></button></div>
                  </section>}

                  {bookingStep === 2 && <section className="wizard-step" aria-labelledby="wizard-date-title">
                    <div className="wizard-step-heading"><p className="eyebrow">STEP 02 · {selectedBarber?.name}</p><h2 id="wizard-date-title">Choose a date</h2><p>Available dates are marked on the calendar.</p></div>
                    <section className="booking-calendar wizard-calendar" aria-label="Choose an available appointment date">
                      <div className="calendar-heading">
                        <h4>{calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h4>
                        <div className="calendar-nav">
                          <button type="button" aria-label="Previous month" disabled={calendarMonthKey <= currentMonthKey} onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}>&#8592;</button>
                          <button type="button" aria-label="Next month" disabled={calendarMonthKey >= lastAvailableMonth} onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}>&#8594;</button>
                        </div>
                      </div>
                      <div className="calendar-grid calendar-weekdays" aria-hidden="true">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div>
                      <div className="calendar-grid calendar-days">
                        {calendarCells.map((day, index) => {
                          if (!day) return <span className="calendar-empty-cell" key={`empty-${index}`} aria-hidden="true" />
                          const dayDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day)
                          const key = dateKey(dayDate)
                          const isAvailable = availableDates.includes(key)
                          const isSelected = form.date === key
                          return <button className={`calendar-day${isAvailable ? ' calendar-day-available' : ''}${isSelected ? ' calendar-day-selected' : ''}`} disabled={!isAvailable} key={key} onClick={() => { setForm((current) => ({ ...current, date: key, availability: '' })); setPaymentReceipt(null) }} type="button" aria-label={`${dayDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}${isAvailable ? ', available' : ', unavailable'}`} aria-pressed={isSelected}>{day}{isAvailable && <i aria-hidden="true" />}</button>
                        })}
                      </div>
                      <p className="calendar-legend"><i aria-hidden="true" /> Dates with open appointments</p>
                    </section>
                    {availableDates.length === 0 && <p className="field-hint wizard-empty">No upcoming times are available for this barber yet.</p>}
                    <div className="wizard-actions"><button className="wizard-back" onClick={() => setBookingStep(1)} type="button">&#8592; Back</button><button className="primary-link" disabled={!form.date} onClick={() => setBookingStep(3)} type="button">Choose a time <span aria-hidden="true">&#8594;</span></button></div>
                  </section>}

                  {bookingStep === 3 && <section className="wizard-step" aria-labelledby="wizard-time-title">
                    <div className="wizard-step-heading"><p className="eyebrow">STEP 03 · {displayDate(form.date)}</p><h2 id="wizard-time-title">Choose a time</h2><p>Pick an available appointment time.</p></div>
                    <div className="booking-time-grid wizard-time-grid" role="radiogroup" aria-label="Available appointment times">
                      {dateSlots.map((slot) => {
                        const selected = String(form.availability) === String(slot.id)
                        return <button aria-checked={selected} className={`booking-time-option${selected ? ' booking-time-option-selected' : ''}`} key={slot.id} onClick={() => { setForm((current) => ({ ...current, availability: String(slot.id) })); setPaymentReceipt(null) }} role="radio" type="button">{slot.start_time.slice(0, 5)} <span>-</span> {slot.end_time.slice(0, 5)}</button>
                      })}
                    </div>
                    <div className="wizard-actions"><button className="wizard-back" onClick={() => setBookingStep(2)} type="button">&#8592; Back</button><button className="primary-link" disabled={!form.availability} onClick={() => setBookingStep(4)} type="button">Review appointment <span aria-hidden="true">&#8594;</span></button></div>
                  </section>}

                  {bookingStep === 4 && <section className="wizard-step" aria-labelledby="wizard-review-title">
                    <div className="wizard-step-heading"><p className="eyebrow">STEP 04 · FINAL CHECK</p><h2 id="wizard-review-title">Review your appointment</h2><p>Make sure these details are right before confirming.</p></div>
                    <div className="booking-review-grid">
                      <article><span>BARBER</span><strong>{selectedBarber?.name}</strong></article>
                      <article><span>DATE</span><strong>{displayDate(form.date)}</strong></article>
                      <article><span>TIME</span><strong>{selectedSlot?.start_time.slice(0, 5)} - {selectedSlot?.end_time.slice(0, 5)}</strong></article>
                    </div>
                    <section className="payment-submission" aria-labelledby="payment-submission-title">
                      <div className="payment-qr-card"><span>SCAN TO PAY</span><div className="payment-qr-frame"><img src={paymentQr} alt="Shop GCash and InstaPay payment QR code" /></div><small>GCash · InstaPay</small></div>
                      <div className="payment-submission-copy"><p className="eyebrow">PAYMENT</p><h3 id="payment-submission-title">Upload your payment receipt</h3><p>Pay using the shop's QR code, then upload the receipt. The shop will review your payment before confirming the appointment.</p>
                        <label className="receipt-upload-label">Payment receipt<input accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" onChange={selectPaymentReceipt} type="file" /><small>JPG, PNG, WebP, or PDF · Maximum 10 MB</small></label>
                        {paymentReceipt && <p className="receipt-file-name" role="status">Selected: {paymentReceipt.name}</p>}
                      </div>
                    </section>
                    <div className="wizard-actions"><button className="wizard-back" onClick={() => setBookingStep(3)} type="button">&#8592; Back</button><button className="primary-link" disabled={submitting || !paymentReceipt} onClick={submitBooking} type="button">{submitting ? 'Sending receipt...' : 'Send receipt for review'} <span aria-hidden="true">&#8594;</span></button></div>
                  </section>}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}

function BookingSubmittedPanel({ booking, telegramLinkUrl, telegramConnected, onBookAnother }) {
  return (
    <section className="booking-submitted-panel" aria-labelledby="booking-submitted-title" role="status">
      <div className="booking-submitted-heading">
        <span className="booking-submitted-check" aria-hidden="true"><CheckIcon /></span>
        <p className="eyebrow">RECEIPT RECEIVED</p>
        <h1 id="booking-submitted-title">Your booking is in.</h1>
        <p>Your payment receipt has been sent to the shop. Your appointment is held while the team reviews it.</p>
      </div>

      <div className="booking-submitted-summary">
        <div className="booking-submitted-summary-top"><span>BOOKING REQUEST</span>{booking?.id && <strong>GF-{booking.id}</strong>}</div>
        <div className="booking-submitted-appointment">
          <div><span>BARBER</span><strong>{booking?.barberName || 'Your barber'}</strong></div>
          <div><span>DATE &amp; TIME</span><strong>{booking?.date ? displayDate(booking.date) : 'Selected appointment'}{booking?.startTime ? ` · ${booking.startTime.slice(0, 5)}${booking?.endTime ? `–${booking.endTime.slice(0, 5)}` : ''}` : ''}</strong></div>
        </div>
        <div className="booking-submitted-receipt"><span className="booking-submitted-receipt-check" aria-hidden="true"><CheckIcon /></span><div><strong>{booking?.receiptName || 'Payment receipt'}</strong><small>Uploaded successfully · awaiting review</small></div></div>
        <div className="booking-submitted-status"><span className="booking-submitted-status-dot" /><span>Payment review</span><strong>In progress</strong></div>
      </div>

      <div className={`telegram-connect-card${telegramConnected ? ' telegram-connect-card-connected' : ''}`}>
        <span className="telegram-brand-icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" focusable="false">
            <circle cx="24" cy="24" r="24" fill="currentColor" />
            <path d="M35.7 13.9 31.3 35c-.3 1.5-1.2 1.9-2.4 1.2l-7-5.2-3.4 3.3c-.4.4-.7.7-1.4.7l.5-7.1 12.9-11.7c.6-.5-.1-.8-.9-.3L13.7 26.1l-6.9-2.2c-1.5-.5-1.5-1.5.3-2.2l26.7-10.3c1.2-.4 2.3.3 1.9 2.5Z" fill="#fff" />
          </svg>
        </span>
        <div className="telegram-connect-copy">
          <p className="eyebrow">OPTIONAL · BOOKING UPDATES</p>
          <h2>{telegramConnected ? 'Telegram is connected.' : 'Stay in the loop on Telegram.'}</h2>
          <p>{telegramConnected ? 'We’ll message you here when the shop confirms or updates your booking.' : 'Connect your Telegram account and we’ll message you as soon as your booking is reviewed.'}</p>
        </div>
        {telegramLinkUrl ? (
          <a className="telegram-connect-button" href={telegramLinkUrl} rel="noreferrer" target="_blank">
            <span>Connect Telegram</span><span aria-hidden="true">&#8594;</span>
          </a>
        ) : telegramConnected ? (
          <span className="telegram-connected-badge"><span aria-hidden="true"><CheckIcon /></span> Connected</span>
        ) : (
          <span className="telegram-unavailable-note">Check status in My bookings</span>
        )}
      </div>

      {telegramLinkUrl && <p className="telegram-connect-hint">Tap the button, then press <strong>Start</strong> in Telegram to finish linking.</p>}

      <div className="booking-submitted-actions">
        <a className="booking-submitted-secondary" href="/my-bookings">View my bookings <span aria-hidden="true">&#8594;</span></a>
        <button className="booking-submitted-new" onClick={onBookAnother} type="button">Book another time</button>
      </div>
    </section>
  )
}

function CheckIcon() {
  return <svg className="ui-check-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7" /></svg>
}

function PlusIcon() {
  return <svg className="ui-plus-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
}
