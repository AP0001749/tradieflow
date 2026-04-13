/**
 * Google Ads Conversion Tracking Utilities with Enhanced Conversions
 * 
 * Conversion ID: AW-17896188158
 * Sign-up Label: 0fciCMj5wOobEP7RyNVC
 * 
 * CHECKLIST COMPLIANCE:
 * OK Tag Implementation: Global tag loads in layout.tsx on all pages
 * OK Trigger Logic: Fires on /welcome page view after successful signup
 * OK Deduplication: Session storage prevents duplicate conversions
 * OK Count Setting: Set to "One" per user (handled via deduplication)
 * OK Enhanced Conversions: Sends hashed user data for improved attribution
 */

import type { EnhancedConversionData } from './enhanced-conversions';
import { getEnhancedConversionParams, debugEnhancedConversion } from './enhanced-conversions';

export const GOOGLE_ADS_CONFIG = {
  CONVERSION_ID: 'AW-17896188158',
  SIGN_UP_LABEL: '0fciCMj5wOobEP7RyNVC',
  // Configure this in `.env.local` as NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL.
  // This should be your "Setup Dispatch Audit Request" conversion action label.
  LEAD_LABEL: process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL || '',
  SUBSCRIBE_LABEL: process.env.NEXT_PUBLIC_GOOGLE_ADS_SUBSCRIBE_LABEL || '',
};

// Storage keys for tracking fired conversions (prevents duplicates from page refreshes)
const SIGNUP_CONVERSION_STORAGE_KEY = 'tradieflow_signup_conversion_fired';
const LEAD_CONVERSION_STORAGE_KEY = 'tradieflow_lead_conversion_fired_ids';

/**
 * Fire Google Ads sign-up conversion with Enhanced Conversions support
 * Called automatically on /welcome page for new user sign-ups
 * 
 * DEDUPLICATION: Uses sessionStorage to ensure conversion fires EXACTLY ONCE
 * even if user refreshes the success page. This aligns with Google Ads
 * recommended setting of "Count: One" for lead generation campaigns.
 * 
 * EVENT CALLBACK: Ensures conversion is logged before navigation occurs,
 * preventing attribution loss on slow mobile connections.
 * 
 * ENHANCED CONVERSIONS: Sends hashed first-party user data (email, name, etc.)
 * to improve conversion attribution and measurement accuracy.
 * 
 * @param userData - Optional user data for enhanced conversions (email, name, phone)
 * @param callback - Optional function to execute after conversion is successfully logged
 */
export async function trackSignUpConversion(
  userData?: EnhancedConversionData,
  callback?: () => void
) {
  if (typeof window === 'undefined' || !window.gtag) {
    console.warn('[Google Ads] Tracking not available - window or gtag undefined');
    if (callback) callback();
    return;
  }

  // DEDUPLICATION CHECK: Prevent duplicate conversions from page refreshes
  if (hasConversionFired(SIGNUP_CONVERSION_STORAGE_KEY)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Google Ads] WARN Conversion already fired this session - skipping duplicate');
    }
    if (callback) callback();
    return;
  }

  const conversionLabel = `${GOOGLE_ADS_CONFIG.CONVERSION_ID}/${GOOGLE_ADS_CONFIG.SIGN_UP_LABEL}`;
  const transactionId = generateTransactionId('signup');
  
  // Prepare conversion parameters
  const conversionParams: Record<string, unknown> = {
    'send_to': conversionLabel,
    'value': 1.0,
    'currency': 'AUD',
    'transaction_id': transactionId,
    'event_callback': () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('OK [Google Ads] Callback triggered - conversion logged successfully');
      }
      if (callback) {
        callback();
      }
    },
    'event_timeout': 2000,
  };

  // Add enhanced conversion data if provided
  if (userData) {
    const enhancedParams = await getEnhancedConversionParams(userData);
    if (enhancedParams) {
      Object.assign(conversionParams, enhancedParams);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('SECURE [Google Ads] Enhanced conversions enabled for this conversion');
        await debugEnhancedConversion(userData);
      }
    }
  }

  // Fire the conversion event
  window.gtag('event', 'conversion', conversionParams);

  // Mark conversion as fired
  markConversionFired(SIGNUP_CONVERSION_STORAGE_KEY);

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('OK [Google Ads] Sign-up conversion tracked:', conversionLabel);
    console.log('[Google Ads] Transaction ID:', transactionId);
    console.log('[Google Ads] Enhanced conversions:', userData ? 'OK Enabled' : 'NOT Not provided');
  }
}

/**
 * Fire Google Ads lead conversion for dispatch-audit and lead requests.
 *
 * IMPORTANT: Requires `NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL` to be set.
 *
 * DEDUPLICATION: Stored per `leadId` in sessionStorage so refreshes don't double-count.
 */
