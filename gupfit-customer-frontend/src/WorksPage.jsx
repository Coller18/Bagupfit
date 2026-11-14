import { useEffect, useState } from 'react'
import { API_BASE_URL, apiRequest } from './api.js'
import brandLogo from './logo-white.png'
import FlexCarousel from './FlexCarousel.jsx'
import SiteFooter from './SiteFooter.jsx'
import './App.css'

export default function WorksPage() {
  const [works, setWorks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    apiRequest('/api/works/')
      .then((data) => { if (active) setWorks(data) })
      .catch((requestError) => { if (active) setError(requestError.message || `Could not connect to ${API_BASE_URL}.`) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const carouselItems = works.map((work, index) => ({
    src: work.image_url,
    alt: work.title ? `${work.title} haircut` : `Gupfit haircut ${index + 1}`,
    title: work.title || `Gupfit haircut ${index + 1}`,
  }))

  return (
    <main className="works-page">
      <header className="site-header">
        <a className="works-page-brand" href="/" aria-label="Gupfit home"><img src={brandLogo} alt="Gupfit" /></a>
        <nav className="site-nav" aria-label="Main navigation">
          <a href="/">Home</a>
          <a className="nav-cta" href="/account?mode=login&next=%2Fbooking">Book an appointment</a>
        </nav>
      </header>

      <section className="works-page-content" aria-labelledby="works-page-title">
        <div className="section-heading">
          <div><p className="eyebrow">THE GUPFIT PORTFOLIO</p><h1 id="works-page-title">All haircuts.</h1></div>
          <p className="section-index">THE FULL COLLECTION <span aria-hidden="true">&#183;</span> DRAG OR SCROLL TO EXPLORE</p>
        </div>
        {loading && <p className="info-panel">Loading haircut photos...</p>}
        {error && <p className="info-panel info-error" role="alert">{error}</p>}
        {!loading && !error && works.length === 0 && <p className="info-panel">Haircut photos will appear here soon.</p>}
        {!loading && !error && carouselItems.length > 0 && <div className="works-carousel-frame">
          <FlexCarousel
            items={carouselItems}
            ariaLabel="Gupfit haircut gallery"
            preset="liquid"
            intro="rise"
            cardHeight={0.37}
            gap={12}
            squeeze={0.2}
            focusOnClick
            captions
            fit="natural"
            radius={0}
            lensWidth={0.74}
            lensHeight={1.18}
            tilt={62}
            roundness={1}
            bend={0.34}
            reach={0.38}
            curl="twist"
            dispersion={0.45}
            liquid={0}
            followCursor={false}
            autoplay={false}
            interval={4}
            captureWheel
          />
        </div>}
      </section>
      <SiteFooter />
    </main>
  )
}
