"use client";

import { useEffect, useState } from "react";
import { getTrackingStatus, isGoogleAdsLoaded } from "@/utils/gtag";

/**
 * Google Ads Tracking Debug Component
 * 
 * Shows a small debug widget in development mode to verify tracking setup.
 * Only visible in development environment.
 * 
 * USAGE: Add to layout.tsx or any page during testing
 * <GoogleAdsDebug />
 */
export function GoogleAdsDebug() {
  const [status, setStatus] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return;

    // Check status after a short delay to ensure scripts are loaded
    const timer = setTimeout(() => {
      setStatus(getTrackingStatus());
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Don't render in production
  if (process.env.NODE_ENV !== 'development') return null;
  if (!status) return null;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 bg-purple-600 hover:bg-purple-700 text-white text-xs font-mono px-3 py-2 rounded-lg shadow-lg transition-all"
        title="Toggle Google Ads Debug Panel"
      >
        {isVisible ? '✕' : '📊'} Google Ads
      </button>

      {/* Debug Panel */}
      {isVisible && (
        <div className="fixed bottom-16 right-4 z-50 bg-gray-900 text-gray-100 p-4 rounded-lg shadow-2xl border border-purple-500/50 max-w-sm text-xs font-mono">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700">
            <h3 className="font-bold text-purple-400">Google Ads Tracking</h3>
            <span className={`px-2 py-0.5 rounded text-[10px] ${
              status.status === 'ready' 
                ? 'bg-green-900/50 text-green-300' 
                : 'bg-red-900/50 text-red-300'
            }`}>
              {status.status}
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-start">
              <span className="text-gray-400 w-24 shrink-0">gtag.js:</span>
              <span className="text-gray-100">{status.gtag}</span>
            </div>
            <div className="flex items-start">
              <span className="text-gray-400 w-24 shrink-0">DataLayer:</span>
              <span className="text-gray-100">{status.dataLayer}</span>
            </div>
            <div className="flex items-start">
              <span className="text-gray-400 w-24 shrink-0">Conversion:</span>
              <span className="text-gray-100">{status.conversion}</span>
            </div>
            <div className="flex items-start pt-2 border-t border-gray-700">
              <span className="text-gray-400 w-24 shrink-0">ID:</span>
              <span className="text-purple-400">{status.conversionId}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-700 space-y-1">
            <p className="text-[10px] text-gray-400">🧪 Browser Console Commands:</p>
            <code className="block text-[10px] text-green-300">window.testGoogleAdsConversion()</code>
            <code className="block text-[10px] text-blue-300">window.checkGoogleAds()</code>
            <code className="block text-[10px] text-yellow-300">window.resetConversion()</code>
          </div>
        </div>
      )}
    </>
  );
}