export async function trackLeadConversion(params: {
  leadId: string;
  userData?: EnhancedConversionData;
  value?: number;
  callback?: () => void;
}) {
  const { leadId, userData, value = 1.0, callback } = params;

  if (typeof window === 'undefined' || !window.gtag) {
    console.warn('[Google Ads] Tracking not available - window or gtag undefined');
    if (callback) callback();
    return;
  }

  if (!GOOGLE_ADS_CONFIG.LEAD_LABEL) {
    console.warn('[Google Ads] Dispatch-audit conversion label not configured (NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL)');
    if (callback) callback();
    return;
  }

  if (hasLeadConversionFired(leadId)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Google Ads] WARN Lead conversion already fired for this leadId - skipping duplicate');
    }
    if (callback) callback();
    return;
  }

  const conversionLabel = `${GOOGLE_ADS_CONFIG.CONVERSION_ID}/${GOOGLE_ADS_CONFIG.LEAD_LABEL}`;
  const transactionId = `lead_${leadId}`;

  const conversionParams: Record<string, unknown> = {
    send_to: conversionLabel,
    value,
    currency: 'AUD',
    transaction_id: transactionId,
    event_callback: () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('OK [Google Ads] Callback triggered - lead conversion logged successfully');
      }
      if (callback) callback();
    },
    event_timeout: 2000,
  };

  if (userData) {
    const enhancedParams = await getEnhancedConversionParams(userData);
    if (enhancedParams) {
      Object.assign(conversionParams, enhancedParams);

      if (process.env.NODE_ENV === 'development') {
        console.log('SECURE [Google Ads] Enhanced conversions enabled for lead conversion');
        await debugEnhancedConversion(userData);
      }
    }
  }

  window.gtag('event', 'conversion', conversionParams);
  markLeadConversionFired(leadId);

  if (process.env.NODE_ENV === 'development') {
    console.log('OK [Google Ads] Lead conversion tracked:', conversionLabel);
    console.log('[Google Ads] Transaction ID:', transactionId);
  }
}

/**
 * Fire Google Ads subscription conversion with Enhanced Conversions support
 * Called when a user successfully subscribes to a paid plan
 * 
 * @param userData - Optional user data for enhanced conversions
 * @param value - Transaction value (subscription amount)
 * @param callback - Optional function to execute after conversion is logged
 */
export async function trackSubscriptionConversion(
  userData?: EnhancedConversionData,
  value?: number,
  callback?: () => void
) {
  if (typeof window === 'undefined' || !window.gtag) {
    console.warn('[Google Ads] Tracking not available - window or gtag undefined');
    if (callback) callback();
    return;
  }

  if (!GOOGLE_ADS_CONFIG.SUBSCRIBE_LABEL) {
    console.warn('[Google Ads] Subscription conversion label not configured');
    if (callback) callback();
    return;
  }

  const conversionLabel = `${GOOGLE_ADS_CONFIG.CONVERSION_ID}/${GOOGLE_ADS_CONFIG.SUBSCRIBE_LABEL}`;
  const transactionId = generateTransactionId('subscribe');
  
  // Prepare conversion parameters
  const conversionParams: Record<string, unknown> = {
    'send_to': conversionLabel,
    'value': value || 0,
    'currency': 'AUD',
    'transaction_id': transactionId,
    'event_callback': () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('OK [Google Ads] Subscription conversion callback triggered');
      }
      if (callback) {
        callback();
      }
    },
    'event_timeout': 2000,
  };

  // Add enhanced conversion data if provided
  if (userData) {
    const enhancedParams = await getEnhancedConversionParams(userData);
    if (enhancedParams) {
      Object.assign(conversionParams, enhancedParams);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('SECURE [Google Ads] Enhanced conversions enabled for subscription');
        await debugEnhancedConversion(userData);
      }
    }
  }

  // Fire the conversion event
  window.gtag('event', 'conversion', conversionParams);

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('OK [Google Ads] Subscription conversion tracked:', conversionLabel);
    console.log('[Google Ads] Transaction ID:', transactionId);
    console.log('[Google Ads] Value:', value, 'AUD');
    console.log('[Google Ads] Enhanced conversions:', userData ? 'OK Enabled' : 'NOT Not provided');
  }
}

function hasConversionFired(storageKey: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(storageKey) === 'true';
  } catch {
    return false;
  }
}

function markConversionFired(storageKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(storageKey, 'true');
  } catch {
    // sessionStorage unavailable (private browsing)
  }
}

function getLeadFiredIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.sessionStorage.getItem(LEAD_CONVERSION_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x) => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

