import { Link } from 'react-router-dom';
import { Crown, ArrowLeft } from 'lucide-react';
import '../styles/landing.css';

interface Props {
  title: string;
  effective: string;
  children: React.ReactNode;
}

export function LegalLayout({ title, effective, children }: Props) {
  return (
    <div className="lp">
      <header className="lp-nav lp-nav-solid">
        <div className="lp-container lp-nav-inner">
          <Link to="/" className="lp-logo">
            <Crown size={26} className="lp-logo-icon" />
            <span>InvoiceQueen</span>
          </Link>
          <Link to="/" className="lp-btn lp-btn-ghost">
            <ArrowLeft size={16} /> Back to home
          </Link>
        </div>
      </header>

      <main className="legal-page">
        <div className="lp-container legal-container">
          <h1>{title}</h1>
          <p className="legal-effective">Last updated: {effective}</p>
          <div className="legal-content">{children}</div>
        </div>
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <Link to="/" className="lp-logo">
            <Crown size={24} className="lp-logo-icon" />
            <span>InvoiceQueen</span>
          </Link>
          <nav className="lp-footer-links">
            <Link to="/">Home</Link>
            <Link to="/login">Login</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </nav>
          <p className="lp-copy">© 2026 InvoiceQueen. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" effective="June 2026">
      <p>
        InvoiceQueen ("we", "us", or "our") respects your privacy. This Privacy Policy explains
        what information we collect, how we use it, and the choices you have. By using
        InvoiceQueen, you agree to the terms described below.
      </p>

      <h2>1. Information we collect</h2>
      <p>We collect only what we need to provide and improve the service:</p>
      <ul>
        <li><strong>Account information</strong> — your email address and an encrypted password when you sign up.</li>
        <li><strong>Business profile</strong> — business name, contact details, address, and an optional logo image you upload.</li>
        <li><strong>Customer and invoice data</strong> — clients, invoices, line items, payment statuses, and notes you create inside the app.</li>
        <li><strong>Usage data</strong> — basic technical logs (IP address, browser, pages visited) used to keep the service running and secure.</li>
      </ul>

      <h2>2. How we use your information</h2>
      <ul>
        <li>To create and maintain your account and let you sign in.</li>
        <li>To save and display invoices, clients, and business branding inside your account.</li>
        <li>To send transactional emails such as sign-up confirmation and password reset.</li>
        <li>To diagnose problems, prevent abuse, and improve the product.</li>
      </ul>
      <p>We do <strong>not</strong> sell your data and we do not use it for advertising.</p>

      <h2>3. How we store and protect your data</h2>
      <p>
        Your data is stored in Supabase (PostgreSQL) with Row Level Security enabled, meaning
        each account can only read and write its own rows. Logo files are stored in Supabase
        Storage. Connections are encrypted using TLS. Passwords are hashed and never stored in
        plaintext.
      </p>

      <h2>4. Third-party services</h2>
      <p>We use the following providers strictly to run the service:</p>
      <ul>
        <li><strong>Supabase</strong> — database, authentication, and storage.</li>
        <li><strong>Vercel</strong> — application hosting and CDN.</li>
        <li><strong>Resend</strong> — outbound transactional email (sign-up confirmation, password reset).</li>
      </ul>
      <p>Each provider has its own privacy policy and we recommend reviewing them.</p>

      <h2>5. Your rights and choices</h2>
      <ul>
        <li>You can view and edit your business profile, clients, and invoices at any time from the Settings page.</li>
        <li>You can delete invoices, clients, and your logo from inside the app.</li>
        <li>To delete your entire account and all associated data, contact us at the email below.</li>
      </ul>

      <h2>6. Cookies</h2>
      <p>
        We use a minimal session cookie issued by Supabase Auth to keep you signed in. We do
        not use third-party advertising or tracking cookies.
      </p>

      <h2>7. Data retention</h2>
      <p>
        We retain your data for as long as your account is active. If you request deletion, we
        will remove your data within 30 days, except where retention is required by law.
      </p>

      <h2>8. Children's privacy</h2>
      <p>
        InvoiceQueen is not directed at anyone under 16. We do not knowingly collect personal
        information from children.
      </p>

      <h2>9. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. The "Last updated" date at the
        top reflects the most recent revision.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about this policy? Email us at{' '}
        <a href="mailto:hello@invoicequeen.com">hello@invoicequeen.com</a>.
      </p>
    </LegalLayout>
  );
}

export function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" effective="June 2026">
      <p>
        These Terms of Service ("Terms") govern your use of InvoiceQueen ("the Service"). By
        creating an account or using the Service, you agree to these Terms. If you do not
        agree, do not use the Service.
      </p>

      <h2>1. The service</h2>
      <p>
        InvoiceQueen is a web-based invoicing tool that lets you create, send, and track
        invoices for your business and customers.
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li>You must be at least 16 years old to create an account.</li>
        <li>You are responsible for keeping your password secure and for any activity under your account.</li>
        <li>You agree to provide accurate information when signing up.</li>
      </ul>

      <h2>3. Acceptable use</h2>
      <p>You agree not to use the Service to:</p>
      <ul>
        <li>Send fraudulent invoices, fake bills, or any content that violates the law.</li>
        <li>Upload illegal, infringing, or harmful content.</li>
        <li>Attempt to break, reverse-engineer, or disrupt the Service.</li>
        <li>Use the Service to send spam, phishing, or malicious links.</li>
      </ul>

      <h2>4. Your content</h2>
      <p>
        You retain ownership of all data, invoices, and content you create inside InvoiceQueen.
        You grant us a limited licence to host, display, and process your content solely for
        the purpose of providing the Service to you.
      </p>

      <h2>5. Payment and plans</h2>
      <p>
        InvoiceQueen offers Free, Pro, and Business plans. Paid plans are billed monthly in
        advance. You can cancel at any time; cancellation takes effect at the end of the current
        billing period. Pricing may change with at least 30 days' notice.
      </p>

      <h2>6. Service availability</h2>
      <p>
        We aim for high availability but the Service is provided "as is" without uptime
        guarantees beyond what infrastructure providers (Supabase, Vercel) offer. We may
        perform maintenance and updates as needed.
      </p>

      <h2>7. Termination</h2>
      <p>
        You may delete your account at any time. We may suspend or terminate accounts that
        violate these Terms, abuse the Service, or attempt to harm other users.
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        InvoiceQueen is not an accountant, tax adviser, or financial professional. Invoices and
        reports generated by the Service are tools only — you are responsible for ensuring your
        records comply with the laws and tax rules in your jurisdiction.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, InvoiceQueen and its operators are not liable
        for any indirect, incidental, or consequential damages arising out of your use of the
        Service. Our total liability for any claim is limited to the amount you paid for the
        Service in the 12 months before the claim.
      </p>

      <h2>10. Changes to these terms</h2>
      <p>
        We may revise these Terms. If we make material changes, we'll notify you by email or in
        the app. Continued use of the Service after changes means you accept the new Terms.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These Terms are governed by the laws of the jurisdiction in which the Service is
        operated. Any disputes will be handled in the appropriate courts of that jurisdiction.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these Terms? Email{' '}
        <a href="mailto:hello@invoicequeen.com">hello@invoicequeen.com</a>.
      </p>
    </LegalLayout>
  );
}
