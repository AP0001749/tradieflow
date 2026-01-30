# Lead Automation MVP - Deployment Checklist

## Pre-Deployment

- [ ] Run migration locally to test: `npx supabase db push`
- [ ] Test booking page at `/book`
- [ ] Test cron endpoint manually with curl
- [ ] Verify Resend email templates render correctly
- [ ] Set up business profile in `/dashboard/settings`

## Environment Variables

Add these to Vercel (or your hosting platform):

```env
CRON_SECRET=<generate-random-32-char-token>
RESEND_API_KEY=<your-existing-key>
NEXT_PUBLIC_SUPABASE_URL=<your-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>
SUPABASE_SERVICE_ROLE_KEY=<your-key>
```

## Supabase Setup

- [ ] Run migration on production Supabase
- [ ] Verify RLS policies are active
- [ ] Test anonymous access to leads table (for /book page)
- [ ] Create your first business_profile record

## Vercel Configuration

- [ ] Ensure `vercel.json` is committed
- [ ] Deploy to Vercel
- [ ] Verify cron job shows in Functions dashboard
- [ ] Check cron runs every 15 minutes (monitor logs)

## Google Ads Setup

- [ ] Update conversion tracking in `/book` page
- [ ] Replace `AW-CONVERSION_ID/CONVERSION_LABEL` with your values
- [ ] Test conversion fires on form submission

## Post-Deployment Testing

- [ ] Submit test lead via `/book`
- [ ] Verify email arrives via Resend
- [ ] Check lead appears in `/dashboard/leads`
- [ ] Test status changes (contacted, booked, lost)
- [ ] Test convert to job flow
- [ ] Wait 15 mins and verify cron runs
- [ ] Check `lead_events` table for audit trail

## Marketing Setup

Update your messaging to focus on cleaners:

### Landing Page Copy
**Before:** "Job management system for Australian tradies"
**After:** "Get more cleaning jobs automatically — without chasing leads"

### Google Ads Keywords
- end of lease cleaning near me
- house cleaners near me
- bond cleaning [suburb]
- commercial cleaning quotes

Target: Business owners, not consumers

### Value Proposition
Focus on:
- Automated lead capture
- No missed follow-ups
- Fewer no-shows
- Less admin time
- More bookings

NOT on:
- Job management
- Invoice features
- Generic CRM benefits

## Quick Wins

Once deployed, immediately:

1. **Test the full flow**
   - Submit lead → receive email → check dashboard → convert to job

2. **Share booking page**
   - Add to website
   - Use in Google Ads
   - Email signature
   - Social media bio

3. **Monitor for 48 hours**
   - Check Vercel logs for cron runs
   - Verify follow-up emails send
   - Watch for any errors in `lead_events`

4. **Gather feedback**
   - If you have existing customers, send them the booking link
   - Ask: "Would you use this?"
   - Iterate based on real cleaner needs

## Success Metrics

Track these weekly:

- Leads captured (from `/book`)
- Email open/reply rates (via Resend)
- Lead → Booked conversion %
- Booked → Job conversion %
- Time from lead to booking

Goal: Prove the wedge works before building more features.

## What NOT to Do

❌ Add more job management features
❌ Build pretty dashboards
❌ Create generic marketing
❌ Try to serve all tradies
❌ Add complexity before validation

✅ Focus only on lead leakage for cleaners
✅ Talk to actual cleaning businesses
✅ Iterate on the booking/follow-up flow
✅ Measure lead → revenue conversion
✅ Perfect ONE workflow before expanding
