import { notFound } from "next/navigation";
import { BookingRequestForm } from "@/components/book/booking-request-form";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.generated";

type PublicBookingProfile =
  Database["public"]["Functions"]["get_public_business_profile_by_slug"]["Returns"][number];

export default async function BookSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("get_public_business_profile_by_slug", {
      p_booking_url_slug: slug,
    })
    .maybeSingle();

  const profile = data as PublicBookingProfile | null;

  if (error || !profile) {
    notFound();
  }

  return (
    <div className="page-shell space-y-8">
      <div className="text-center space-y-3">
        <p className="hero-pill">Zero-Leak Demo</p>
        <h1 className="tf-display text-4xl md:text-5xl">
          See how {profile.business_name} can plug missed-call leaks
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Share a few details about your trade business and {profile.business_name}
          will map out the missed-call text back, quote follow-up, and review flow for
          your team.
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
