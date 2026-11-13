import { useCallback, useEffect, useState } from 'react'
import './App.css'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
const TOKEN_KEY = 'gupfit-subadmin-token'
const USER_KEY = 'gupfit-subadmin-username'

async function apiRequest(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers || {})
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (options.body && !isFormData && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Token ${token}`)

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  if (response.status === 204) return null

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const messages = Object.values(payload).flat(Infinity).filter(Boolean)
    const error = new Error(messages.join(' ') || `Request failed with HTTP ${response.status}.`)
    error.status = response.status
    throw error
  }
  return payload
}

function emptyBarberForm() {
  return { name: '', bio: '', photo: null, remove_photo: false, is_active: true }
}

function BookingTable({ bookings, emptyMessage, onViewReceipt, onReviewBooking, reviewingBookingId }) {
  if (bookings.length === 0) return <p className="empty-note">{emptyMessage}</p>

  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Customer</th><th>Contact</th><th>Barber</th><th>Date</th><th>Time</th><th>Status</th><th>Receipt</th><th>Review</th></tr></thead>
        <tbody>{bookings.map((booking) => (
          <tr key={booking.id}>
            <td>{booking.customer_name}</td>
            <td><span>{booking.customer_email}</span>{booking.customer_phone && <small>{booking.customer_phone}</small>}</td>
            <td>{booking.barber_name}</td>
            <td>{booking.date}</td>
            <td>{booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}</td>
            <td><span className={`booking-status booking-status--${booking.status}`}>{booking.status === 'pending_review' ? 'Pending review' : booking.status}</span></td>
            <td>{booking.has_payment_receipt && onViewReceipt ? <button className="text-button receipt-view-button" disabled={reviewingBookingId === booking.id} onClick={() => onViewReceipt(booking)} type="button">View receipt</button> : <span className="table-muted">—</span>}</td>
            <td>{booking.status === 'pending_review' && onReviewBooking ? <div className="booking-review-actions"><button className="button button-primary" disabled={reviewingBookingId === booking.id} onClick={() => onReviewBooking(booking, 'confirmed')} type="button">Approve</button><button className="button button-secondary" disabled={reviewingBookingId === booking.id} onClick={() => onReviewBooking(booking, 'cancelled')} type="button">Reject</button></div> : <span className="table-muted">—</span>}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '')
  const [username, setUsername] = useState(() => sessionStorage.getItem(USER_KEY) || '')
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [barberForm, setBarberForm] = useState(emptyBarberForm)
  const [editingBarber, setEditingBarber] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [availabilityForm, setAvailabilityForm] = useState({ barber: '', date: '', start_time: '', end_time: '' })
  const [barbers, setBarbers] = useState([])
  const [availability, setAvailability] = useState([])
  const [bookings, setBookings] = useState([])
  const [busy, setBusy] = useState(false)
  const [pageError, setPageError] = useState('')
  const [notice, setNotice] = useState('')
  const [activePage, setActivePage] = useState('overview')
  const [bookingSearch, setBookingSearch] = useState('')
  const [bookingStatus, setBookingStatus] = useState('all')
  const [reviewingBookingId, setReviewingBookingId] = useState(null)
  const [receiptLoadingId, setReceiptLoadingId] = useState(null)
  const [receiptPreview, setReceiptPreview] = useState(null)

  const loadDashboard = useCallback(async (activeToken = token) => {
    if (!activeToken) return
    setPageError('')
    try {
      const [barberData, availabilityData, bookingData] = await Promise.all([
        apiRequest('/api/admin/barbers/', { token: activeToken }),
        apiRequest('/api/admin/availability/', { token: activeToken }),
        apiRequest('/api/admin/bookings/', { token: activeToken }),
      ])
      setBarbers(barberData)
      setAvailability(availabilityData)
      setBookings(bookingData)
      setAvailabilityForm((current) => ({
        ...current,
        barber: current.barber || String(barberData.find((barber) => barber.is_active)?.id || ''),
      }))
    } catch (error) {
      if (error.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY)
        sessionStorage.removeItem(USER_KEY)
        setToken('')
        setUsername('')
        setPageError('Your sign-in expired. Please sign in again.')
      } else {
        setPageError(error.message)
      }
    }
  }, [token])

  useEffect(() => {
    if (token) loadDashboard(token)
  }, [token, loadDashboard])

  useEffect(() => {
    if (barberForm.photo) {
      const previewUrl = URL.createObjectURL(barberForm.photo)
      setPhotoPreview(previewUrl)
      return () => URL.revokeObjectURL(previewUrl)
    }
    if (barberForm.remove_photo) {
      setPhotoPreview('')
      return undefined
    }
    const currentBarber = barbers.find((barber) => barber.id === editingBarber)
    setPhotoPreview(currentBarber?.photo_url || '')
    return undefined
  }, [barberForm.photo, barberForm.remove_photo, barbers, editingBarber])

  async function signIn(event) {
    event.preventDefault()
    setBusy(true)
    setPageError('')
    try {
      const result = await apiRequest('/api/auth/login/', {
        method: 'POST',
        body: JSON.stringify(loginForm),
      })
      sessionStorage.setItem(TOKEN_KEY, result.token)
      sessionStorage.setItem(USER_KEY, result.username)
      setToken(result.token)
      setUsername(result.username)
      setLoginForm({ username: '', password: '' })
      await loadDashboard(result.token)
    } catch (error) {
      setPageError(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    try {
      if (token) await apiRequest('/api/auth/logout/', { method: 'POST', token })
    } catch {
      // Clear the browser session even if the API is temporarily unavailable.
    }
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
    setToken('')
    setUsername('')
    setBarbers([])
    setAvailability([])
    setBookings([])
    setEditingBarber(null)
    setBarberForm(emptyBarberForm())
    setNotice('')
  }

  async function submitBarber(event) {
    event.preventDefault()
    setBusy(true)
    setPageError('')
    setNotice('')
    try {
      const payload = new FormData()
      payload.append('name', barberForm.name)
      payload.append('bio', barberForm.bio)
      payload.append('is_active', String(editingBarber ? barberForm.is_active : true))
      if (barberForm.photo) payload.append('photo', barberForm.photo)
      if (barberForm.remove_photo) payload.append('remove_photo', 'true')
      await apiRequest(editingBarber ? `/api/admin/barbers/${editingBarber}/` : '/api/admin/barbers/', {
        method: editingBarber ? 'PATCH' : 'POST',
        token,
        body: payload,
      })
      setBarberForm(emptyBarberForm())
      setNotice(editingBarber ? 'Barber details updated.' : 'Barber added.')
      setEditingBarber(null)
      await loadDashboard(token)
    } catch (error) {
      setPageError(error.message)
    } finally {
      setBusy(false)
    }
  }

  function selectBarberPhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const validExtensions = /\.(jpe?g|png|webp)$/i
    if (!validExtensions.test(file.name)) {
      setPageError('Choose a JPG, PNG, or WebP image.')
      event.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setPageError('The image must be 5 MB or smaller.')
      event.target.value = ''
      return
    }
    setPageError('')
    setBarberForm((current) => ({ ...current, photo: file, remove_photo: false }))
  }

  function startEditingBarber(barber) {
    setEditingBarber(barber.id)
    setBarberForm({
      name: barber.name,
      bio: barber.bio || '',
      photo: null,
      remove_photo: false,
      is_active: barber.is_active,
    })
    setNotice('')
    setPageError('')
    document.querySelector('.barber-form-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function cancelBarberEdit() {
    setEditingBarber(null)
    setBarberForm(emptyBarberForm())
    setNotice('')
    setPageError('')
  }

  async function submitAvailability(event) {
    event.preventDefault()
    setBusy(true)
    setPageError('')
    setNotice('')
    try {
      await apiRequest('/api/admin/availability/', {
        method: 'POST',
        token,
        body: JSON.stringify(availabilityForm),
      })
      setAvailabilityForm((current) => ({ ...current, start_time: '', end_time: '' }))
      setNotice('Availability slot added.')
      await loadDashboard(token)
    } catch (error) {
      setPageError(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function reviewBooking(booking, nextStatus) {
    setReviewingBookingId(booking.id)
    setPageError('')
    setNotice('')
    try {
      await apiRequest(`/api/admin/bookings/${booking.id}/`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status: nextStatus }),
      })
      setNotice(nextStatus === 'confirmed' ? 'Payment approved and booking confirmed.' : 'Payment receipt rejected; the time is available again.')
      await loadDashboard(token)
    } catch (error) {
      setPageError(error.message)
    } finally {
      setReviewingBookingId(null)
    }
  }

  async function viewPaymentReceipt(booking) {
    setReceiptLoadingId(booking.id)
    setPageError('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/bookings/${booking.id}/receipt/`, {
        headers: { Authorization: `Token ${token}` },
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.detail || `Could not load receipt (HTTP ${response.status}).`)
      }
      const blob = await response.blob()
      setReceiptPreview({ url: URL.createObjectURL(blob), type: blob.type, booking })
    } catch (error) {
      setPageError(error.message)
    } finally {
      setReceiptLoadingId(null)
    }
  }

  function closeReceiptPreview() {
    if (receiptPreview?.url) URL.revokeObjectURL(receiptPreview.url)
    setReceiptPreview(null)
  }

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const upcomingBookings = bookings
    .filter((booking) => booking.status === 'confirmed' && booking.date >= today)
    .sort((first, second) => `${first.date} ${first.start_time}`.localeCompare(`${second.date} ${second.start_time}`))
  const filteredBookings = bookings.filter((booking) => {
    const search = bookingSearch.trim().toLowerCase()
    const matchesSearch = !search || [booking.customer_name, booking.customer_email, booking.customer_phone, booking.barber_name]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(search))
    return matchesSearch && (bookingStatus === 'all' || booking.status === bookingStatus)
  })

  if (!token) {
    return (
      <main className="login-page">
        <section className="login-card">
          <a className="brand" href="/" aria-label="Gupfit home">
            <span className="brand-mark">G</span><span>gupfit</span>
          </a>
          <p className="eyebrow">SUB-ADMIN PORTAL</p>
          <h1>Sign in</h1>
          <p className="login-copy">Use the staff account assigned to the Sub-admin group.</p>
          {pageError && <p className="form-error" role="alert">{pageError}</p>}
          <form className="form-stack" onSubmit={signIn}>
            <label>
              Username
              <input autoComplete="username" required value={loginForm.username} onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })} />
            </label>
            <label>
              Password
              <input autoComplete="current-password" required type="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} />
            </label>
            <button className="button button-primary button-wide" disabled={busy} type="submit">
              {busy ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Gupfit home">
          <span className="brand-mark">G</span><span>gupfit</span>
        </a>
        <div className="account-tools">
          <span className="account-avatar">{username.charAt(0).toUpperCase()}</span>
          <span className="account-name">{username}</span>
          <button className="button button-secondary refresh-button" onClick={() => loadDashboard(token)} type="button">Refresh</button>
          <button className="button button-secondary" onClick={signOut} type="button">Sign out</button>
        </div>
      </header>

      <div className="dashboard-layout">
        <aside className="sidebar">
          <p className="sidebar-label">WORKSPACE</p>
          {[
            ['overview', 'Overview', '01'],
            ['bookings', 'Bookings', '02'],
            ['availability', 'Availability', '03'],
            ['barbers', 'Barbers', '04'],
          ].map(([page, label, number]) => (
            <button className={`side-link${activePage === page ? ' side-link-active' : ''}`} key={page} onClick={() => { setActivePage(page); setNotice(''); setPageError('') }} type="button">
              <span className="side-link-number">{number}</span><span>{label}</span>
              {page === 'bookings' && bookings.length > 0 && <span className="side-link-count">{bookings.length}</span>}
            </button>
          ))}
          <div className="sidebar-bottom"><span className="sidebar-online-dot" />Dashboard connected</div>
        </aside>

        <div className="dashboard-content">
          {pageError && <div className="alert alert-error" role="alert">{pageError}</div>}
          {notice && <div className="alert alert-success" role="status">{notice}</div>}

          {activePage === 'overview' && (
            <>
              <section className="dashboard-intro dashboard-intro-row">
                <div><p className="eyebrow">SUB-ADMIN WORKSPACE</p><h1>Good day, {username}</h1><p className="intro-copy">Here is what is happening at your shop.</p></div>
                <button className="button button-primary" onClick={() => setActivePage('availability')} type="button">+ Add availability</button>
              </section>
              <section className="summary-grid" aria-label="Dashboard summary">
                <article className="summary-card"><span>Active barbers</span><strong>{barbers.filter((barber) => barber.is_active).length}</strong><small>Currently on the team</small></article>
                <article className="summary-card"><span>Open time slots</span><strong>{availability.filter((slot) => !slot.is_booked && slot.date >= today).length}</strong><small>Ready for customers</small></article>
                <button className="summary-card summary-card-button" onClick={() => { setBookingStatus('pending_review'); setActivePage('bookings') }} type="button"><span>Payments to review</span><strong>{bookings.filter((booking) => booking.status === 'pending_review').length}</strong><small>Open receipt reviews</small></button>
                <article className="summary-card"><span>Upcoming bookings</span><strong>{upcomingBookings.length}</strong><small>Confirmed appointments</small></article>
                <article className="summary-card"><span>All bookings</span><strong>{bookings.length}</strong><small>Including past bookings</small></article>
              </section>
              <section className="panel data-panel overview-bookings">
                <div className="panel-heading"><div><p className="eyebrow">NEXT UP</p><h2>Upcoming bookings</h2></div><button className="text-button" onClick={() => setActivePage('bookings')} type="button">View all bookings</button></div>
                <BookingTable bookings={upcomingBookings.slice(0, 5)} emptyMessage="No upcoming appointments at the moment." />
              </section>
              <section className="quick-actions">
                <button className="quick-action" onClick={() => setActivePage('barbers')} type="button"><span className="quick-action-icon">+</span><span><strong>Add a barber</strong><small>Grow your team</small></span></button>
                <button className="quick-action" onClick={() => setActivePage('availability')} type="button"><span className="quick-action-icon">+</span><span><strong>Publish availability</strong><small>Open times for booking</small></span></button>
                <button className="quick-action" onClick={() => setActivePage('bookings')} type="button"><span className="quick-action-icon">&#8594;</span><span><strong>Review bookings</strong><small>See customer appointments</small></span></button>
              </section>
            </>
          )}

          {activePage === 'bookings' && (
            <>
              <section className="dashboard-intro"><p className="eyebrow">CUSTOMERS</p><h1>Bookings</h1><p className="intro-copy">Search and review all customer appointments.</p></section>
              <section className="panel data-panel">
                <div className="panel-heading panel-heading-wrap"><div><p className="eyebrow">APPOINTMENTS</p><h2>{filteredBookings.length} booking{filteredBookings.length === 1 ? '' : 's'}</h2></div>
                  <div className="booking-filters">
                    <input aria-label="Search bookings" placeholder="Search customer, email, barber..." value={bookingSearch} onChange={(event) => setBookingSearch(event.target.value)} />
                    <select aria-label="Filter by booking status" value={bookingStatus} onChange={(event) => setBookingStatus(event.target.value)}><option value="all">All statuses</option><option value="pending_review">Pending review</option><option value="confirmed">Confirmed</option><option value="cancelled">Cancelled</option></select>
                  </div>
                </div>
                <BookingTable bookings={filteredBookings} emptyMessage={bookings.length ? 'No bookings match these filters.' : 'No bookings have been made yet.'} onViewReceipt={viewPaymentReceipt} onReviewBooking={reviewBooking} reviewingBookingId={reviewingBookingId || receiptLoadingId} />
              </section>
            </>
          )}

          {activePage === 'availability' && (
            <>
              <section className="dashboard-intro"><p className="eyebrow">SCHEDULE</p><h1>Availability</h1><p className="intro-copy">Publish dates and times customers can book.</p></section>
              <section className="panel">
                <div className="panel-heading"><div><p className="eyebrow">NEW SLOT</p><h2>Publish availability</h2></div></div>
                {barbers.filter((barber) => barber.is_active).length === 0 ? <p className="empty-note">Add an active barber before publishing availability.</p> : (
                  <form className="form-stack availability-form" onSubmit={submitAvailability}>
                    <label>Barber<select required value={availabilityForm.barber} onChange={(event) => setAvailabilityForm({ ...availabilityForm, barber: event.target.value })}>{barbers.filter((barber) => barber.is_active).map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}</select></label>
                    <label>Available date<input min={today} required type="date" value={availabilityForm.date} onChange={(event) => setAvailabilityForm({ ...availabilityForm, date: event.target.value })} /></label>
                    <div className="field-row"><label>Start time<input required type="time" value={availabilityForm.start_time} onChange={(event) => setAvailabilityForm({ ...availabilityForm, start_time: event.target.value })} /></label><label>End time<input required type="time" value={availabilityForm.end_time} onChange={(event) => setAvailabilityForm({ ...availabilityForm, end_time: event.target.value })} /></label></div>
                    <button className="button button-primary" disabled={busy} type="submit">Publish time slot</button>
                  </form>
                )}
              </section>
              <section className="panel data-panel"><div className="panel-heading"><div><p className="eyebrow">SCHEDULE</p><h2>Published times</h2></div><span className="count-pill">{availability.length}</span></div>
                {availability.length === 0 ? <p className="empty-note">No availability has been published yet.</p> : <div className="table-wrap"><table><thead><tr><th>Barber</th><th>Date</th><th>Start</th><th>End</th><th>Status</th></tr></thead><tbody>{availability.map((slot) => <tr key={slot.id}><td>{slot.barber_name}</td><td>{slot.date}</td><td>{slot.start_time.slice(0, 5)}</td><td>{slot.end_time.slice(0, 5)}</td><td><span className={`booking-status${slot.booking_status === 'confirmed' ? ' booking-status--cancelled' : ''}`}>{slot.booking_status === 'pending_review' ? 'Pending review' : slot.booking_status === 'confirmed' ? 'Booked' : 'Available'}</span></td></tr>)}</tbody></table></div>}
              </section>
            </>
          )}

          {activePage === 'barbers' && (
            <>
              <section className="dashboard-intro"><p className="eyebrow">YOUR TEAM</p><h1>Barbers</h1><p className="intro-copy">Add and manage the barbers shown on the customer booking site.</p></section>
              <section className="panel barber-form-panel">
                <div className="panel-heading"><div><p className="eyebrow">TEAM</p><h2>{editingBarber ? 'Edit barber details' : 'Add a barber'}</h2></div></div>
                <form className="form-stack barber-form" onSubmit={submitBarber}>
                  <label>Barber name<input maxLength="100" required value={barberForm.name} onChange={(event) => setBarberForm({ ...barberForm, name: event.target.value })} /></label>
                  <label>Bio <span className="optional">Optional</span><textarea rows="3" value={barberForm.bio} onChange={(event) => setBarberForm({ ...barberForm, bio: event.target.value })} /></label>
                  <div className="barber-picture-field">
                    <span className="barber-picture-label">Profile picture <span className="optional">Optional</span></span>
                    <div className="barber-picture-upload">
                      {photoPreview ? <img className="barber-picture-preview" src={photoPreview} alt="Barber photo preview" /> : <span className="barber-picture-placeholder">Image preview</span>}
                      <div className="barber-picture-controls">
                        <input accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" aria-label="Upload barber picture" onChange={selectBarberPhoto} type="file" />
                        <small>JPG, PNG, or WebP. Maximum 5 MB.</small>
                        {editingBarber && photoPreview && <button className="text-button" onClick={() => setBarberForm((current) => ({ ...current, photo: null, remove_photo: true }))} type="button">Remove current picture</button>}
                      </div>
                    </div>
                  </div>
                  {editingBarber && <label className="barber-active-toggle"><input checked={barberForm.is_active} onChange={(event) => setBarberForm({ ...barberForm, is_active: event.target.checked })} type="checkbox" /> Accepting new bookings</label>}
                  <div className="barber-form-actions"><button className="button button-primary" disabled={busy} type="submit">{busy ? 'Saving...' : editingBarber ? 'Save changes' : 'Add barber'}</button>{editingBarber && <button className="button button-secondary" disabled={busy} onClick={cancelBarberEdit} type="button">Cancel</button>}</div>
                </form>
              </section>
              <section className="panel data-panel"><div className="panel-heading"><div><p className="eyebrow">TEAM</p><h2>Current barbers</h2></div><span className="count-pill">{barbers.length}</span></div>
                {barbers.length === 0 ? <p className="empty-note">No barbers added yet.</p> : <div className="barber-list">{barbers.map((barber) => <article className="barber-row" key={barber.id}>{barber.photo_url ? <img src={barber.photo_url} alt="" /> : <span className="barber-initial">{barber.name.charAt(0).toUpperCase()}</span>}<div><strong>{barber.name}</strong>{barber.bio && <small>{barber.bio}</small>}</div><span className={`booking-status${barber.is_active ? '' : ' booking-status--cancelled'}`}>{barber.is_active ? 'Active' : 'Inactive'}</span><button className="button button-secondary barber-edit-button" onClick={() => startEditingBarber(barber)} type="button">Edit</button></article>)}</div>}
              </section>
            </>
          )}
        </div>
      </div>

      {receiptPreview && <div className="receipt-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeReceiptPreview() }}>
        <section className="receipt-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-modal-title">
          <header><div><p className="eyebrow">PAYMENT REVIEW</p><h2 id="receipt-modal-title">{receiptPreview.booking.customer_name}'s receipt</h2></div><button className="button button-secondary" onClick={closeReceiptPreview} type="button">Close</button></header>
          {receiptPreview.type === 'application/pdf'
            ? <iframe title="Payment receipt PDF" src={receiptPreview.url} />
            : <img src={receiptPreview.url} alt={`Payment receipt from ${receiptPreview.booking.customer_name}`} />}
        </section>
      </div>}

      <footer className="page-footer"><span>Gupfit</span><span>Signed in as {username}</span></footer>
    </main>
  )
}
