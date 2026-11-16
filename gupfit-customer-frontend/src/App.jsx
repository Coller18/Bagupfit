import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { API_BASE_URL, apiRequest } from './api.js'
import brandLogo from './logo-white.png'
import heroVideo from './hero.mp4'
import ScrollStack, { ScrollStackItem } from './ScrollStack.jsx'
import SiteFooter from './SiteFooter.jsx'
import CustomerNav from './CustomerNav.jsx'
import DecayCard from './DecayCard.jsx'
import { supabase } from './supabase.js'
import './App.css'

const MicroSlats = lazy(() => import('./MicroSlats.jsx'))

export default function App() {
  const [works, setWorks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [customerSession, setCustomerSession] = useState(null)
  const [authResolved, setAuthResolved] = useState(false)

  const loadWorks = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setWorks(await apiRequest('/api/works/featured/'))
    } catch (requestError) {
      setError(requestError.message || `Could not connect to ${API_BASE_URL}.`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadWorks() }, [loadWorks])

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

  return (
    <main className="customer-home">
      <ScrollStack
        className="home-scroll-stack"
        useWindowScroll
        itemDistance={80}
        itemStackDistance={24}
        stackPosition={0}
        itemScale={0.04}
        baseScale={0.92}
        dimAmount={0.16}
        holdDistance={120}
      >
      <ScrollStackItem itemClassName="home-stack-panel home-stack-panel--hero">
      <section className="hero" id="home">
        <header className="site-header">
          <CustomerNav session={customerSession} showLogin active="home" />
        </header>
        <video className="hero-video" autoPlay muted loop playsInline aria-hidden="true" tabIndex={-1}>
          <source src={heroVideo} type="video/mp4" />
        </video>
        <div className="hero-video-overlay" />
        <Suspense fallback={null}>
          <MicroSlats
            className="hero-micro-slats"
            preset="swell"
            color="#050505"
            glintColor="#e69d00"
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
            <h1 className="hero-tagline">Book your time.<br /><span>Be on time.</span></h1>
            <a className="primary-link" href="/account?mode=login&next=%2Fbooking">Book an appointment</a>
          </div>
        </div>
      </section>
      </ScrollStackItem>

      <ScrollStackItem itemClassName="home-stack-panel home-stack-panel--work">
      <section className="team-section content-section work-section" id="work">
        <div className="section-heading">
          <div><p className="eyebrow">GUPFIT CUTS</p><h2>Featured haircuts.</h2></div>
          <a className="section-index featured-work-link" href="/works">VIEW ALL WORK <span aria-hidden="true">&#8599;</span></a>
        </div>
        {loading && <p className="info-panel">Loading haircut photos...</p>}
        {error && <div className="info-panel info-error" role="alert"><span>{error}</span><button className="text-button" onClick={loadWorks} type="button">Try again</button></div>}
        {!loading && !error && works.length === 0 && <p className="info-panel">Featured haircut photos will appear here soon.</p>}
        {!loading && !error && works.length > 0 && <div className="work-gallery">
          {works.map((work, index) => <article className="work-gallery-card" key={work.id}>
            <DecayCard
              alt={work.title ? `${work.title} haircut` : `Gupfit haircut ${index + 1}`}
              className="featured-work-decay-card"
              detail={5}
              flow={0}
              grain={0.25}
              height={400}
              hoverDecay={0.05}
              idle={0.35}
              image={work.image_url}
              intensity={0.5}
              pattern={index + 4}
              radius={0}
              recovery={0.6}
              scope="card"
              sensitivity={0.5}
              tilt={10}
              travel={50}
              width={300}
            >
              {work.title && <h3>{work.title}</h3>}
              {work.description && <p>{work.description}</p>}
            </DecayCard>
          </article>)}
        </div>}
      </section>
      </ScrollStackItem>

      <ScrollStackItem itemClassName="home-stack-panel home-stack-panel--location">
      <section className="location-section" id="location" aria-labelledby="location-title">
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
      </ScrollStackItem>
      </ScrollStack>

      <SiteFooter />
    </main>
  )
}
