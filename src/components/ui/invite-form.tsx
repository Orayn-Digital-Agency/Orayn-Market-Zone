// @ts-nocheck
"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Eye, EyeOff, ShieldCheck, AlertCircle } from "lucide-react";

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

export function InviteForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Store the timeout ID in a ref so it can be cancelled from anywhere —
  // inside the event handler, inside the getSession callback, or in cleanup.
  // A plain variable would not work here because React Strict Mode runs the
  // effect twice: the second run creates a new timeout, and without a ref
  // we have no way to cancel it once the session arrives.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Called from every code path that successfully confirms a session.
  // Cancels the error timeout and marks the form as ready.
  function markSessionReady() {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setSessionReady(true);
  }

  useEffect(() => {
    // Step 1: If Supabase put an error in the hash (expired / already-used link),
    // show it immediately without going through the session check.
    const hash = window.location.hash;
    if (hash.includes("error=")) {
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const code = params.get("error_code") || params.get("error") || "";
      const desc = decodeURIComponent(
        (params.get("error_description") || "").replace(/\+/g, " "),
      );
      if (code === "otp_expired" || desc.toLowerCase().includes("expired")) {
        setLinkError(
          "This invite link has expired. Ask your admin to send a new invite.",
        );
      } else if (code === "access_denied") {
        setLinkError(
          "This invite link is invalid or has already been used. Ask your admin to send a new invite.",
        );
      } else {
        setLinkError(
          desc ||
            "This invite link is invalid. Ask your admin to send a new invite.",
        );
      }
      return;
    }

    // Step 2: Create the implicit-flow client.
    // On construction, detectSessionInUrl:true causes the client to read the
    // URL hash and begin the token-exchange network call in the background.
    // The session is saved to localStorage when the exchange completes.
    // If the hash was already cleared by a previous initialisation (React Strict
    // Mode's second run), _recoverAndRefresh reads from localStorage instead.
    const supabase = createInviteClient();

    // Step 3: Listen for the session. We intentionally do NOT unsubscribe this
    // listener in the cleanup. Reason: React Strict Mode calls cleanup and
    // immediately remounts. If we unsubscribed, the SIGNED_IN event fired during
    // the first mount would be lost. The listener lives on a non-singleton client
    // that will be garbage-collected when the user navigates away.
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (
          (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") &&
          session
        ) {
          // Cancel the error timeout immediately — the session is valid.
          markSessionReady();
        }
      },
    );

    // Step 4: Also check synchronously in case the session was already saved to
    // localStorage by the first Strict Mode run before this second run started.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        markSessionReady();
      }
    });

    // Step 5: Set the error timeout.
    // CRITICAL: store it in timeoutRef so markSessionReady() can cancel it.
    // If the session is found (steps 3 or 4), markSessionReady cancels this
    // timeout before it fires, so the error screen is never shown.
    // Only if neither the event nor getSession finds a session after 12 seconds
    // do we show the error — meaning the token is genuinely unusable.
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      // At this point Supabase has already cleared the hash, so we check
      // sessionReady state rather than the hash to decide the error message.
      setSessionReady((current) => {
        if (!current) {
          setLinkError(
            "This invite link has already been used or is invalid. Each link can only be used once. Ask your admin to send a new invite.",
          );
        }
        return current;
      });
    }, 12000);

    return () => {
      // Cleanup: cancel the timeout if this effect re-runs (Strict Mode) or
      // if the component unmounts before the timeout fires.
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
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
  });

  async function onSubmit(values: InviteFormValues) {
    setLoading(true);
    const supabase = createInviteClient();
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });
    setLoading(false);

    if (error) {
      toast.error("Failed to set password", { description: error.message });
      return;
    }

    toast.success("Password set. Welcome to market.zone.");
    // Full page navigation so the @supabase/ssr (pkce) client initialises
    // fresh on /dashboard and reads the authenticated session from cookies.
    window.location.href = "/dashboard";
  }

  if (linkError) {
    return (
      <div className="bg-white rounded-modal p-8 shadow-modal text-center max-w-md w-full">
        <div className="w-12 h-12 bg-orayn-red-bg rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} className="text-orayn-red" />
        </div>
        <h1 className="font-sora text-xl font-bold text-orayn-navy mb-2">
          Invite Link Invalid
        </h1>
        <p className="text-sm text-orayn-gray mb-6">{linkError}</p>
        <div className="p-4 bg-orayn-light rounded-lg text-left text-sm text-orayn-text space-y-2">
          <p className="font-semibold">What to do</p>
          <p>
            Ask your admin to re-send your invite from the Agent Management page
            in market.zone. Use the new link within 24 hours.
          </p>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
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
              aria-label="Toggle password visibility"
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
              aria-label="Toggle confirm password visibility"
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
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
        >
          {loading ? (
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
