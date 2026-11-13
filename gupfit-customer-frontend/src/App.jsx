import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { API_BASE_URL, apiRequest } from './api.js'
import brandLogo from './logo-white.png'
import heroVideo from './hero.mp4'
import barberFallback from './barber-placeholder.svg'
import CircularCarousel from './CircularCarousel.jsx'
import SiteFooter from './SiteFooter.jsx'
import { supabase } from './supabase.js'
import './App.css'

const MicroSlats = lazy(() => import('./MicroSlats.jsx'))

export default function App() {
  const [barbers, setBarbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [customerSession, setCustomerSession] = useState(null)
  const [authResolved, setAuthResolved] = useState(false)
  const [activeBarberIndex, setActiveBarberIndex] = useState(0)
  const homeStackRef = useRef(null)

  const loadBarbers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setBarbers(await apiRequest('/api/barbers/'))
    } catch (requestError) {
      setError(requestError.message || `Could not connect to ${API_BASE_URL}.`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadBarbers() }, [loadBarbers])

  useEffect(() => {
    if (!supabase) {
      setAuthResolved(true)
      return undefined
    }
    supabase.auth.getSession().then(({ data }) => {
      setCustomerSession(data.session)
      setAuthResolved(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCustomerSession(session)
      setAuthResolved(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const stack = homeStackRef.current
    if (!stack || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const cards = Array.from(stack.querySelectorAll('[data-stack-card]'))
    let frame = 0
    const updateStack = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const viewportHeight = window.innerHeight || 1
        cards.forEach((card, index) => {
          const nextCard = cards[index + 1]
          if (!nextCard) return
          const nextTop = nextCard.getBoundingClientRect().top
          const progress = Math.max(0, Math.min(1, (viewportHeight - nextTop) / viewportHeight))
          const scale = 1 - progress * 0.045
          const lift = progress * 12
          card.style.transform = `translate3d(0, ${-lift}px, 0) scale(${scale})`
          card.style.filter = `brightness(${1 - progress * 0.28})`
        })
      })
    }

    updateStack()
    window.addEventListener('scroll', updateStack, { passive: true })
    window.addEventListener('resize', updateStack)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', updateStack)
      window.removeEventListener('resize', updateStack)
      cards.forEach((card) => {
        card.style.removeProperty('transform')
        card.style.removeProperty('filter')
      })
    }
  }, [])

  const availableBarbers = barbers.filter((barber) => barber.is_active)
  const teamItems = availableBarbers.map((barber) => ({
    src: barber.photo_url || barberFallback,
    alt: barber.photo_url ? `Portrait of ${barber.name}` : `Profile placeholder for ${barber.name}`,
    title: barber.name,
    subtitle: 'Gupfit barber',
  }))
  const activeBarber = availableBarbers[activeBarberIndex] || availableBarbers[0]

  return (
    <main className="customer-home">
      <header className="site-header">
        <nav className="site-nav" aria-label="Main navigation">
          <a href="#team">Our team</a>
          {authResolved && customerSession ? <>
            <a href="/my-bookings">My bookings</a>
            <a className="nav-cta" href="/booking">Book a time</a>
          </> : <a className="nav-cta" href="/account?mode=login&next=%2Fbooking">Login</a>}
        </nav>
      </header>

      <div className="home-scroll-stack" ref={homeStackRef}>
      <section className="hero home-stack-card" id="home" data-stack-card>
        <video className="hero-video" autoPlay muted loop playsInline aria-hidden="true" tabIndex={-1}>
          <source src={heroVideo} type="video/mp4" />
        </video>
        <div className="hero-video-overlay" />
        <Suspense fallback={null}>
          <MicroSlats
            className="hero-micro-slats"
            preset="swell"
            color="#050505"
            glintColor="#ffffff"
            backgroundColor="transparent"
            slatWidth={10}
            slatHeight={25}
            gap={3}
            roundness={0.75}
            interactive
            cursorStrength={1}
            cursorSize={40}
            swirl={0}
            trail={1.4}
            lean={0}
            intro
            scale={1.5}
            speed={0.6}
            direction={250}
            chop={0.55}
            stretch={0}
            glint={0.7}
            contrast={1.25}
            perspective={0.55}
            fog={0.55}
            introDuration={1.5}
            paused={false}
          />
        </Suspense>
        <div className="hero-inner">
          <div className="hero-copy">
            <a className="hero-brand" href="/" aria-label="Gupfit home">
              <img className="hero-logo" src={brandLogo} alt="Gupfit" />
            </a>
            <h1>Reserve and Respect<br /><span>Time.</span></h1>
            <a className="primary-link" href="/account?mode=login&next=%2Fbooking">Book an appointment</a>
          </div>
        </div>
      </section>

      <section className="team-section content-section home-stack-card" id="team" data-stack-card>
        <div className="section-heading">
          <div><p className="eyebrow">THE GUPFIT CREW</p><h2>Meet the team.</h2></div>
          <p className="section-index">01 <span>/</span> PEOPLE BEHIND THE CHAIR</p>
        </div>
        {loading && <p className="info-panel">Loading the team...</p>}
        {error && <div className="info-panel info-error" role="alert"><span>{error}</span><button className="text-button" onClick={loadBarbers} type="button">Try again</button></div>}
        {!loading && !error && availableBarbers.length === 0 && <p className="info-panel">The team is being updated. Please check back soon.</p>}
        {!loading && !error && availableBarbers.length > 0 && <div className="team-carousel-layout">
          <div className="team-carousel-stage">
            <CircularCarousel
              items={teamItems}
              preset="cylinder"
              intro="rise"
              cardWidth={280}
              aspectRatio={1}
              speed={14}
              captions={false}
              gap={25}
              tilt={-5}
              curve={1}
              perspective={2500}
              autoplay="drift"
              interval={3}
              direction="left"
              momentum={0.6}
              snap
              pauseOnHover
              focusOnClick
              draggable
              parallax={0.3}
              stretch={0.5}
              fadeColor="#000000"
              depthFade={0.55}
              innerShade={0.6}
              cornerRadius={12}
              onChange={setActiveBarberIndex}
              ariaLabel="Gupfit barbers"
            />
          </div>
          {activeBarber && <div className="team-carousel-caption" aria-live="polite">
            <span>BARBER {String((activeBarberIndex % availableBarbers.length) + 1).padStart(2, '0')} / {String(availableBarbers.length).padStart(2, '0')}</span>
            <h3>{activeBarber.name}</h3>
            {activeBarber.bio && <p>{activeBarber.bio}</p>}
          </div>}
        </div>}
      </section>

      <section className="location-section home-stack-card" id="location" data-stack-card aria-labelledby="location-title">
        <div className="location-panel">
          <p className="eyebrow">GUPFIT BARBERSHOP</p>
          <h2 id="location-title">Find us.</h2>
          <p>Get directions to the shop.</p>
          <a className="primary-link" href="https://www.google.com/maps/dir/?api=1&destination=14.487657676218227%2C120.90293397420717" rel="noreferrer" target="_blank">Open in Google Maps <span aria-hidden="true">&#8599;</span></a>
        </div>
        <div className="location-map-frame">
          <iframe title="Map showing the Gupfit barbershop location" src="https://maps.google.com/maps?q=14.487657676218227%2C120.90293397420717&z=17&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
        </div>
      </section>
      </div>

      <SiteFooter />
    </main>
  )
}
