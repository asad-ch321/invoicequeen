import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Crown, FileText, Users, CheckCircle2, Palette, RefreshCw, CreditCard,
  Menu, X, ChevronDown, Check, ArrowRight, Zap, Star, Quote
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/landing.css';

/* ---------- Scroll reveal hook ---------- */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('reveal-in');
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

/* ---------- Navbar ---------- */
function Navbar() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`lp-nav ${scrolled ? 'lp-nav-solid' : ''}`}>
      <div className="lp-container lp-nav-inner">
        <Link to="/" className="lp-logo">
          <Crown size={26} className="lp-logo-icon" />
          <span>InvoiceQueen</span>
        </Link>

        <nav className="lp-nav-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>

        <div className="lp-nav-actions">
          {user ? (
            <Link to="/app" className="lp-btn lp-btn-primary">Go to Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="lp-btn lp-btn-ghost">Login</Link>
              <Link to="/signup" className="lp-btn lp-btn-primary">Get Started Free</Link>
            </>
          )}
        </div>

        <button className="lp-menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {menuOpen && (
        <div className="lp-mobile-menu">
          <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
          <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
          {user ? (
            <Link to="/app" className="lp-btn lp-btn-primary lp-btn-full">Go to Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="lp-btn lp-btn-ghost lp-btn-full">Login</Link>
              <Link to="/signup" className="lp-btn lp-btn-primary lp-btn-full">Get Started Free</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section className="lp-hero">
      <div className="lp-hero-bg" />
      <div className="lp-container lp-hero-inner">
        <div className="lp-hero-text reveal">
          <div className="lp-badge"><Zap size={14} /> Get paid 2x faster</div>
          <h1>Invoicing made<br /><span className="lp-gradient-text">effortless.</span></h1>
          <p>
            Create professional invoices in seconds, track payments in real time,
            and get paid faster — all from one beautiful dashboard built for modern businesses.
          </p>
          <div className="lp-hero-cta">
            <Link to="/signup" className="lp-btn lp-btn-primary lp-btn-lg">
              Start Free — No Card Required <ArrowRight size={18} />
            </Link>
            <a href="#how" className="lp-btn lp-btn-outline lp-btn-lg">See How It Works</a>
          </div>
          <p className="lp-hero-note">Free forever plan • No credit card • Cancel anytime</p>
        </div>

        {/* Fake dashboard / invoice mockup */}
        <div className="lp-hero-mockup reveal">
          <div className="lp-mockup-card">
            <div className="lp-mockup-head">
              <div className="lp-mockup-brand">
                <div className="lp-mockup-logo">AQ</div>
                <div>
                  <div className="lp-mockup-title">Asad Design Studio</div>
                  <div className="lp-mockup-sub">invoice #INV-085413</div>
                </div>
              </div>
              <span className="lp-mockup-status">PAID</span>
            </div>
            <div className="lp-mockup-rows">
              <div className="lp-mockup-row"><span>Web Development</span><span>$200.00</span></div>
              <div className="lp-mockup-row"><span>SEO Optimization</span><span>$150.00</span></div>
              <div className="lp-mockup-row lp-mockup-muted"><span>Tax (10%)</span><span>$35.00</span></div>
            </div>
            <div className="lp-mockup-total">
              <span>Total</span><span>$385.00</span>
            </div>
          </div>
          <div className="lp-mockup-float lp-float-1">
            <CheckCircle2 size={18} /> Payment received
          </div>
          <div className="lp-mockup-float lp-float-2">
            <FileText size={18} /> Invoice sent
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Trusted by (logo strip) ---------- */
const trustedLogos = ['Acme Co', 'Northwind', 'Globex', 'Umbrella', 'Initech', 'Hooli'];

function TrustedBy() {
  return (
    <section className="lp-trusted">
      <div className="lp-container">
        <p className="lp-trusted-label reveal">Trusted by 2,000+ freelancers & growing businesses</p>
        <div className="lp-trusted-logos reveal">
          {trustedLogos.map(name => (
            <span className="lp-trusted-logo" key={name}>{name}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Stats band ---------- */
const stats = [
  { value: '50K+', label: 'Invoices created' },
  { value: '$8M+', label: 'Payments processed' },
  { value: '2,000+', label: 'Happy businesses' },
  { value: '99.9%', label: 'Uptime' },
];

function Stats() {
  return (
    <section className="lp-stats">
      <div className="lp-container lp-stats-grid">
        {stats.map((s, i) => (
          <div className="lp-stat reveal" key={s.label} style={{ transitionDelay: `${i * 70}ms` }}>
            <div className="lp-stat-value">{s.value}</div>
            <div className="lp-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Testimonials ---------- */
const testimonials = [
  {
    quote: 'InvoiceQueen cut my invoicing time from hours to minutes. My clients love the clean PDFs and I get paid way faster now.',
    name: 'Sarah Malik', role: 'Freelance Designer', initials: 'SM',
  },
  {
    quote: 'The recurring invoices and payment tracking are game changers. I finally have a clear view of who owes me what.',
    name: 'Daniel Reyes', role: 'Agency Owner', initials: 'DR',
  },
  {
    quote: 'Custom branding made my invoices look so professional. It feels like an enterprise tool but it’s effortless to use.',
    name: 'Aisha Khan', role: 'Marketing Consultant', initials: 'AK',
  },
];

function Testimonials() {
  return (
    <section className="lp-section">
      <div className="lp-container">
        <div className="lp-section-head reveal">
          <h2>Loved by businesses everywhere</h2>
          <p>Don’t just take our word for it — here’s what our users say.</p>
        </div>
        <div className="lp-testi-grid">
          {testimonials.map((t, i) => (
            <div className="lp-testi-card reveal" key={t.name} style={{ transitionDelay: `${i * 70}ms` }}>
              <Quote size={28} className="lp-testi-quote" />
              <div className="lp-testi-stars">
                {Array.from({ length: 5 }).map((_, j) => <Star key={j} size={15} fill="currentColor" />)}
              </div>
              <p className="lp-testi-text">{t.quote}</p>
              <div className="lp-testi-author">
                <div className="lp-testi-avatar">{t.initials}</div>
                <div>
                  <div className="lp-testi-name">{t.name}</div>
                  <div className="lp-testi-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Features ---------- */
const features = [
  { icon: FileText, title: 'Invoice CRUD & PDF Export', desc: 'Create, edit, and export polished PDF invoices in a click.' },
  { icon: Users, title: 'Client Management', desc: 'Keep every client and their invoice history in one place.' },
  { icon: CheckCircle2, title: 'Paid / Unpaid Tracking', desc: 'Know exactly what’s paid, pending, or overdue at a glance.' },
  { icon: Palette, title: 'Custom Branding & Logo', desc: 'Add your logo and business details to every invoice.' },
  { icon: RefreshCw, title: 'Recurring Invoices', desc: 'Automate repeat billing with flexible schedules.' },
  { icon: CreditCard, title: 'Payment Links', desc: 'Accept online payments via Stripe & PayPal.' },
];

function Features() {
  return (
    <section id="features" className="lp-section">
      <div className="lp-container">
        <div className="lp-section-head reveal">
          <h2>Everything you need to get paid</h2>
          <p>Powerful features wrapped in a delightfully simple interface.</p>
        </div>
        <div className="lp-features-grid">
          {features.map((f, i) => (
            <div className="lp-feature-card reveal" key={f.title} style={{ transitionDelay: `${i * 60}ms` }}>
              <div className="lp-feature-icon"><f.icon size={22} /></div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- How it works ---------- */
const steps = [
  { n: '1', title: 'Create your account', desc: 'Sign up free in seconds — no credit card needed.' },
  { n: '2', title: 'Add clients & build invoices', desc: 'Add line items, tax, discounts, and your branding.' },
  { n: '3', title: 'Send & get paid', desc: 'Share the invoice, accept payments, track it all.' },
];

function HowItWorks() {
  return (
    <section id="how" className="lp-section lp-section-alt">
      <div className="lp-container">
        <div className="lp-section-head reveal">
          <h2>How it works</h2>
          <p>From sign-up to paid in three simple steps.</p>
        </div>
        <div className="lp-steps">
          {steps.map((s, i) => (
            <div className="lp-step reveal" key={s.n} style={{ transitionDelay: `${i * 80}ms` }}>
              <div className="lp-step-num">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Pricing ---------- */
const plans = [
  {
    name: 'Free', price: '0', popular: false, cta: 'Get Started', to: '/signup',
    features: ['3 clients', '5 invoices / month', 'Basic templates', 'InvoiceQueen branding'],
  },
  {
    name: 'Pro', price: '12', popular: true, cta: 'Start Free Trial', to: '/signup',
    features: ['Unlimited clients & invoices', 'Custom logo & branding', 'PDF export', 'Recurring invoices', 'All templates'],
  },
  {
    name: 'Business', price: '25', popular: false, cta: 'Start Free Trial', to: '/signup',
    features: ['Everything in Pro', 'Payment links (Stripe/PayPal)', 'Automated late reminders', 'Priority support'],
  },
];

function Pricing() {
  return (
    <section id="pricing" className="lp-section">
      <div className="lp-container">
        <div className="lp-section-head reveal">
          <h2>Simple, transparent pricing</h2>
          <p>Start free. Upgrade when you grow. Cancel anytime.</p>
        </div>
        <div className="lp-pricing-grid">
          {plans.map((p, i) => (
            <div className={`lp-price-card reveal ${p.popular ? 'lp-price-popular' : ''}`} key={p.name} style={{ transitionDelay: `${i * 70}ms` }}>
              {p.popular && <div className="lp-price-tag">Most Popular</div>}
              <h3>{p.name}</h3>
              <div className="lp-price">
                <span className="lp-price-amount">${p.price}</span>
                <span className="lp-price-period">/mo</span>
              </div>
              <ul className="lp-price-features">
                {p.features.map(f => (
                  <li key={f}><Check size={16} /> {f}</li>
                ))}
              </ul>
              <Link to={p.to} className={`lp-btn lp-btn-full ${p.popular ? 'lp-btn-primary' : 'lp-btn-outline'}`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */
const faqs = [
  { q: 'Is there a free plan?', a: 'Yes! Our Free plan lets you manage up to 3 clients and 5 invoices per month — free forever, no credit card required.' },
  { q: 'Do I need a credit card to start?', a: 'No. You can sign up and start creating invoices instantly without entering any payment details.' },
  { q: 'Can I customize invoices with my logo?', a: 'Absolutely. On Pro and Business plans you can add your business logo, contact details, and brand colors to every invoice and PDF.' },
  { q: 'Can I accept online payments?', a: 'Yes — the Business plan includes payment links so your clients can pay you directly via Stripe or PayPal.' },
  { q: 'Can I cancel anytime?', a: 'Of course. There are no long-term contracts. Upgrade, downgrade, or cancel your plan whenever you like.' },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="lp-section lp-section-alt">
      <div className="lp-container lp-faq-container">
        <div className="lp-section-head reveal">
          <h2>Frequently asked questions</h2>
          <p>Everything you need to know before getting started.</p>
        </div>
        <div className="lp-faq-list">
          {faqs.map((f, i) => (
            <div className={`lp-faq-item reveal ${open === i ? 'lp-faq-active' : ''}`} key={f.q}>
              <button className="lp-faq-q" onClick={() => setOpen(open === i ? null : i)}>
                {f.q}
                <ChevronDown size={20} className="lp-faq-chevron" />
              </button>
              <div className="lp-faq-a"><p>{f.a}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- CTA Banner ---------- */
function CTABanner() {
  return (
    <section className="lp-cta-banner">
      <div className="lp-container lp-cta-inner reveal">
        <h2>Ready to get paid faster?</h2>
        <p>Join businesses using InvoiceQueen to send professional invoices and collect payments effortlessly.</p>
        <Link to="/signup" className="lp-btn lp-btn-white lp-btn-lg">
          Start Free <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */
function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-container lp-footer-inner">
        <Link to="/" className="lp-logo">
          <Crown size={24} className="lp-logo-icon" />
          <span>InvoiceQueen</span>
        </Link>
        <nav className="lp-footer-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <Link to="/login">Login</Link>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
        </nav>
        <p className="lp-copy">© 2026 InvoiceQueen. All rights reserved.</p>
      </div>
    </footer>
  );
}

/* ---------- Page ---------- */
export default function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  useReveal();

  return (
    <div className="lp" ref={rootRef}>
      <Navbar />
      <Hero />
      <TrustedBy />
      <Features />
      <HowItWorks />
      <Stats />
      <Pricing />
      <Testimonials />
      <FAQ />
      <CTABanner />
      <Footer />
    </div>
  );
}
