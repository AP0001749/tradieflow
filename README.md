# TradieFlow

**Job management system for Australian tradies** - Track jobs, manage clients, create invoices, and streamline your business operations.

---

## 🚀 Features

### Core Functionality
- **Job Management** - Create, track, and update jobs with detailed information
- **Client Management** - Maintain client database with contact details
- **Invoice Generation** - Create professional invoices with email delivery
- **Dashboard Analytics** - Revenue tracking and business insights
- **Photo Uploads** - Attach job photos for documentation

### Authentication & Security
- Google OAuth integration via Supabase
- Email/password authentication
- Protected routes with middleware
- Secure session management

### Subscription & Payments
- Stripe integration for subscription management
- Free and Pro tier plans
- Customer portal for subscription management
- Webhook handling for payment events

### Marketing & Analytics
- Google Ads conversion tracking (ID: AW-17896188158)
- Revenue analytics and charting
- Subscription status tracking

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Email**: Resend
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Analytics**: Google Ads (gtag.js)

---

## 📦 Getting Started

### Prerequisites
- Node.js 18+ installed
- Supabase account and project
- Stripe account
- Resend account (for emails)
- Google Ads account (optional)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd tradieflow
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env.local` file with the following:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Stripe Price IDs
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=your_monthly_price_id
NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID=your_yearly_price_id

# Resend (Email)
RESEND_API_KEY=your_resend_api_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. **Run database migrations**
```bash
# Install Supabase CLI if needed
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

5. **Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🔧 Development Notes

### Supabase Auth Setup (Local Dev)

For faster local development, disable email confirmation:
- Supabase Dashboard → Authentication → Providers → Email
- Turn off "Confirm email" → Save
- Re-create any unconfirmed users

### Stripe Webhooks (Local Testing)

Use Stripe CLI to forward webhooks locally:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Google Ads Testing

Test conversion tracking in the browser console:
```javascript
window.testGoogleAdsConversion()
```

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (Stripe, auth)
│   ├── auth/              # Auth callbacks
│   ├── dashboard/         # Protected dashboard routes
│   ├── legal/             # Terms & privacy pages
│   ├── login/             # Login page
│   └── signup/            # Signup page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── dashboard/        # Dashboard-specific components
├── lib/                   # Utilities and configs
│   ├── supabase/         # Supabase clients
│   └── utils/            # Helper functions
├── types/                 # TypeScript types
└── utils/                 # Utility functions
```

---

## 🚢 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy

### Post-Deployment Setup

1. **Update Supabase redirect URLs**
   - Add production URL to allowed redirect URLs

2. **Configure Stripe webhook**
   - Add production webhook endpoint in Stripe Dashboard

3. **Update environment variables**
   - Set `NEXT_PUBLIC_APP_URL` to production URL

---

## 📝 License

This project is proprietary software.

---

## 🎯 Status

**Final Version** - January 26, 2026

This is the production-ready release with all core features implemented:
✅ Authentication & user management
✅ Job, client, and invoice management
✅ Stripe subscription system
✅ Email delivery
✅ Google Ads tracking
✅ Revenue analytics
✅ Responsive design

---

## 📧 Support

For issues or questions, please contact the development team.
