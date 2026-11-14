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

function SocialItem({ label, href }) {
  return href
    ? <a href={href} target="_blank" rel="noreferrer">{label}<span aria-hidden="true">&#8599;</span></a>
    : <span className="footer-detail-pending">{label} link to be added</span>
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
          <a href="/works">All haircuts</a>
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
