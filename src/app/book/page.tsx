import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function BookIndexPage() {
  return (
    <div className="page-shell space-y-8">
      <div className="text-center space-y-3">
        <p className="hero-pill">Booking Links</p>
        <h1 className="tf-display text-4xl md:text-5xl">Use your unique booking URL</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Demo and lead-capture forms are business-specific. Open the full URL from your
          dashboard settings so every request lands in the correct workspace.
        </p>
      </div>

      <Card className="glass-card max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Need your booking link?</CardTitle>
          <CardDescription>
            Sign in to TradieFlow and copy the booking URL shown in Settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Link href="/login">
            <Button className="primary-btn">Sign in</Button>
          </Link>
          <p className="text-sm text-muted-foreground">
            Example format: <span className="font-mono">/book/western-climate-air</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
