# InvoiceQueen

> Premium invoicing SaaS — create professional invoices, track payments, get paid faster.

**Live site:** https://invoicequeen.com
**Repo:** https://github.com/asad-ch321/invoicequeen

---

## 🎯 What this is

A modern, production-ready invoicing SaaS for freelancers and small businesses. Built with React + TypeScript + Supabase, deployed on Vercel. Includes a polished public marketing landing page and a fully-featured authenticated app.

### Features

- **Public marketing landing** — Hero, Features, Pricing, FAQ, CTA — all responsive
- **Email/password auth** via Supabase (with Resend SMTP for transactional emails)
- **Dashboard** with revenue stats, monthly chart, status pie, top clients
- **Invoices** — create / edit / delete, line items with auto-total, tax, discount, due date
- **120+ currencies** with correct symbols throughout the app and PDF
- **Professional PDF export** — embedded business logo, structured Bill To / line items / totals
- **Clients** — full CRUD plus client detail page with invoice history
- **Recurring invoices** — templates with frequency, pause/resume
- **Payments** — record full or partial payments
- **Reports** — monthly revenue + revenue by client + CSV export
- **Business branding** — upload logo, set business name / address / phone / email (stored in Supabase Storage)
- **Settings** — business profile, invoice defaults (currency, tax, prefix, notes)
- **Dark mode** with `localStorage` persistence
- **Legal pages** — Privacy Policy and Terms of Service

---

## 🛠️ Tech stack

| Layer | Tool |
|-------|------|
| Frontend | React 19 + TypeScript + Vite |
| Routing | React Router v7 |
| Database, Auth, Storage | Supabase (PostgreSQL with Row Level Security) |
| Hosting | Vercel (with SPA rewrite for client-side routing) |
| Email | Resend SMTP (configured in Supabase Auth) |
| Charts | Recharts |
| PDF | jsPDF + jspdf-autotable |
| Icons | lucide-react |

---

## 📦 Project structure

```
src/
├── App.tsx                      # Routes (public + protected)
├── main.tsx                     # Entry point
├── index.css                    # Global app styles
├── components/
│   ├── Layout.tsx               # App shell (sidebar + main)
│   ├── Sidebar.tsx              # Left nav for the authenticated app
│   ├── ProtectedRoute.tsx       # Redirects to /login if not signed in
│   ├── StatusBadge.tsx          # Invoice status pill
│   └── CurrencySelect.tsx       # Currency dropdown (uses /lib/currencies.ts)
├── contexts/
│   ├── AuthContext.tsx          # Supabase auth (signIn / signUp / signOut)
│   └── ThemeContext.tsx         # Light/dark mode toggle
├── hooks/
│   └── useBusinessProfile.ts    # Fetches the user's business_profiles row
├── lib/
│   ├── supabase.ts              # Supabase client (reads VITE_SUPABASE_ANON_KEY)
│   └── currencies.ts            # 120+ ISO 4217 currencies + formatMoney()
├── pages/
│   ├── LandingPage.tsx          # Public marketing site (/)
│   ├── LegalPage.tsx            # Privacy + Terms (/privacy, /terms)
│   ├── Login.tsx                # /login and /signup (also "check your email" screen)
│   ├── Dashboard.tsx            # /app
│   ├── Invoices.tsx             # /app/invoices (list)
│   ├── InvoiceForm.tsx          # /app/invoices/new and /app/invoices/:id (edit + PDF)
│   ├── Clients.tsx              # /app/clients
│   ├── ClientDetail.tsx         # /app/clients/:id
│   ├── RecurringInvoices.tsx    # /app/recurring
│   ├── Payments.tsx             # /app/payments
│   ├── Reports.tsx              # /app/reports + CSV export
│   └── Settings.tsx             # /app/settings (business profile + invoice defaults)
├── styles/
│   └── landing.css              # Landing + legal pages CSS (scoped under .lp)
└── types/
    └── database.ts              # Shared TypeScript interfaces
```

---

## 🚀 Getting started

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works)
- A Resend account for outbound email (free tier: 3,000 emails/month)

### 1. Clone and install

```bash
git clone https://github.com/asad-ch321/invoicequeen.git
cd invoicequeen
npm install
```

### 2. Environment variables

Create `.env` in the project root:

```env
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI...
```

The Supabase URL is hardcoded in `src/lib/supabase.ts` — replace it with your own project URL if you fork:

```ts
const supabaseUrl = 'https://YOUR_PROJECT_REF.supabase.co';
```

### 3. Supabase setup

You need 4 public tables, 1 storage bucket, and Row Level Security policies on all of them.

#### Tables

- `clients` — `id`, `user_id`, `name`, `email`, `phone`, `company`, `address`, `notes`
- `invoices` — `id`, `user_id`, `client_id`, `invoice_number`, `status`, `issue_date`, `due_date`, `currency`, `subtotal`, `tax_rate`, `tax_amount`, `discount`, `total`, `notes`, `payment_link`, `paid_at`
- `invoice_items` — `id`, `invoice_id`, `description`, `quantity`, `unit_price`, `amount`, `position`
- `recurring_invoices` — `id`, `user_id`, `client_id`, `template_name`, `frequency`, `next_run_date`, `currency`, `line_items` (jsonb), `tax_rate`, `discount`, `notes`, `active`
- `business_profiles` — `id`, `user_id` (unique), `business_name`, `email`, `phone`, `address`, `logo_url`

All tables: `user_id` foreign key to `auth.users(id)`. Enable RLS, add policies so `auth.uid() = user_id` for SELECT / INSERT / UPDATE / DELETE.

#### Storage

Bucket: `logos` (public read). Storage policies allow authenticated users to upload / update / delete files under `{user_id}/...`.

