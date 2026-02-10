/**
 * Enhanced Conversions for Google Ads
 * 
 * Enhanced conversions supplement your conversion tags by sending hashed
 * first-party customer data from your website to Google in a privacy-safe way.
 * This helps improve conversion measurement accuracy and attribution.
 * 
 * PRIVACY & SECURITY:
 * - All PII is SHA-256 hashed before sending to Google
 * - Data is normalized (lowercase, trimmed) for better match rates
 * - Only sends data on actual conversion events
 * - Complies with Google's enhanced conversions policies
 */

/**
 * User data interface for enhanced conversions
 * All fields are optional but more fields = better match rates
 */
export interface EnhancedConversionData {
  email?: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  address?: {
    street?: string;
    city?: string;
    region?: string; // State/Province
    postal_code?: string;
    country?: string; // ISO 3166-1 alpha-2 country code (e.g., 'AU')
  };
}

/**
 * SHA-256 hash a string
 * Required for enhanced conversions privacy compliance
 */
async function sha256(str: string): Promise<string> {
  if (typeof window === 'undefined') return '';
  
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Normalize and hash email address
 * - Remove whitespace
 * - Convert to lowercase
 * - SHA-256 hash
 */
async function normalizeAndHashEmail(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  return sha256(normalized);
}

/**
 * Normalize and hash phone number
 * - Remove all non-digit characters
 * - Keep country code if present
 * - SHA-256 hash
 * 
 * Example: "(123) 456-7890" -> "1234567890" -> hash
 */
async function normalizeAndHashPhone(phone: string): Promise<string> {
  // Remove all non-digit characters
  const normalized = phone.replace(/\D/g, '');
  return sha256(normalized);
}

/**
 * Normalize string fields (name, address, etc.)
 * - Trim whitespace
 * - Convert to lowercase
 * - SHA-256 hash
 */
async function normalizeAndHash(str: string): Promise<string> {
  const normalized = str.trim().toLowerCase();
  return sha256(normalized);
}

/**
 * Prepare enhanced conversion data for Google Ads
 * Normalizes and hashes all user data according to Google's specs
 * 
 * @param userData Raw user data (unhashed)
 * @returns Hashed user data object ready for gtag
 */
export async function prepareEnhancedConversionData(
  userData: EnhancedConversionData
): Promise<Record<string, unknown>> {
  const enhanced: Record<string, unknown> = {};

  // Email (most important for match rate)
  if (userData.email) {
    enhanced.email = await normalizeAndHashEmail(userData.email);
  }

  // Phone number
  if (userData.phone_number) {
    enhanced.phone_number = await normalizeAndHashPhone(userData.phone_number);
  }

  // First name
  if (userData.first_name) {
    enhanced.first_name = await normalizeAndHash(userData.first_name);
  }

  // Last name
  if (userData.last_name) {
    enhanced.last_name = await normalizeAndHash(userData.last_name);
  }

  // Address fields
  if (userData.address) {
    const address: Record<string, string> = {};

    if (userData.address.street) {
      address.street = await normalizeAndHash(userData.address.street);
    }
    if (userData.address.city) {
      address.city = await normalizeAndHash(userData.address.city);
    }
    if (userData.address.region) {
      address.region = await normalizeAndHash(userData.address.region);
    }
    if (userData.address.postal_code) {
      address.postal_code = await normalizeAndHash(userData.address.postal_code);
    }
    if (userData.address.country) {
      // Country should be lowercase but not hashed (ISO code)
      address.country = userData.address.country.toLowerCase();
    }

    if (Object.keys(address).length > 0) {
      enhanced.address = address;
    }
  }

  return enhanced;
}

/**
 * Enhanced conversion data validator
 * Checks if we have sufficient data for enhanced conversions
 * 
 * @param userData User data to validate
 * @returns true if we have at least email or phone
 */
export function hasValidEnhancedConversionData(
  userData: EnhancedConversionData
): boolean {
  // At minimum, we need email or phone for enhanced conversions to work
  return !!(userData.email || userData.phone_number);
}

/**
 * Get enhanced conversion parameters for gtag
 * Formats the data according to Google's enhanced conversions spec
 * 
 * @param userData Raw user data
 * @returns Promise<object> Enhanced conversion parameters for gtag
 */
export async function getEnhancedConversionParams(
  userData: EnhancedConversionData
): Promise<Record<string, unknown> | null> {
  if (!hasValidEnhancedConversionData(userData)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Enhanced Conversions] Insufficient user data - need at least email or phone');
    }
    return null;
  }

  const hashedData = await prepareEnhancedConversionData(userData);

  return {
    user_data: hashedData,
  };
}

/**
 * Debug: Log enhanced conversion data (hashed values only)
 * Use in development to verify data is being collected and hashed
 */
export async function debugEnhancedConversion(userData: EnhancedConversionData) {
  if (process.env.NODE_ENV !== 'development') return;

  console.log('SECURE [Enhanced Conversions] Raw user data (will be hashed):');
  console.log('   * Email:', userData.email ? 'OK Present' : 'ERROR Missing');
  console.log('   * Phone:', userData.phone_number ? 'OK Present' : 'ERROR Missing');
  console.log('   * First name:', userData.first_name ? 'OK Present' : 'ERROR Missing');
  console.log('   * Last name:', userData.last_name ? 'OK Present' : 'ERROR Missing');
  console.log('   * Address:', userData.address ? 'OK Present' : 'ERROR Missing');

  if (hasValidEnhancedConversionData(userData)) {
    const params = await getEnhancedConversionParams(userData);
    console.log('\nSECURE [Enhanced Conversions] Hashed data ready to send:');
    console.log(JSON.stringify(params, null, 2));
  } else {
    console.warn('\nWARN [Enhanced Conversions] Insufficient data for enhanced conversions');
  }
}
