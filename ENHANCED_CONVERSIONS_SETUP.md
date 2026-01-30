# Google Ads Enhanced Conversions Implementation

## Overview

Enhanced conversions have been fully implemented in TradieFlow to improve conversion measurement accuracy and attribution. This feature supplements your existing conversion tags by sending hashed first-party customer data from your website to Google in a privacy-safe way.

## What's Been Implemented

### ✅ Core Infrastructure

1. **Enhanced Conversions Utility** (`src/utils/enhanced-conversions.ts`)
   - SHA-256 hashing for all PII (email, phone, name, address)
   - Data normalization (lowercase, trimmed) for better match rates
   - Privacy-compliant data handling
   - Debug utilities for development

2. **Updated Conversion Tracking** (`src/utils/gtag.ts`)
   - `trackSignUpConversion()` - Now supports enhanced conversion data
   - `trackSubscriptionConversion()` - New function for subscription events
   - Automatic data hashing and formatting
   - Development debugging tools

3. **Global Tag Configuration** (`src/app/layout.tsx`)
   - Enabled `allow_enhanced_conversions: true` in gtag config
   - Applied globally across all pages

### ✅ Conversion Points

1. **Sign-up Conversion** (`/welcome` page)
   - Captures user email, first name, last name
   - Fires after successful account creation
   - Enhanced with user data from Supabase auth

2. **Subscription Conversion** (`/dashboard/billing` page)
   - Captures user email and name
   - Fires on successful Stripe checkout return
   - Includes transaction value ($29 AUD)
   - Uses `SubscriptionSuccessTracker` component

## Configuration Steps

### 1. Verify Enhanced Conversions in Google Ads

1. Go to **Google Ads** > **Goals** > **Summary**
2. Click on your conversion action
3. Go to **Settings** > **Enhanced conversions**
4. Ensure it's set to **"Enhanced conversions for web"**
5. Method should be **"Google tag"** or **"Manual"**

### 2. Add Subscription Conversion Label (Optional)

If you want to track subscription conversions separately:

1. Create a new conversion action in Google Ads:
   - Type: **Purchase**
   - Category: **Purchase**
   - Value: Use transaction-specific value
   - Count: **Every** (for recurring subscriptions)

2. Get the conversion label (format: `ABC123xyz`)

3. Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_GOOGLE_ADS_SUBSCRIBE_LABEL=your-label-here
   ```

4. Update `src/utils/gtag.ts`:
   ```typescript
   export const GOOGLE_ADS_CONFIG = {
     CONVERSION_ID: 'AW-17896188158',
     SIGN_UP_LABEL: '0fciCMj5wOobEP7RyNVC',
     SUBSCRIBE_LABEL: process.env.NEXT_PUBLIC_GOOGLE_ADS_SUBSCRIBE_LABEL || '',
   } as const;
   ```

### 3. Verify Implementation with Tag Assistant

1. Install [Google Tag Assistant Chrome Extension](https://chrome.google.com/webstore/detail/tag-assistant-legacy-by-g/kejbdjndbnbjgmefkgdddjlbokphdefk)

2. Open Tag Assistant and enable debug mode

3. Navigate to your conversion page (e.g., `/welcome`)

4. In Tag Assistant, look for:
   - **Conversion event** fired
   - **`em` parameter** present (this is the hashed email)
   - The `em` value should be a long hash string (64+ characters)
   - Format: `tv.1~em.abc123...~fn.def456...`

5. **Success indicators:**
   - ✅ `em` parameter exists with a proper hash
   - ✅ Hash is 64+ characters long
   - ✅ Format includes multiple user data fields (em, fn, ln, etc.)

6. **Error indicators:**
   - ❌ `em` parameter missing = enhanced conversions not sending
   - ❌ `em` looks like `tv.1~em.` = sending empty data
   - ❌ `em` looks like `tv.1~em.e1` = data format error

### 4. Monitor Enhanced Conversions Diagnostics

1. Go to **Google Ads** > **Goals** > **Summary**
2. Click **Diagnostics** tab
3. Look for:
   - **Coverage rate**: Percentage of conversions with enhanced data
   - **Data quality**: Should be "Excellent" or "Good"
   - **Matched conversions**: Higher is better

**Target Metrics:**
- Coverage rate: **>80%** (aim for 100%)
- Data quality: **Excellent**
- Alerts: None (or "Good" status)

### 5. Testing in Development

Use browser console commands to test:

```javascript
// Test enhanced conversions with sample data
window.testGoogleAdsConversion()

// Check Google Ads status
window.checkGoogleAds()

// Reset conversion tracking (for testing only)
window.resetConversion()
```

## Data Being Sent

### Sign-up Conversion
- **Email**: User's email address (hashed)
- **First Name**: Extracted from user_metadata or profile (hashed)
- **Last Name**: Extracted from user_metadata or profile (hashed)

### Subscription Conversion
- **Email**: User's email address (hashed)
- **First Name**: From profile.full_name (hashed)
- **Last Name**: From profile.full_name (hashed)
- **Value**: $29 AUD (transaction amount)

## Privacy & Security

All data is:
1. ✅ **Hashed** using SHA-256 before sending
2. ✅ **Normalized** (lowercase, trimmed) for consistency
3. ✅ **Encrypted in transit** via HTTPS
4. ✅ **Never stored** in plain text on Google's servers
5. ✅ **GDPR/Privacy compliant** - only sent on conversion events

## Troubleshooting

### Enhanced Conversions Not Working

1. **Check Tag Assistant** for `em` parameter
2. **Verify** enhanced conversions enabled in Google Ads
3. **Ensure** user data is being captured (check console logs in dev mode)
4. **Wait** 3-24 hours for data to appear in Google Ads

### Low Match Rate

1. **Add more data fields** (phone, address if available)
2. **Verify data quality** (correct email format, complete names)
3. **Check normalization** (ensure lowercase, trimmed)
4. **Wait** for more conversion volume (need 20+ conversions/week)

### Coverage Rate Below 80%

1. **Check** if all conversion pages have enhanced data
2. **Verify** user data is available at conversion time
3. **Ensure** no ad blockers preventing data send
4. **Test** with real user signups (not just tests)

## Files Modified

- ✅ `src/utils/enhanced-conversions.ts` - New utility for data hashing
- ✅ `src/utils/gtag.ts` - Updated with enhanced conversions support
- ✅ `src/app/layout.tsx` - Enabled enhanced conversions globally
- ✅ `src/app/welcome/page.tsx` - Captures user data for signup conversion
- ✅ `src/app/dashboard/billing/page.tsx` - Added subscription tracker
- ✅ `src/app/dashboard/billing/subscription-success-tracker.tsx` - New component
- ✅ `.env.local` - Added conversion label placeholder

## Additional Resources

- [Google Ads Enhanced Conversions Documentation](https://support.google.com/google-ads/answer/9888656)
- [Enhanced Conversions Tag Diagnostics](https://support.google.com/google-ads/answer/12769710)
- [Tag Assistant Guide](https://support.google.com/tagassistant/answer/2947093)

## Next Steps

1. ✅ Implementation complete
2. ⏳ Wait 3-24 hours for first enhanced conversion data
3. ⏳ Check diagnostics report for coverage and quality
4. ⏳ Monitor match rate improvements
5. ⏳ (Optional) Add subscription conversion label when available

## Support

If you encounter issues:
1. Check browser console for debug logs (dev mode)
2. Use Tag Assistant to verify `em` parameter
3. Review Google Ads diagnostics report
4. Ensure at least 20 conversions/week for meaningful data
