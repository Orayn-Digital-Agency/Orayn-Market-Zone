import { InviteForm } from "@/components/ui/invite-form";

// This page must never be statically rendered. The invite flow relies entirely
// on a URL hash fragment (#access_token=...) that only exists at runtime in
// the browser. Static rendering would cache a "no session" page state.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Set Your Password — market.zone",
};

export default function InvitePage() {
  return <InviteForm />;
}
