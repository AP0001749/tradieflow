import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | TradieFlow",
  description:
    "Terms of Service for TradieFlow (Australia) – subscriptions, acceptable use, and liability terms.",
};

export default function TermsOfServicePage() {
  const lastUpdated = "11 January 2026";

  return (
    <main className="container py-10 min-h-screen">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
              Terms of Service
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
          <h2>1. Agreement</h2>
          <p>
            These Terms of Service (Terms) govern your access to and use of
            TradieFlow (the Service). By creating an account, accessing, or
            using the Service, you agree to these Terms.
          </p>

          <h2>2. Who we are</h2>
          <p>
            TradieFlow is operated by <strong>Ajit Patil</strong> (ABN 74 961 169
            156) (we, us, our).
          </p>

          <h2>3. Accounts and subscriptions</h2>
          <ul>
            <li>
              You must provide accurate information and keep your account
              details up to date.
            </li>
            <li>
              Paid subscriptions are billed on a recurring basis via Stripe.
              Fees are displayed at checkout and may change with notice.
            </li>
            <li>
              You are responsible for all activity that occurs under your
              account.
            </li>
          </ul>

          <h2>4. User content (including job site photos)</h2>
          <p>
            You may upload content to the Service, including photographic images
            of job sites (User Content).
          </p>
          <ul>
            <li>
              <strong>Responsibility</strong>: you are responsible for the
              legality, accuracy, and quality of User Content you upload.
            </li>
            <li>
              <strong>Permissions</strong>: you must have all necessary rights
              and permissions to upload and use User Content (including any
              required consents where people are identifiable).
            </li>
            <li>
              <strong>Prohibited content</strong>: you must not upload content
              that is unlawful, defamatory, infringing, or that violates privacy
              or confidentiality obligations.
            </li>
          </ul>

          <h2>5. Availability and “as is”</h2>
          <p>
            The Service is provided on an “as is” and “as available” basis. We
            do not warrant that the Service will be uninterrupted, error-free,
            or available 100% of the time.
          </p>

          <h2>6. Australian Consumer Law</h2>
          <p>
            Nothing in these Terms excludes, restricts, or modifies any consumer
            guarantee, right, or remedy conferred by the Australian Consumer Law
            or other applicable laws that cannot be excluded.
          </p>

          <h2>7. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law (including the Australian
            Consumer Law), and except for liability that cannot be excluded, our
            total aggregate liability to you arising out of or in connection
            with the Service (including negligence) is limited to the total fees
            paid by you for the Service in the 12 months immediately preceding
            the event giving rise to the claim.
          </p>
          <p>
            To the maximum extent permitted by law, we are not liable for any
            indirect or consequential loss, loss of profit, loss of revenue,
            loss of data, or business interruption.
          </p>

          <h2>8. Suspension and termination</h2>
          <p>
            We may suspend or terminate your access to the Service if you breach
            these Terms, if required by law, or to protect the security or
            integrity of the Service. You may stop using the Service at any
            time.
          </p>

          <h2>9. Governing law</h2>
          <p>
            These Terms are governed by the laws of Victoria, Australia. You
            submit to the non-exclusive jurisdiction of the courts of Victoria.
          </p>

          <h2>10. Changes</h2>
          <p>
            We may update these Terms from time to time. The updated Terms will
            be published on this page with a new “Last updated” date.
          </p>
        </article>
      </div>
    </main>
  );
}
