// Google Ads gtag type definitions
interface Window {
  dataLayer: any[];
  gtag: (...args: any[]) => void;
}
