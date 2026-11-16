import brandLogo from './logo-white.png'

// Fill these with the shop's confirmed public contact details.
const shop = {
  facebookUrl: '',
  instagramUrl: '',
  phone: '',
  email: 'collerrefuerzo@gmail.com',
  address: 'Open in Google Maps',
  mapUrl: 'https://www.google.com/maps/dir/?api=1&destination=14.487657676218227%2C120.90293397420717',
}

function SocialIcon({ label }) {
  if (label === 'Facebook') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.2v2.2H7.7V13h2.7v8h3.1Z" /></svg>
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" /><circle cx="12" cy="12" r="4.1" /><circle className="social-icon-dot" cx="17.6" cy="6.7" r="1" /></svg>
}

function SocialItem({ label, href }) {
  const content = <><span className={`social-icon social-icon-${label.toLowerCase()}`}><SocialIcon label={label} /></span><span className="social-item-copy">{label}{!href && <small>Link to be added</small>}</span>{href && <span aria-hidden="true">&#8599;</span>}</>
  return href
    ? <a aria-label={`Visit Gupfit on ${label}`} className="social-item" href={href} target="_blank" rel="noreferrer">{content}</a>
    : <span aria-label={`${label} link to be added`} className="social-item footer-detail-pending">{content}</span>
}

export default function SiteFooter() {
  return (
    <footer className="site-footer site-footer-expanded">
      <div className="site-footer-main">
        <div className="site-footer-brand">
          <a className="brand" href="/" aria-label="Gupfit home"><img className="site-logo site-logo-footer" src={brandLogo} alt="Gupfit" /></a>
          <p>Make time for yourself.</p>
        </div>
        <div className="site-footer-column">
          <h2>Explore</h2>
          <a href="/works">Works</a>
          <a href="/">Home</a>
        </div>
        <div className="site-footer-column">
          <h2>Follow us</h2>
          <SocialItem label="Facebook" href={shop.facebookUrl} />
          <SocialItem label="Instagram" href={shop.instagramUrl} />
        </div>
        <div className="site-footer-column">
          <h2>Contact</h2>
          {shop.phone ? <a href={`tel:${shop.phone}`}>{shop.phone}</a> : <span className="footer-detail-pending">Phone number to be added</span>}
          {shop.email ? <a href={`mailto:${shop.email}`}>{shop.email}</a> : <span className="footer-detail-pending">Email to be added</span>}
          <a href="/privacy">Privacy policy</a>
        </div>
        <div className="site-footer-column">
          <h2>Visit the shop</h2>
          {shop.address
            ? shop.mapUrl
              ? <a href={shop.mapUrl} target="_blank" rel="noreferrer">{shop.address}<span aria-hidden="true">&#8599;</span></a>
              : <span>{shop.address}</span>
            : <span className="footer-detail-pending">Shop location to be added</span>}
        </div>
      </div>
      <div className="site-footer-bottom"><span>© {new Date().getFullYear()} Gupfit</span></div>
    </footer>
  )
}
