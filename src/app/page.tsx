import Link from "next/link";
import { CheckCircle, Clock, DollarSign, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,_var(--tw-gradient-stops))] from-sky-300/40 via-background to-background dark:from-sky-900/40 dark:via-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_var(--tw-gradient-stops))] from-emerald-300/30 via-transparent to-transparent dark:from-emerald-900/30" />
        
        <div className="relative container mx-auto px-4 pt-20 pb-24 md:pt-32 md:pb-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Main Headline */}
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-sky-500 to-emerald-500 bg-clip-text text-transparent">
                Get more cleaning jobs automatically --
              </span>
              <br />
              <span className="text-foreground">capture leads, follow up instantly, reduce no-shows.</span>
            </h1>

            {/* Sub-Headline */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Lead capture + booking + automated follow-ups for Australian cleaning businesses.
            </p>

            {/* CTA Button */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Link 
                href="/book"
                className="inline-flex items-center justify-center w-full sm:w-auto text-lg h-14 px-8 rounded-md font-semibold bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white shadow-lg shadow-sky-500/25 transition-all"
              >
                Get started -- Book a demo / Try it now
              </Link>
              <p className="text-sm text-muted-foreground">Free plan available -- start receiving leads</p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="relative py-20 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Benefit 1 */}
            <Card className="p-6 text-center space-y-4 border-border/40 bg-card/60 backdrop-blur">
              <div className="flex justify-center">
                <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500/20 to-emerald-500/20 border border-sky-500/30">
                  <Smartphone className="h-8 w-8 text-sky-500" />
                </div>
              </div>
              <h3 className="text-xl font-semibold">Invoice From Your Phone</h3>
              <p className="text-muted-foreground">
                Finish the job, create the invoice on-site, and send it before you leave. No laptop needed.
              </p>
            </Card>

            {/* Benefit 2 */}
            <Card className="p-6 text-center space-y-4 border-border/40 bg-card/60 backdrop-blur">
              <div className="flex justify-center">
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                  <DollarSign className="h-8 w-8 text-amber-500" />
                </div>
              </div>
              <h3 className="text-xl font-semibold">Get Paid Faster</h3>
              <p className="text-muted-foreground">
                Send professional invoices instantly. No more waiting weeks to do paperwork.
              </p>
            </Card>

            {/* Benefit 3 */}
            <Card className="p-6 text-center space-y-4 border-border/40 bg-card/60 backdrop-blur">
              <div className="flex justify-center">
                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                  <Clock className="h-8 w-8 text-emerald-500" />
                </div>
              </div>
              <h3 className="text-xl font-semibold">Stop Working at Night</h3>
              <p className="text-muted-foreground">
                No more admin after dinner. Finish your paperwork in seconds, not hours.
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* Social Proof / Simple Features */}
      <div className="relative py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold">Everything You Need. Nothing You Don't.</h2>
                <p className="text-xl text-muted-foreground">Built for cleaning businesses, not accountants.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {[
                 "Create quotes & invoices for cleaning jobs in 30 seconds",
                 "Send invoices by email",
                 "Track which customers owe you money",
                 "Manage cleaning jobs & customer contacts",
                 "Work on your phone, tablet, or laptop",
                 "Australian-friendly (GST ready)"
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                  <span className="text-lg text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="relative py-20 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to Get More Cleaning Jobs?
            </h2>
            <Link 
              href="/book"
              className="inline-flex items-center justify-center text-lg h-14 px-8 rounded-md font-semibold bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white shadow-lg shadow-sky-500/25 transition-all"
            >
              Visit Booking Page
            </Link>
            <p className="text-sm text-muted-foreground">Join Australian cleaning businesses getting more paid jobs</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative py-8 border-t border-border/40">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <div>(c) 2026 TradieFlow. Built for Australian cleaning businesses.</div>
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
