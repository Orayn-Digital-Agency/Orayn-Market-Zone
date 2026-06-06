import { Suspense } from "react";
import { LoginForm } from "@/components/ui/login-form";

// Login page is always dynamic: it reads searchParams (redirectTo) at runtime
// and depends on the current auth session.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign In — market.zone",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
