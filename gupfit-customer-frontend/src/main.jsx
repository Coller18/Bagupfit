import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AccountPage from './AccountPage.jsx'
import AccountSettingsPage from './AccountSettingsPage.jsx'
import BookingPage from './BookingPage.jsx'
import DataDeletionPage from './DataDeletionPage.jsx'
import MyBookingsPage from './MyBookingsPage.jsx'
import PrivacyPolicyPage from './PrivacyPolicyPage.jsx'
import WorksPage from './WorksPage.jsx'

const currentPath = window.location.pathname.replace(/\/+$/, '') || '/'
const routePages = {
  '/works': WorksPage,
  '/booking': BookingPage,
  '/account': AccountPage,
  '/account-settings': AccountSettingsPage,
  '/my-bookings': MyBookingsPage,
  '/privacy': PrivacyPolicyPage,
  '/data-deletion': DataDeletionPage,
}
const Page = routePages[currentPath] || App

const pageMetadata = currentPath === '/data-deletion'
  ? {
      title: 'Data Deletion | Gupfit Barbershop',
      description: 'Learn how to request deletion of your Gupfit account and personal information.',
    }
  : currentPath === '/privacy'
    ? {
        title: 'Privacy Policy | Gupfit Barbershop',
        description: 'Read how Gupfit collects, uses, and protects customer information.',
      }
    : currentPath === '/works'
  ? {
      title: 'Haircut Gallery | Gupfit Barbershop',
      description: 'Browse the complete haircut portfolio from Gupfit Barbershop.',
    }
  : {
      title: 'Gupfit Barbershop | Haircuts & Online Booking',
      description: 'Explore featured haircut styles from Gupfit Barbershop and book your appointment online.',
    }
document.title = pageMetadata.title
document.querySelector('meta[name="description"]')?.setAttribute('content', pageMetadata.description)
document.querySelector('meta[property="og:title"]')?.setAttribute('content', pageMetadata.title)
document.querySelector('meta[property="og:description"]')?.setAttribute('content', pageMetadata.description)
document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', pageMetadata.title)
document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', pageMetadata.description)
const canonicalUrl = `https://gupfit.vercel.app${currentPath === '/' ? '/' : currentPath}`
document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonicalUrl)
let canonical = document.querySelector('link[rel="canonical"]')
if (!canonical) {
  canonical = document.createElement('link')
  canonical.rel = 'canonical'
  document.head.append(canonical)
}
canonical.href = canonicalUrl

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Page />
  </StrictMode>,
)
