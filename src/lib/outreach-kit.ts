import { getTradeFocusAudienceLabel } from "@/lib/trade-focus";

type OutreachTemplateValues = {
  bookingUrl: string;
  businessName: string;
  senderName?: string | null;
  tradeFocus?: string | null;
};

function getSenderLabel(senderName?: string | null) {
  return senderName?.trim() || "the TradieFlow team";
}

function getAudienceLabel(tradeFocus?: string | null) {
  return getTradeFocusAudienceLabel(tradeFocus).replace("multi-trade", "trade");
}

export function buildBookingUrl({
  appUrl,
  slug,
}: {
  appUrl?: string | null;
  slug?: string | null;
}) {
  if (!slug) {
    return "/dashboard/settings";
  }

  const baseUrl = appUrl?.trim().replace(/\/+$/, "") || "";
  return `${baseUrl}/book/${slug}`;
}

export function buildOutreachScripts({
  bookingUrl,
  businessName,
  senderName,
  tradeFocus,
}: OutreachTemplateValues) {
  const sender = getSenderLabel(senderName);
  const audience = getAudienceLabel(tradeFocus);

  return [
    {
      id: "warm-sms",
      title: "Warm SMS Audit Opener",
      channel: "SMS",
      description:
        "Use only where you have consent, a prior relationship, or a clearly compliant basis to message. Keep the opt-out line intact.",
      body: `Hi, ${sender} from ${businessName}. We help ${audience} teams stop emergency jobs leaking when calls are missed on-site. If useful, here is the quick dispatch-audit link: ${bookingUrl}. Reply STOP and I will not message again.`,
    },
    {
      id: "email",
      title: "Email Dispatch Audit Opener",
      channel: "Email",
      description:
        "Best for referrals, existing industry contacts, and manually reviewed businesses where an email conversation is appropriate.",
      body: `Subject: Quick missed-call dispatch audit for your trade team

Hi,

I am ${sender} from ${businessName}. We help ${audience} businesses recover missed emergency calls, follow up quotes after site visits, and turn paid jobs into Google reviews.

The audit is simple: we map where calls, quotes, and review requests currently leak, then show the workflow that plugs those gaps.

You can request the audit here: ${bookingUrl}

If this is not relevant, reply and I will not follow up.`,
    },
    {
      id: "manual-form",
      title: "Manual Website Enquiry",
      channel: "Contact form",
      description:
        "Use for one-to-one manual enquiries only. Do not automate form submissions or bypass stated contact preferences.",
      body: `Hi, this is ${sender} from ${businessName}. I am reaching out manually because your team appears to handle high-urgency ${audience} work.

We help trade operators add missed-call text-back, quote follow-up, and review request workflows so urgent jobs do not leak while the team is on the tools.

If the owner or operations manager wants a quick dispatch audit, the link is here: ${bookingUrl}

Thanks, and no need to respond if this is not relevant.`,
    },
  ];
}

export function buildOutreachCadence(plan: "light" | "standard" | "push" = "standard") {
  switch (plan) {
    case "light":
      return {
        dailyTouches: 15,
        reviewBlocks: 1,
        callbackSlots: 3,
        label: "Light manual cadence",
      };
    case "push":
      return {
        dailyTouches: 60,
        reviewBlocks: 3,
        callbackSlots: 10,
        label: "Push cadence",
      };
    default:
      return {
        dailyTouches: 30,
        reviewBlocks: 2,
        callbackSlots: 6,
        label: "Standard cadence",
      };
  }
}
