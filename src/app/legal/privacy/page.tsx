import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | TradieFlow",
  description:
    "Privacy Policy for TradieFlow (Australia) - how we collect, use, and disclose personal information.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "22 January 2026";

  return (
    <main className="container py-10 min-h-screen">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
              Privacy Policy
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors inline-flex items-center gap-2 group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back
          </Link>
        </div>

        <article className="prose prose-zinc prose-lg max-w-none dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-strong:text-foreground animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
          <h2>1. Who we are</h2>
          <p>
            TradieFlow is a software-as-a-service (SaaS) product operated by
            {" "}
            <strong>Ajit Patil</strong> (ABN 74 961 169 156) (we, us, our).
          </p>

          <h2>2. Scope</h2>
          <p>
            This Privacy Policy explains how we collect, hold, use, and disclose
            personal information when you use TradieFlow (including our website,
            app, and related services).
          </p>
          <p>
            We aim to comply with the <em>Privacy Act 1988 (Cth)</em> and the
            Australian Privacy Principles (APPs).
          </p>

          <h2>3. Personal information we collect</h2>
          <p>
            In the course of providing TradieFlow, we may collect the following
            types of personal information:
          </p>
          <ul>
            <li>
              <strong>Identity and contact details</strong>: your name and email
              address.
            </li>
            <li>
              <strong>Job site photographs</strong>: photographic images you
              upload of job sites. These images may include identifying details
              (e.g. people, addresses, vehicle plates) and are treated as
              personal information under the Privacy Act.
            </li>
            <li>
              <strong>Account and usage information</strong>: basic information
              about how you use the service (for example, feature usage and
              activity timestamps).
            </li>
            <li>
              <strong>Payment-related information</strong>: we do not store full
              card details, but we may receive billing status and subscription
              metadata from our payment provider.
            </li>
          </ul>

          <h2>4. How we collect personal information</h2>
          <p>
            We collect personal information directly from you when you:
            (a) create an account; (b) add customers and job records; (c) upload
            job site photos; (d) subscribe, pay, or manage billing.
          </p>

          <h2>5. How we use personal information</h2>
          <p>We use personal information to:</p>
          <ul>
            <li>provide, operate, and improve TradieFlow;</li>
            <li>authenticate users and secure accounts;</li>
            <li>process subscriptions and billing;</li>
            <li>
              send service communications (e.g. invoices, important service
              notices);
            </li>
            <li>comply with legal obligations and enforce our terms.</li>
          </ul>

          <h2>6. Disclosure to third parties</h2>
          <p>
            We use third-party service providers to operate TradieFlow. In
            particular:
          </p>
          <ul>
            <li>
              <strong>Stripe</strong> processes subscription payments and may
              process related billing data.
            </li>
            <li>
              <strong>Supabase</strong> provides hosting, database, and storage
              services used to store account data and uploaded content.
            </li>
          </ul>
          <p>
            We may also disclose personal information where required or
            authorised by law (including to regulators, law enforcement, or to
            protect our rights).
          </p>

          <h2>7. Overseas disclosure</h2>
          <p>
            Some of our service providers (including Stripe and Supabase) may
            process or store data in locations outside Australia. Where we
            disclose personal information overseas, we take reasonable steps to
            ensure handling is consistent with the APPs (including APP 8).
          </p>

          <h2>8. Security and retention</h2>
          <p>
            We take reasonable steps to protect personal information from misuse,
            interference, loss, unauthorised access, modification, or disclosure.
            No method of transmission or storage is completely secure.
          </p>
          <p>
            We retain personal information for as long as needed to provide the
            service, meet legal obligations, resolve disputes, and enforce
            agreements, after which we take reasonable steps to de-identify or
            delete it.
          </p>

          <h2>9. Access and correction</h2>
          <p>
            Subject to applicable law, you may request access to, or correction
            of, personal information we hold about you. You can also update some
            information via your account settings.
          </p>

          <h2>10. Complaints</h2>
          <p>
            If you have a privacy complaint or question, please contact us at{" "}
            <strong>ajit20patilap@gmail.com</strong>. We will respond within a 
            reasonable time.
          </p>
          <p>
            If you are not satisfied with our response, you may contact the
            Office of the Australian Information Commissioner (OAIC) at{" "}
            <a 
              href="https://www.oaic.gov.au" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
            >
              www.oaic.gov.au
            </a>
            .
          </p>

          <h2>11. Changes</h2>
          <p>
            We may update this Privacy Policy from time to time. The updated
            version will be published on this page with a new &ldquo;Last updated&rdquo;
            date.
          </p>
        </article>
      </div>
    </main>
  );
}
