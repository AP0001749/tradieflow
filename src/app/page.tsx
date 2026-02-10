import Link from "next/link";
import { CheckCircle, Clock, DollarSign, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-background to-emerald-50/30 dark:from-sky-950/40 dark:via-background dark:to-emerald-950/20" />
        
        <div className="relative container mx-auto px-4 pt-24 pb-28 md:pt-36 md:pb-36">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="tf-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
              Get more cleaning jobs{" "}
              <span className="bg-gradient-to-r from-sky-500 to-emerald-500 bg-clip-text text-transparent">
                automatically
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-foreground/80 max-w-2xl mx-auto">
              Capture leads, follow up instantly, reduce no-shows.
            </p>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Lead capture + booking + automated follow-ups for Australian cleaning businesses.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-4">
              <Link 
                href="/book"
                className="inline-flex items-center justify-center w-full sm:w-auto text-base h-12 px-8 rounded-lg font-semibold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                Book a Demo
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center w-full sm:w-auto text-base h-12 px-8 rounded-lg font-semibold border border-input bg-background text-foreground hover:bg-accent transition-colors"
              >
                Try It Now
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">Free plan available &mdash; start receiving leads</p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 rounded-xl bg-sky-500/10 dark:bg-sky-500/20">
                  <Smartphone className="h-7 w-7 text-sky-500" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground">Invoice From Your Phone</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Finish the job, create the invoice on-site, and send it before you leave. No laptop needed.
              </p>
            </Card>

            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/20">
                  <DollarSign className="h-7 w-7 text-amber-500" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground">Get Paid Faster</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Send professional invoices instantly. No more waiting weeks to do paperwork.
              </p>
            </Card>

            <Card className="p-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20">
                  <Clock className="h-7 w-7 text-emerald-500" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground">Stop Working at Night</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                No more admin after dinner. Finish your paperwork in seconds, not hours.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-24 border-t border-border bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto space-y-10">
            <div className="text-center space-y-3">
              <h2 className="tf-display text-3xl md:text-4xl font-bold text-foreground">Everything You Need. Nothing You Don&apos;t.</h2>
              <p className="text-lg text-muted-foreground">Built for cleaning businesses, not accountants.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                 "Create quotes & invoices for cleaning jobs in 30 seconds",
                 "Send invoices by email",
                 "Track which customers owe you money",
                 "Manage cleaning jobs & customer contacts",
                 "Work on your phone, tablet, or laptop",
                 "Australian-friendly (GST ready)"
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border">
                  <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="tf-display text-3xl md:text-4xl font-bold text-foreground">
              Ready to Get More Cleaning Jobs?
            </h2>
            <Link 
              href="/book"
              className="inline-flex items-center justify-center text-base h-12 px-8 rounded-lg font-semibold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              Visit Booking Page
            </Link>
            <p className="text-sm text-muted-foreground">Join Australian cleaning businesses getting more paid jobs</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <div>&copy; 2026 TradieFlow. Built for Australian cleaning businesses.</div>
            <div className="flex gap-6">
              <Link href="/legal/privacy" className="hover:text-foreground">Privacy</Link>
              <Link href="/legal/terms" className="hover:text-foreground">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
