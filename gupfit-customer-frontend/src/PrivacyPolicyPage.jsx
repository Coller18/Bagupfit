import brandLogo from './logo-white.png'
import SiteFooter from './SiteFooter.jsx'
import './App.css'

export default function PrivacyPolicyPage() {
  return (
    <main className="privacy-page">
      <header className="site-header privacy-header">
        <a className="brand" href="/" aria-label="Gupfit home"><img className="site-logo" src={brandLogo} alt="Gupfit" /></a>
        <nav className="site-nav" aria-label="Main navigation">
          <a href="/">Home</a>
          <a className="nav-cta" href="/account?mode=login&next=%2Fbooking">Book a time</a>
        </nav>
      </header>

      <article className="privacy-policy-content">
        <a className="back-link" href="/account?next=%2Fbooking">&#8592; Return to your account</a>
        <p className="eyebrow">GUPFIT CUSTOMER INFORMATION</p>
        <h1>Privacy Policy</h1>
        <p className="privacy-policy-updated">Effective date: November 13, 2026 · Version 1.0</p>
        <p className="privacy-policy-intro">This policy explains how Gupfit collects and uses information when you create an account, book an appointment, or send us a payment receipt through our booking website.</p>

        <section>
          <h2>Who is responsible for your information?</h2>
          <p>Gupfit, the barber shop operating this booking service, is responsible for the personal information described here. You can contact us about this policy or make a privacy request at <a href="mailto:collerrefuerzo@gmail.com">collerrefuerzo@gmail.com</a>.</p>
        </section>

        <section>
          <h2>What information we collect</h2>
          <ul>
            <li><strong>Account details:</strong> your full name, phone number, email address, and account authentication information. Supabase Authentication handles your password; Gupfit does not receive your plain-text password.</li>
            <li><strong>Appointment details:</strong> the barber and time you select, booking status, and information needed to manage your appointment.</li>
            <li><strong>Payment receipt:</strong> the image or document you upload so Gupfit staff can review your payment. It may show transaction details or account information included by your payment app. Please avoid including unrelated personal information.</li>
            <li><strong>Optional hairstyle photo:</strong> if you choose the photo suggestion tool, the photo you submit is used to generate haircut ideas. Gupfit does not save this photo to your account or booking record.</li>
            <li><strong>Service and sign-in information:</strong> the session data needed to keep you signed in. Our service providers may also generate technical logs required to operate and protect their services.</li>
          </ul>
        </section>

        <section>
          <h2>How we use it</h2>
          <p>We use this information to create and secure your account, show appointment availability, create and manage bookings, contact you about your booking, review payment receipts, respond to requests, and meet applicable legal or accounting obligations. We process information based on your consent and as needed to provide the account and booking services you request or meet legal obligations. We do not use booking details to create advertising profiles or make decisions with significant effects solely by automated means.</p>
        </section>

        <section>
          <h2>Who may receive your information</h2>
          <p>Gupfit staff who manage appointments and payments can access information needed for their work. Supabase provides account authentication and database infrastructure; the project is configured in Sydney, Australia (ap-southeast-2). The Gupfit booking backend processes appointment requests and stores uploaded receipts in private storage; its location depends on where that backend is deployed. If you choose the photo suggestion tool, your photo is sent to OpenAI's API for analysis and is not saved in Gupfit's booking storage. OpenAI processes the image under its own terms and <a href="https://openai.com/policies/privacy-policy/" rel="noreferrer" target="_blank">privacy policy</a>. When Telegram notifications are enabled, Telegram receives booking details and the uploaded payment receipt through Gupfit's bot so staff can review new bookings. Customers who choose to connect Telegram will also have their Telegram chat identifier stored so Gupfit can send them booking status updates; the bot receives their Telegram start message to link the account. Telegram processes this information under its own privacy terms. Service providers may process limited operational information in other locations to provide their services. The homepage embeds a Google Map; when it loads, your browser connects to Google and <a href="https://policies.google.com/privacy/embedded" rel="noreferrer" target="_blank">Google's Privacy Policy</a> applies. Payment transactions are handled by the payment service you use; its own privacy policy also applies. We may disclose information where required by law or to protect legal rights and safety.</p>
        </section>

        <section>
          <h2>Storage, security, and retention</h2>
          <p>We use access controls intended to limit account and receipt access to authorized people and services. No online service can guarantee absolute security. We keep information only for as long as needed to provide the service, manage bookings and payment records, resolve disputes, and meet legal obligations. We then delete or de-identify it when reasonably possible, unless the law requires further retention.</p>
          <p>Your browser stores the sign-in session so you can use your account. You can sign out from the booking page or your bookings page to end that session on the device.</p>
        </section>

        <section>
          <h2>Your choices and privacy rights</h2>
          <p>You may ask to access or correct your information, request deletion or blocking, object to certain processing, withdraw consent where processing relies on consent, or request a copy of information where applicable. Some information may need to be retained to complete a booking, resolve a payment issue, or meet a legal obligation. To make a request, email <a href="mailto:collerrefuerzo@gmail.com">collerrefuerzo@gmail.com</a>. You may also contact the Philippine National Privacy Commission through its <a href="https://privacy.gov.ph/data-subject-rights/" rel="noreferrer" target="_blank">data subject rights page</a>.</p>
        </section>

        <section>
          <h2>Updates to this policy</h2>
          <p>We may update this policy when our practices change. We will publish the current version on this page and update its effective date. If a change requires renewed consent, we will ask you before applying it to that processing.</p>
        </section>
      </article>

      <SiteFooter />
    </main>
  )
}
