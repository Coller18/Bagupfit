import brandLogo from './logo-white.png'
import SiteFooter from './SiteFooter.jsx'
import CustomerNav from './CustomerNav.jsx'
import './App.css'

export default function DataDeletionPage() {
  return (
    <main className="privacy-page">
      <header className="site-header privacy-header">
        <a className="brand" href="/" aria-label="Gupfit home"><img className="site-logo" src={brandLogo} alt="Gupfit" /></a>
        <CustomerNav showLogin />
      </header>

      <article className="privacy-policy-content">
        <a className="back-link" href="/privacy">&#8592; Back to Privacy Policy</a>
        <p className="eyebrow">GUPFIT CUSTOMER INFORMATION</p>
        <h1>Data deletion.</h1>
        <p className="privacy-policy-updated">How to request deletion of your Gupfit account and personal information</p>

        <section>
          <h2>Request deletion</h2>
          <p>Email <a href="mailto:collerrefuerzo@gmail.com?subject=Gupfit%20data%20deletion%20request">collerrefuerzo@gmail.com</a> with the subject <strong>Gupfit data deletion request</strong>. Send the request from the email address associated with your Gupfit account and tell us that you want your Gupfit account and personal information deleted.</p>
          <p>If you signed in with Facebook, mention that in your request so we can locate the account linked through Facebook. Do not send your password or Facebook login details.</p>
        </section>

        <section>
          <h2>What happens next</h2>
          <p>We will verify that you own the account, then delete or de-identify your account information and associated booking data when reasonably possible. We may retain records that are needed to complete or document a payment, resolve a dispute, or meet a legal obligation, as described in our <a href="/privacy">Privacy Policy</a>.</p>
          <p>Removing Gupfit from Facebook's Apps and Websites settings revokes Facebook access, but does not by itself send Gupfit a deletion request. Please email us to request deletion of information held by Gupfit.</p>
        </section>

        <section>
          <h2>Questions</h2>
          <p>For help with a deletion request, contact <a href="mailto:collerrefuerzo@gmail.com">collerrefuerzo@gmail.com</a>.</p>
        </section>
      </article>

      <SiteFooter />
    </main>
  )
}
