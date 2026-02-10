// Google Ads gtag type definitions
interface Window {
  dataLayer: unknown[];
  gtag: (...args: unknown[]) => void;
}
