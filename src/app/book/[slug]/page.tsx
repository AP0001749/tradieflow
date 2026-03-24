import { notFound } from "next/navigation";
import { BookingRequestForm } from "@/components/book/booking-request-form";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function BookSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: profile, error } = await supabase
    .from("business_profile")
    .select("business_name, booking_url_slug")
    .eq("booking_url_slug", slug)
    .maybeSingle();

  if (error || !profile) {
    notFound();
  }

  return (
    <div className="page-shell space-y-8">
      <div className="text-center space-y-3">
        <p className="hero-pill">TradieFlow for cleaners</p>
        <h1 className="tf-display text-4xl md:text-5xl">
          Request your TradieFlow setup demo
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Tell {profile.business_name} about your cleaning business and they&apos;ll help
          you get your onboarding workspace configured.
        </p>
        <p className="text-sm text-muted-foreground">
          This link is unique to {profile.business_name}, so your request goes to the
          correct workspace.
        </p>
      </div>

      <BookingRequestForm
        bookingUrlSlug={profile.booking_url_slug}
        businessName={profile.business_name}
      />
    </div>
  );
}
