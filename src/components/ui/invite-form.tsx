"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Eye, EyeOff, ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";

// WHY THIS FILE USES createClient FROM @supabase/supabase-js DIRECTLY:
//
// @supabase/ssr v0.5.x hardcodes flowType:'pkce' on createBrowserClient.
// PKCE flow rejects implicit-grant hashes (access_token in fragment) by throwing
// "Not a valid PKCE flow url." — meaning the invite token is NEVER exchanged and
// getSession() permanently returns null.
//
// Supabase invite emails use the implicit-grant format:
//   /invite#access_token=...&refresh_token=...&type=invite
//
// This client uses flowType:'implicit' so the hash IS processed correctly.
// After updateUser() succeeds, we navigate to /sales via window.location.href
// (full page navigation) so the @supabase/ssr (pkce) client initialises fresh
// and reads the authenticated session from cookies on the new page.

function createInviteClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "implicit",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        storage:
          typeof window !== "undefined" ? window.localStorage : undefined,
      },
    },
  );
}

const inviteSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type InviteFormValues = z.infer<typeof inviteSchema>;

type PageState =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "error"; message: string }
  | { kind: "success" };

export function InviteForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pageState, setPageState] = useState<PageState>({ kind: "loading" });

  // Store the timeout ID so markSessionReady can cancel it from any code path.
  // A plain variable would not survive React Strict Mode's double-invocation.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function markSessionReady() {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setPageState({ kind: "ready" });
  }

  useEffect(() => {
    // Step 1: If Supabase returned an error in the hash (expired or already-used
    // invite link), surface it immediately without going through the session check.
    const hash = window.location.hash;
    if (hash.includes("error=")) {
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const code = params.get("error_code") ?? params.get("error") ?? "";
      const desc = decodeURIComponent(
        (params.get("error_description") ?? "").replace(/\+/g, " "),
      );
      if (code === "otp_expired" || desc.toLowerCase().includes("expired")) {
        setPageState({
          kind: "error",
          message:
            "This invite link has expired. Invite links are valid for 24 hours. Ask your admin to send a new invite from the Agent Management page.",
        });
      } else if (code === "access_denied") {
        setPageState({
          kind: "error",
          message:
            "This invite link has already been used or is invalid. Each invite link can only be used once. Ask your admin to send a new invite.",
        });
      } else {
        setPageState({
          kind: "error",
          message:
            desc ||
            "This invite link is invalid. Ask your admin to send a new invite from the Agent Management page.",
        });
      }
      return;
    }

    // Step 2: Create the implicit-flow client. On construction, detectSessionInUrl:true
    // causes the client to read the URL hash and begin the token-exchange network call.
    // The session is saved to localStorage when the exchange completes.
    // If the hash was already cleared by a previous initialisation (React Strict Mode's
    // second run), _recoverAndRefresh reads from localStorage instead.
    const supabase = createInviteClient();

    // Step 3: Listen for the auth state change. We intentionally do NOT unsubscribe
    // this listener in the cleanup. Reason: React Strict Mode calls cleanup and
    // immediately remounts. If we unsubscribed, the SIGNED_IN event fired during
    // the first mount would be lost. The listener lives on a non-singleton client
    // that will be garbage-collected when the user navigates away.
    supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") && session) {
        markSessionReady();
      }
    });

    // Step 4: Also check synchronously — the session may already be in localStorage
    // if the first Strict Mode render already completed the exchange.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        markSessionReady();
      }
    });

    // Step 5: Error timeout. If neither the event nor getSession finds a session
    // after 14 seconds, the token is genuinely unusable.
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setPageState((current) => {
        if (current.kind !== "ready" && current.kind !== "success") {
          return {
            kind: "error",
            message:
              "This invite link has already been used or is invalid. Each invite link can only be used once. Ask your admin to send a new invite from the Agent Management page.",
          };
        }
        return current;
      });
    }, 14000);

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteFormValues>({ resolver: zodResolver(inviteSchema) });

  async function onSubmit(values: InviteFormValues) {
    setSubmitting(true);
    const supabase = createInviteClient();
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });
    setSubmitting(false);

    if (error) {
      toast.error("Failed to set password", { description: error.message });
      return;
    }

    setPageState({ kind: "success" });
    toast.success("Password set. Welcome to market.zone.");

    // Full page navigation: the @supabase/ssr (pkce) client on /sales initialises
    // fresh and reads the authenticated session from cookies, not localStorage.
    // This avoids a race condition where the browser client session has not yet
    // been flushed to server-side cookies before the next page reads them.
    setTimeout(() => {
      window.location.href = "/sales";
    }, 800);
  }

  // --- Error state ---
  if (pageState.kind === "error") {
    return (
      <div className="bg-white rounded-modal p-8 shadow-modal text-center max-w-md w-full">
        <div className="w-12 h-12 bg-orayn-red-bg rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} className="text-orayn-red" />
        </div>
        <h1 className="font-sora text-xl font-bold text-orayn-navy mb-2">
          Invite Link Invalid
        </h1>
        <p className="text-sm text-orayn-gray mb-6">{pageState.message}</p>
        <div className="p-4 bg-orayn-light rounded-lg text-left text-sm text-orayn-text space-y-2">
          <p className="font-semibold text-orayn-navy">What to do next</p>
          <ol className="list-decimal list-inside space-y-1 text-orayn-gray">
            <li>Contact your admin (Daniel)</li>
            <li>Ask them to open Agent Management in market.zone</li>
            <li>Click Resend Invite on your account</li>
            <li>Use the new link within 24 hours</li>
          </ol>
        </div>
        <a
          href="/login"
          className="mt-6 inline-flex items-center gap-2 text-sm text-orayn-navy font-semibold hover:text-orayn-gold transition-colors"
        >
          <RefreshCw size={14} />
          Back to login
        </a>
      </div>
    );
  }

  // --- Loading / verifying state ---
  if (pageState.kind === "loading") {
    return (
      <div className="bg-white rounded-modal p-8 shadow-modal text-center max-w-md w-full">
        <div className="w-8 h-8 border-2 border-orayn-navy/20 border-t-orayn-navy rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-orayn-gray font-medium">
          Verifying your invite link...
        </p>
        <p className="text-xs text-orayn-gray/60 mt-2">
          This takes a few seconds
        </p>
      </div>
    );
  }

  // --- Success state (brief — navigates away in 800ms) ---
  if (pageState.kind === "success") {
    return (
      <div className="bg-white rounded-modal p-8 shadow-modal text-center max-w-md w-full">
        <div className="w-12 h-12 bg-orayn-green-bg rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={24} className="text-orayn-green" />
        </div>
        <h1 className="font-sora text-xl font-bold text-orayn-navy mb-2">
          Password Set
        </h1>
        <p className="text-sm text-orayn-gray">
          Taking you to the Sales dashboard...
        </p>
        <div className="w-6 h-6 border-2 border-orayn-navy/20 border-t-orayn-navy rounded-full animate-spin mx-auto mt-4" />
      </div>
    );
  }

  // --- Ready state: password form ---
  return (
    <div className="bg-white rounded-modal p-8 shadow-modal max-w-md w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-orayn-green-bg rounded-full flex items-center justify-center">
          <ShieldCheck size={20} className="text-orayn-green" />
        </div>
        <div>
          <h1 className="font-sora text-xl font-bold text-orayn-navy">
            Set your password
          </h1>
          <p className="text-xs text-orayn-gray">
            You only need to do this once
          </p>
        </div>
      </div>

      <div className="mb-5 p-3 bg-orayn-light rounded-lg text-xs text-orayn-gray space-y-0.5">
        <p className="font-semibold text-orayn-text">Password requirements</p>
        <p>At least 8 characters, one uppercase letter, one number</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-orayn-text mb-1.5"
          >
            New password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              {...register("password")}
              className={`input-field pr-10 ${errors.password ? "input-error" : ""}`}
              placeholder="Min 8 chars, 1 uppercase, 1 number"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-orayn-gray hover:text-orayn-navy transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-orayn-red mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-semibold text-orayn-text mb-1.5"
          >
            Confirm password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              {...register("confirmPassword")}
              className={`input-field pr-10 ${errors.confirmPassword ? "input-error" : ""}`}
              placeholder="Repeat your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-orayn-gray hover:text-orayn-navy transition-colors"
              aria-label={
                showConfirm ? "Hide confirm password" : "Show confirm password"
              }
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-orayn-red mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Setting password...
            </span>
          ) : (
            "Set Password and Continue"
          )}
        </button>
      </form>
    </div>
  );
}
