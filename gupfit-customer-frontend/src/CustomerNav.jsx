import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const links = [
  { label: 'Works', href: '/works', icon: 'works', key: 'works' },
  { label: 'Add', href: '/booking', icon: 'appointment', key: 'appointment' },
  { label: 'Profile', href: '/account-settings', icon: 'profile', key: 'profile' },
]

function NavIcon({ name }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 1.8 }
  if (name === 'profile') return <svg viewBox="0 0 24 24" {...common}><circle cx="12" cy="8" r="3.4" /><path d="M5.5 20c.6-3.3 2.8-5 6.5-5s5.9 1.7 6.5 5" /></svg>
  if (name === 'bookings') return <svg viewBox="0 0 24 24" {...common}><rect x="5" y="4.5" width="14" height="16" rx="2" /><path d="M9 3v3M15 3v3M8.5 10h7M8.5 14h7M8.5 17h4" /></svg>
  if (name === 'appointment') return <svg viewBox="0 0 24 24" {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v10M7 12h10" /></svg>
  return <svg viewBox="0 0 24 24" {...common}><path d="M4 19 19 4M7 4l13 13M4 7l3-3 5 5-3 3M12 12l3-3 5 5-3 3" /></svg>
}

export default function CustomerNav({ session, active, showLogin = false }) {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)')
    const update = () => setMobile(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const visibleLinks = links.map((link) => (
    !session && link.key === 'appointment'
      ? { ...link, href: '/account?mode=login&next=%2Fbooking' }
      : link
  ))

  const nav = (
    <nav className="site-nav" aria-label="Main navigation">
      {visibleLinks.map((link) => (
        <a aria-current={active === link.key ? 'page' : undefined} className={`${link.key === 'appointment' ? 'nav-cta ' : ''}nav-item${active === link.key ? ' nav-item-active' : ''}`} href={link.href} key={link.key}>
          <span className="nav-item-icon" aria-hidden="true"><NavIcon name={link.icon} /></span>
          <span className="nav-item-label">{link.label}</span>
        </a>
      ))}
    </nav>
  )

  return mobile ? createPortal(nav, document.body) : nav
}
