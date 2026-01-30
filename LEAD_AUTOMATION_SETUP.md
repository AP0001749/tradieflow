# Lead Automation System - Setup Guide

## Overview

This lead automation system transforms TradieFlow into a lead capture and follow-up engine for cleaning businesses. It automatically:

1. Captures leads from a public booking page
2. Sends immediate confirmation emails
3. Follows up at 24h and 48h intervals
4. Converts booked leads into jobs

---

## Setup Steps

### 1. Run Database Migration

```bash
# Apply the migration to create new tables
npx supabase db push
```

This creates three new tables:
- `business_profile` - Business information
- `leads` - Lead tracking with automation
- `lead_events` - Audit log

### 2. Configure Environment Variables

Add to your `.env.local` (and Vercel environment variables):

```env
# Cron job authentication (generate a random secure token)
CRON_SECRET=your-random-secure-token-here

# Already configured (verify these exist)
RESEND_API_KEY=your-resend-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Generate a secure CRON_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Configure Vercel Cron (Production Only)

The `vercel.json` file is already configured to run the cron job every 15 minutes:

```json
{
  "crons": [
    {
      "path": "/api/cron/leads-followup",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

In Vercel:
1. Go to your project settings
2. Add `CRON_SECRET` environment variable
3. Deploy - cron will run automatically

### 4. Set Up Your Business Profile

1. Go to `/dashboard/settings`
2. Fill in:
   - Business Name
   - Reply-To Email
   - Google Review URL (optional)
   - Service Area Postcodes
   - Default Job Types
3. Save settings

### 5. Share Your Booking Page

Your public booking page is at: `/book`

Use this URL in:
- Google Ads campaigns
- Your website
- Social media
- Email signatures

---

## How It Works

### Lead Flow

1. **Lead submits form** at `/book`
   - Creates lead record with status `new`
   - Triggers immediate follow-up scheduling

2. **Immediate email (Step 0)**
   - Sent within seconds
   - Asks for full details (address, bedrooms, etc.)
   - Status → `contacted`
   - Next follow-up scheduled for +24h

3. **24h follow-up (Step 1)**
   - "Still need help?" email
   - Next follow-up scheduled for +48h

4. **48h follow-up (Step 2)**
   - "Last check-in" email
   - If no response → status becomes `stale`

5. **Manual actions** (in `/dashboard/leads`)
   - Mark as `contacted`
   - Mark as `booked`
   - Mark as `lost`
   - Convert to job (when booked)

### Convert to Job

When you click "Convert to Job":
1. Creates or finds matching client (by email/phone)
2. Creates job record linked to client
3. Updates lead status to `won`
4. Links lead to job for tracking

---

## Testing Locally

### Test the booking page:
```bash
npm run dev
# Visit http://localhost:3000/book
```

### Test the cron job manually:
```bash
curl http://localhost:3000/api/cron/leads-followup \
  -H "Authorization: Bearer your-cron-secret"
```

### Check Resend emails:
- Go to https://resend.com/emails
- View sent emails and delivery status

---

## Database Schema

### business_profile
- One per user
- Stores business info used in emails
- Required before leads can be captured

### leads
- Core tracking table
- States: `new`, `contacted`, `booked`, `won`, `lost`, `stale`
- Automated follow-up logic in `next_followup_at`

### lead_events
- Audit log for all lead actions
- Tracks emails, status changes, conversions, errors

---

## Email Templates

Located in `src/emails/`:
1. `immediate-followup-email.tsx` - Step 0
2. `twentyfour-followup-email.tsx` - Step 1
3. `fortyeight-followup-email.tsx` - Step 2

Customize these to match your brand voice.

---

## Google Ads Integration

Update `/book` page with your Google Ads conversion tracking:

```typescript
// In src/app/book/page.tsx
if (typeof window !== 'undefined' && (window as any).gtag) {
  (window as any).gtag('event', 'conversion', {
    send_to: 'AW-YOUR_ID/YOUR_LABEL', // Replace with your conversion ID
    value: 1.0,
    currency: 'AUD',
  });
}
```

---

## Monitoring

### Check lead events:
```sql
SELECT * FROM lead_events 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Check pending follow-ups:
```sql
SELECT id, name, email, status, followup_step, next_followup_at
FROM leads
WHERE next_followup_at <= NOW()
AND status IN ('new', 'contacted');
```

### Check cron execution:
- Vercel: Dashboard > Deployments > Functions > Logs
- Look for `/api/cron/leads-followup` executions

---

## Troubleshooting

### Emails not sending:
1. Check Resend API key in env vars
2. Verify `reply_to_email` in business profile
3. Check `lead_events` table for errors

### Cron not running:
1. Verify `CRON_SECRET` is set in Vercel
2. Check Vercel Functions logs
3. Test manually with curl

### Leads not appearing:
1. Verify business profile exists
2. Check RLS policies (anonymous users can insert leads)
3. Check browser console for API errors

---

## Next Steps

### MVP Complete ✅
- Database schema
- Public booking page
- Email automation
- Dashboard views
- Convert to job

### Future Enhancements
- SMS notifications (via Twilio)
- Calendar integration
- Review request automation (post-job)
- Lead scoring
- Multi-business support (franchises)

---

## Support

For issues or questions:
1. Check Supabase logs
2. Check Vercel function logs
3. Check Resend delivery logs
4. Review `lead_events` table for audit trail
