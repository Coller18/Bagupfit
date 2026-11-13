import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AccountPage from './AccountPage.jsx'
import BookingPage from './BookingPage.jsx'
import MyBookingsPage from './MyBookingsPage.jsx'
import PrivacyPolicyPage from './PrivacyPolicyPage.jsx'

const currentPath = window.location.pathname.replace(/\/+$/, '') || '/'
const Page = currentPath === '/booking'
  ? BookingPage
  : currentPath === '/account'
    ? AccountPage
  : currentPath === '/my-bookings'
    ? MyBookingsPage
    : currentPath === '/privacy'
      ? PrivacyPolicyPage
    : App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Page />
  </StrictMode>,
)