function setLeadFiredIds(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(LEAD_CONVERSION_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // sessionStorage unavailable
  }
}

function hasLeadConversionFired(leadId: string): boolean {
  return getLeadFiredIds().has(leadId);
}

function markLeadConversionFired(leadId: string): void {
  const ids = getLeadFiredIds();
  ids.add(leadId);
  setLeadFiredIds(ids);
}

/**
 * Generate unique transaction ID for conversion deduplication
 * Format: timestamp + random string
 */
function generateTransactionId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Verify Google Ads tag is loaded
 * Use this to troubleshoot tracking issues
 */
export function isGoogleAdsLoaded(): boolean {
  return typeof window !== 'undefined' && 
         typeof window.gtag === 'function' &&
         Array.isArray(window.dataLayer);
}

/**
 * Get detailed tracking status for debugging
 * Returns comprehensive information about the tracking setup
 */
export function getTrackingStatus() {
  if (typeof window === 'undefined') {
    return {
      status: 'server-side',
      message: 'Cannot check tracking on server',
    };
  }

  const hasGtag = typeof window.gtag === 'function';
  const hasDataLayer = Array.isArray(window.dataLayer);
  const hasFired = hasConversionFired(SIGNUP_CONVERSION_STORAGE_KEY);

  return {
    status: hasGtag && hasDataLayer ? 'ready' : 'not-loaded',
    gtag: hasGtag ? 'OK Loaded' : 'ERROR Not loaded',
    dataLayer: hasDataLayer ? `OK Initialized (${window.dataLayer?.length || 0} events)` : 'ERROR Not initialized',
    conversion: hasFired ? 'OK Already fired this session' : 'NOT Not fired yet',
    conversionId: GOOGLE_ADS_CONFIG.CONVERSION_ID,
    conversionLabel: `${GOOGLE_ADS_CONFIG.CONVERSION_ID}/${GOOGLE_ADS_CONFIG.SIGN_UP_LABEL}`,
  };
}

/**
 * Reset conversion tracking (for testing only)
 * WARNING: Only use this during development/testing
 */
export function resetConversionTracking() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(SIGNUP_CONVERSION_STORAGE_KEY);
    window.sessionStorage.removeItem(LEAD_CONVERSION_STORAGE_KEY);
  } catch {
    // sessionStorage unavailable
  }
  if (process.env.NODE_ENV === 'development') {
    console.log('RESET [Google Ads] Conversion tracking reset - you can fire another test conversion');
  }
}

/**
 * Test conversion tracking in browser console with Enhanced Conversions
 * Usage: window.testGoogleAdsConversion()
 */
if (typeof window !== 'undefined') {
  if (process.env.NODE_ENV === 'development') {
    (window as unknown as Record<string, unknown>).testGoogleAdsConversion = async () => {
    console.log('TEST [Google Ads] Running tracking verification...\n');
    
    const status = getTrackingStatus();
    console.log('STATS Tracking Status:');
    console.log(`   * Overall: ${status.status}`);
    console.log(`   * gtag.js: ${status.gtag}`);
    console.log(`   * DataLayer: ${status.dataLayer}`);
    console.log(`   * Conversion: ${status.conversion}`);
    console.log(`   * Conversion ID: ${status.conversionId}`);
    console.log(`   * Full Label: ${status.conversionLabel}\n`);

    if (!isGoogleAdsLoaded()) {
      console.error('ERROR Google Ads tag not loaded properly');
      console.log('TIP Make sure you\'re testing on a live page, not a static HTML file');
      return;
    }
    
    if (hasConversionFired(SIGNUP_CONVERSION_STORAGE_KEY)) {
      console.warn('WARN  Conversion already fired this session');
      console.log('TIP To test again, run: window.resetConversion()');
      return;
    }

    console.log('OK Google Ads tag loaded correctly');
    console.log('STATS Firing test conversion with enhanced conversions...');
    
    // Test with sample enhanced conversion data
    const testUserData = {
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
    };
    
    await trackSignUpConversion(testUserData);
    console.log('\nOK Test conversion fired successfully with enhanced conversions!');
    console.log('CHART Check Google Ads > Tools > Conversions in 3-24 hours');
    console.log('DEBUG Look for: "Sign Up" conversion event');
    console.log('SECURE Enhanced conversions data was included (check diagnostics report)');
    };

    // Helper to reset for testing
    (window as unknown as Record<string, unknown>).resetConversion = resetConversionTracking;
  }
  
  // Lightweight helper: safe to expose in production for troubleshooting.
  (window as unknown as Record<string, unknown>).checkGoogleAds = () => {
    const status = getTrackingStatus();
    console.table(status);
    return status;
  };
}
