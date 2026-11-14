import { useEffect, useState } from 'react'
import { API_BASE_URL, apiRequest } from './api.js'
import brandLogo from './logo-white.png'
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
          <p className="section-index">THE FULL COLLECTION</p>
        </div>
        {loading && <p className="info-panel">Loading haircut photos...</p>}
        {error && <p className="info-panel info-error" role="alert">{error}</p>}
        {!loading && !error && works.length === 0 && <p className="info-panel">Haircut photos will appear here soon.</p>}
        {!loading && !error && works.length > 0 && <div className="work-gallery">
          {works.map((work, index) => <article className="work-gallery-card" key={work.id}>
            <img src={work.image_url} alt={work.title ? `${work.title} haircut` : `Gupfit haircut ${index + 1}`} loading="eager" decoding="async" />
            {(work.title || work.description) && <div className="work-gallery-copy">
              {work.title && <h3>{work.title}</h3>}
              {work.description && <p>{work.description}</p>}
            </div>}
          </article>)}
        </div>}
      </section>
      <SiteFooter />
    </main>
  )
}
