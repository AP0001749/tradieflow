"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { trackSubscriptionConversion } from "@/utils/gtag";
import type { EnhancedConversionData } from "@/utils/enhanced-conversions";

interface SubscriptionSuccessTrackerProps {
  userEmail?: string | null;
  userName?: string | null;
  subscriptionValue?: number;
}

/**
 * Client component to track subscription conversions
 * Fires when user returns from successful Stripe checkout
 */
export function SubscriptionSuccessTracker({ 
  userEmail, 
  userName,
  subscriptionValue = 299
}: SubscriptionSuccessTrackerProps) {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");

  useEffect(() => {
    // Only fire on successful payment; deduplicate across refreshes
    const STORAGE_KEY = 'tradieflow_subscribe_conversion_fired';
    if (success === "true" && typeof window !== 'undefined' && !sessionStorage.getItem(STORAGE_KEY)) {
      sessionStorage.setItem(STORAGE_KEY, 'true');

      async function fireConversion() {
        // Prepare enhanced conversion data
        const userData: EnhancedConversionData = {};

        if (userEmail) {
          userData.email = userEmail;
        }

        if (userName) {
          const nameParts = userName.split(' ');
          userData.first_name = nameParts[0];
          if (nameParts.length > 1) {
            userData.last_name = nameParts.slice(1).join(' ');
          }
        }

        // Track subscription conversion with enhanced conversions
        await trackSubscriptionConversion(
          Object.keys(userData).length > 0 ? userData : undefined,
          subscriptionValue
        );
      }

      fireConversion();
    }
  }, [success, userEmail, userName, subscriptionValue]);

  return null; // This component doesn't render anything
}