> A complete migration is in `business_profiles` migration history in your Supabase project. If you fork into a new project, recreate using SQL Editor.

### 4. Resend (transactional email)

1. Sign up at [resend.com](https://resend.com), verify your domain (3 DNS records).
2. Generate an API key (it starts with `re_...`).
3. In Supabase → Authentication → SMTP Settings, enable Custom SMTP:
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: _your Resend API key_
   - Sender email: `noreply@yourdomain.com`
   - Sender name: `InvoiceQueen` (or your brand)

### 5. Supabase Auth URLs

In Supabase → Authentication → URL Configuration:
- **Site URL:** `https://yourdomain.com`
- **Redirect URLs:**
  ```
  https://yourdomain.com/**
  https://yourproject.vercel.app/**
  http://localhost:5174/**
  ```

### 6. Run locally

```bash
npm run dev     # http://localhost:5174
npm run build   # production build
npm run preview # preview production build locally
```

### 7. Deploy to Vercel

```bash
# One-time: connect repo to Vercel via vercel.com dashboard
# Then every git push to main auto-deploys.
```

A `vercel.json` is included with a SPA rewrite — every URL falls back to `index.html` so React Router handles routing.

Add `VITE_SUPABASE_ANON_KEY` as a Vercel environment variable.

---

## 🎨 Customisation

### Branding the landing page

- Logo / name: `src/pages/LandingPage.tsx` (Navbar, Footer)
- Colors: `src/styles/landing.css` (`.lp` CSS variables at the top)
- Hero copy and CTAs: `Hero()` component
- Pricing plans + features: `plans` array
- Stats: `stats` array (in the Stats section)
- FAQ items: `faqs` array

### Branding the authenticated app

- Sidebar logo / nav: `src/components/Sidebar.tsx`
- Theme colors: `src/index.css` (CSS variables at the top)
- Business name + logo: each user sets their own from `/app/settings`

### Currencies

`src/lib/currencies.ts` ships with 120+ currencies. Add more by appending to the `currencies` array.

---

## 🗺️ Roadmap (intentionally unfinished — easy buyer wins)

The product is solid but a few revenue / polish items are intentionally left for the buyer to wire up the way they prefer. Each item below has the UI already built — only the backend needs plugging in:

### 💳 Stripe — SaaS subscription billing (~3 hours)
Landing pricing cards already render Free / Pro / Business and CTAs point at `/signup`. To turn the Pro and Business CTAs into real subscriptions:

1. Create Stripe products + prices ($12/mo Pro, $25/mo Business — or your own).
2. Add a `plan` column to `auth.users` (or a separate `subscriptions` table).
3. Replace the "Start Free Trial" links in `src/pages/LandingPage.tsx` → `plans` array with a `<Link to="/app/checkout?plan=pro">` flow.
4. Build a tiny Stripe Checkout redirect (Supabase Edge Function or a Next-style API route on Vercel).
5. Add a Stripe webhook → Edge Function that updates the user's plan on `checkout.session.completed` and `customer.subscription.updated/deleted`.
6. Enforce plan limits in the app (e.g. block invoice creation on Free after 5/month). The Free plan already advertises "5 invoices / month" — add a count check in `InvoiceForm` save handler.

### 💸 Invoice payment links (~2 hours)
The Business plan advertises "Payment links (Stripe/PayPal)" and the `invoices.payment_link` column already exists. To wire it up:

1. Add a "Generate Payment Link" button to `InvoiceForm.tsx`.
2. On click, call a Stripe Edge Function that creates a Payment Link for the invoice total + currency.
3. Store the returned URL in `invoices.payment_link` and show it as a copy-able QR / link.
4. Add a Stripe webhook for `checkout.session.completed` → mark invoice `status='paid'` and set `paid_at`.

> **Note on Stripe Connect**: if each of your tenants needs to receive money into their OWN Stripe account (true marketplace model), you need Stripe Connect (more work). For a single-platform model where YOU receive all payments and pay out separately, regular Stripe is enough.

### ✉️ "Send invoice" email (~1 hour)
`InvoiceForm.tsx` has a Send button in the toolbar that currently does nothing. Plug it in:

1. Build a Supabase Edge Function `send-invoice` that takes the invoice ID.
2. The function loads the invoice + client + business profile, generates the PDF (server-side or attaches the link), and uses Resend (whose API key is already in Supabase SMTP) to email the client.
3. Update the button onClick to call the function.

### ⏰ Late-payment reminders (~1 hour)
The Business plan promises this. To deliver:

1. Build a Supabase Edge Function `send-reminders` that finds invoices where `due_date < CURRENT_DATE` and `status = 'unpaid'`.
2. Send a reminder email via Resend for each.
3. Schedule with Supabase cron (pg_cron) to run daily.

### 🔒 Minor security hardening (~5 min each)
- **Tighter Storage RLS on `logos` bucket** — public read works fine for logo URLs; lock down LIST if you want (see Supabase advisors).
- **HaveIBeenPwned password check** — toggle in Supabase Auth settings.

---

## 🔐 Security notes

- All five tables have Row Level Security enabled with `auth.uid() = user_id` policies.
- `logos` storage bucket is public for read (so `<img src>` works without signed URLs) but locked down for writes — each user can only upload under their own `{user_id}/` prefix.
- Passwords are hashed by Supabase Auth (bcrypt). Plain passwords never touch the database.
- Resend SMTP uses port 465 with TLS.
- Supabase anon key is safe to ship in the client bundle (that's its purpose); the `service_role` key must NEVER appear in the repo.

---

## 📄 Licence

Proprietary. All rights reserved.

---

## 📧 Support / handover

For questions during handover, contact: **hello@invoicequeen.com**
