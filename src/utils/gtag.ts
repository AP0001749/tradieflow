/**
 * Google Ads Conversion Tracking Utilities
 * 
 * Conversion ID: AW-17896188158
 * Sign-up Label: 0fciCMj5wOobEP7RyNVC
 */

export const GOOGLE_ADS_CONFIG = {
  CONVERSION_ID: 'AW-17896188158',
  SIGN_UP_LABEL: '0fciCMj5wOobEP7RyNVC',
} as const;

/**
 * Fire Google Ads sign-up conversion
 * Called automatically on /welcome page for new user sign-ups
 */
export function trackSignUpConversion() {
  if (typeof window === 'undefined' || !window.gtag) {
    console.warn('Google Ads tracking not available');
    return;
  }

  const conversionLabel = `${GOOGLE_ADS_CONFIG.CONVERSION_ID}/${GOOGLE_ADS_CONFIG.SIGN_UP_LABEL}`;
  
  window.gtag('event', 'conversion', {
    'send_to': conversionLabel,
    'value': 1.0,
    'currency': 'AUD',
  });

  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Google Ads] Sign-up conversion tracked:', conversionLabel);
  }
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
 * Test conversion tracking in browser console
 * Usage: window.testGoogleAdsConversion()
 */
if (typeof window !== 'undefined') {
  (window as any).testGoogleAdsConversion = () => {
    if (!isGoogleAdsLoaded()) {
      console.error('❌ Google Ads tag not loaded');
      return;
    }
    
    console.log('✅ Google Ads tag loaded');
    console.log('📊 Firing test conversion...');
    trackSignUpConversion();
    console.log('✅ Test conversion fired. Check Google Ads dashboard in 24-48 hours.');
  };
}
