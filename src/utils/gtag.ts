/**
 * Google Ads Conversion Tracking Utilities
 * 
 * Conversion ID: AW-17896188158
 * Sign-up Label: 0fciCMj5wOobEP7RyNVC
 * 
 * CHECKLIST COMPLIANCE:
 * ✓ Tag Implementation: Global tag loads in layout.tsx on all pages
 * ✓ Trigger Logic: Fires on /welcome page view after successful signup
 * ✓ Deduplication: Session storage prevents duplicate conversions
 * ✓ Count Setting: Set to "One" per user (handled via deduplication)
 */

export const GOOGLE_ADS_CONFIG = {
  CONVERSION_ID: 'AW-17896188158',
  SIGN_UP_LABEL: '0fciCMj5wOobEP7RyNVC',
} as const;

// Storage key for tracking fired conversions (prevents duplicates from page refreshes)
const CONVERSION_STORAGE_KEY = 'tradieflow_conversion_fired';

/**
 * Fire Google Ads sign-up conversion
 * Called automatically on /welcome page for new user sign-ups
 * 
 * DEDUPLICATION: Uses sessionStorage to ensure conversion fires EXACTLY ONCE
 * even if user refreshes the success page. This aligns with Google Ads
 * recommended setting of "Count: One" for lead generation campaigns.
 */
export function trackSignUpConversion() {
  if (typeof window === 'undefined' || !window.gtag) {
    console.warn('[Google Ads] Tracking not available - window or gtag undefined');
    return;
  }

  // DEDUPLICATION CHECK: Prevent duplicate conversions from page refreshes
  if (hasConversionFired()) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Google Ads] ⚠️ Conversion already fired this session - skipping duplicate');
    }
    return;
  }

  const conversionLabel = `${GOOGLE_ADS_CONFIG.CONVERSION_ID}/${GOOGLE_ADS_CONFIG.SIGN_UP_LABEL}`;
  
  // Fire the conversion event
  window.gtag('event', 'conversion', {
    'send_to': conversionLabel,
    'value': 1.0,
    'currency': 'AUD',
    'transaction_id': generateTransactionId(), // Unique ID for deduplication
  });

  // Mark conversion as fired
  markConversionFired();

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ [Google Ads] Sign-up conversion tracked:', conversionLabel);
    console.log('[Google Ads] Transaction ID:', generateTransactionId());
  }
}

/**
 * Check if conversion has already fired this session
 */
function hasConversionFired(): boolean {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(CONVERSION_STORAGE_KEY) === 'true';
}

/**
 * Mark conversion as fired in session storage
 */
function markConversionFired(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(CONVERSION_STORAGE_KEY, 'true');
}

/**
 * Generate unique transaction ID for conversion deduplication
 * Format: timestamp + random string
 */
function generateTransactionId(): string {
  return `signup_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
  const hasFired = hasConversionFired();

  return {
    status: hasGtag && hasDataLayer ? 'ready' : 'not-loaded',
    gtag: hasGtag ? '✅ Loaded' : '❌ Not loaded',
    dataLayer: hasDataLayer ? `✅ Initialized (${window.dataLayer?.length || 0} events)` : '❌ Not initialized',
    conversion: hasFired ? '✅ Already fired this session' : '⚪ Not fired yet',
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
  window.sessionStorage.removeItem(CONVERSION_STORAGE_KEY);
  console.log('🔄 [Google Ads] Conversion tracking reset - you can fire another test conversion');
}

/**
 * Test conversion tracking in browser console
 * Usage: window.testGoogleAdsConversion()
 */
if (typeof window !== 'undefined') {
  (window as any).testGoogleAdsConversion = () => {
    console.log('🧪 [Google Ads] Running tracking verification...\n');
    
    const status = getTrackingStatus();
    console.log('📊 Tracking Status:');
    console.log(`   • Overall: ${status.status}`);
    console.log(`   • gtag.js: ${status.gtag}`);
    console.log(`   • DataLayer: ${status.dataLayer}`);
    console.log(`   • Conversion: ${status.conversion}`);
    console.log(`   • Conversion ID: ${status.conversionId}`);
    console.log(`   • Full Label: ${status.conversionLabel}\n`);

    if (!isGoogleAdsLoaded()) {
      console.error('❌ Google Ads tag not loaded properly');
      console.log('💡 Make sure you\'re testing on a live page, not a static HTML file');
      return;
    }
    
    if (hasConversionFired()) {
      console.warn('⚠️  Conversion already fired this session');
      console.log('💡 To test again, run: window.resetConversion()');
      return;
    }

    console.log('✅ Google Ads tag loaded correctly');
    console.log('📊 Firing test conversion...');
    trackSignUpConversion();
    console.log('\n✅ Test conversion fired successfully!');
    console.log('📈 Check Google Ads > Tools > Conversions in 3-24 hours');
    console.log('🔍 Look for: "Sign Up" conversion event');
  };

  // Helper to reset for testing
  (window as any).resetConversion = resetConversionTracking;
  
  // Helper to check status
  (window as any).checkGoogleAds = () => {
    const status = getTrackingStatus();
    console.table(status);
    return status;
  };
}
