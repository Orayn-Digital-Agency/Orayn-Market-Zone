"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { Modal } from "@/components/ui/modal";
import { formatNairaDirect, parsePriceRangeMax } from "@/lib/format";
import type { Lead, ServiceTier } from "@/types/supabase";
import { toast } from "sonner";
import { TrendingUp, Info, Link, Copy, CheckCircle } from "lucide-react";

interface DealClosedModalProps {
  open: boolean;
  onClose: () => void;
  lead: Lead;
  agentId: string;
}

const schema = z.object({
  dealAmount: z
    .string()
    .min(1, "Enter the deal amount")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, {
      message: "Enter a valid amount greater than 0",
    }),
  paystackLink: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (!v || v.trim() === "") return true;
        try {
          const url = new URL(v.trim());
          return url.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Enter a valid HTTPS payment link or leave blank" },
    ),
});

type FormValues = z.infer<typeof schema>;

const TIER_PRICE_RANGE_MAX: Record<ServiceTier, number> = {
  Starter: 300000,
  Business: 500000,
  Premium: 1000000,
  Platform: 9999999,
};

export function DealClosedModal({
  open,
  onClose,
  lead,
  agentId,
}: DealClosedModalProps) {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<{
    rate: 0.25 | 0.3;
    amount: number;
  } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const priceRangeMax = lead.price_range
    ? parsePriceRangeMax(lead.price_range)
    : TIER_PRICE_RANGE_MAX[(lead.service_tier as ServiceTier) ?? "Starter"];

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const dealAmountRaw = watch("dealAmount");
  const paystackLinkRaw = watch("paystackLink");

  useEffect(() => {
    const amount = Number(dealAmountRaw);
    if (!isNaN(amount) && amount > 0) {
      const rate = amount > priceRangeMax ? 0.3 : 0.25;
      setPreview({ rate, amount: Math.round(amount * rate) });
    } else {
      setPreview(null);
    }
  }, [dealAmountRaw, priceRangeMax]);

  const upfront60 = (() => {
    const amount = Number(dealAmountRaw);
    if (!isNaN(amount) && amount > 0) return Math.round(amount * 0.6);
    return null;
  })();

  async function copyLink() {
    if (!paystackLinkRaw?.trim()) return;
    try {
      await navigator.clipboard.writeText(paystackLinkRaw.trim());
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error("Could not copy — select and copy manually");
    }
  }

  const closeDealMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const supabase = createSupabaseBrowserClient();
      const amount = Number(values.dealAmount);
      const rate = amount > priceRangeMax ? 0.3 : 0.25;
      const commission = Math.round(amount * rate);
      const paystackLink = values.paystackLink?.trim() || null;

      const { error: leadError } = await supabase
        .from("leads")
        .update({
          status: "closed",
          deal_amount: amount,
          commission_rate: rate,
          commission_amount: commission,
        })
        .eq("id", lead.id);
      if (leadError) throw leadError;

      const now = new Date().toISOString();
      const payoutMonth = now.slice(0, 7);
      const { error: dealError } = await supabase.from("deals").insert({
        lead_id: lead.id,
        agent_id: agentId,
        deal_amount: amount,
        commission_rate: rate,
        commission_amount: commission,
        closed_at: now,
        payout_month: payoutMonth,
        payout_status: "pending",
        payment_confirmed: false,
        ...(paystackLink ? { paystack_link: paystackLink } : {}),
      });
      if (dealError) throw dealError;

      await supabase.from("activity_log").insert({
        agent_id: agentId,
        lead_id: lead.id,
        action: "closed",
        metadata: {
          deal_amount: amount,
          commission_rate: rate,
          commission_amount: commission,
          paystack_link_added: !!paystackLink,
        },
      });
    },
    onSuccess: () => {
      toast.success("Deal closed!", {
        description: `Commission of ${formatNairaDirect(preview?.amount ?? 0)} recorded.`,
      });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["activity-log"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      reset();
      setPreview(null);
      onClose();
    },
    onError: (err: Error) => {
      toast.error("Failed to close deal", { description: err.message });
    },
  });

  function handleClose() {
    if (closeDealMutation.isPending) return;
    reset();
    setPreview(null);
    setLinkCopied(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Close Deal" size="md">
      <div className="space-y-4">
        {/* Lead summary */}
        <div className="bg-orayn-light rounded-lg p-3 space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide text-orayn-gray">
            Business
          </p>
          <p className="font-sora text-sm font-bold text-orayn-navy leading-snug">
            {lead.business_name}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <span className="text-xs text-orayn-gray">
              Tier:{" "}
              <span className="font-semibold text-orayn-text">
                {lead.service_tier ?? "—"}
              </span>
            </span>
            <span className="text-xs text-orayn-gray">
              Listed range:{" "}
              <span className="font-semibold text-orayn-text">
                {lead.price_range ?? "—"}
              </span>
            </span>
          </div>
        </div>

        <form
          onSubmit={handleSubmit((v) => closeDealMutation.mutate(v))}
          noValidate
          className="space-y-4"
        >
          {/* Deal amount */}
          <div>
            <label
              htmlFor="dealAmount"
              className="block text-sm font-semibold text-orayn-text mb-1.5"
            >
              Agreed deal amount (NGN)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orayn-gray text-sm font-semibold">
                ₦
              </span>
              <input
                id="dealAmount"
                type="number"
                min="1"
                step="1000"
                {...register("dealAmount")}
                className={`input-field pl-7 ${errors.dealAmount ? "input-error" : ""}`}
                placeholder="e.g. 280000"
              />
            </div>
            {errors.dealAmount && (
              <p className="text-xs text-orayn-red mt-1">
                {errors.dealAmount.message}
              </p>
            )}
          </div>

          {/* Commission preview */}
          {preview && (
            <div className="bg-orayn-green-bg border border-orayn-green/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-orayn-green" />
                <p className="text-xs font-bold text-orayn-green">
                  Commission Preview
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-orayn-gray">Rate</p>
                  <p className="font-sora text-base font-bold text-orayn-navy leading-tight">
                    {preview.rate === 0.3 ? "30%" : "25%"}
                    {preview.rate === 0.3 && (
                      <span className="ml-1 badge bg-orayn-gold text-orayn-dark text-xs">
                        Above range
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-orayn-gray">Your commission</p>
                  <p className="font-sora text-base font-bold text-orayn-green leading-tight">
                    {formatNairaDirect(preview.amount)}
                  </p>
                </div>
              </div>
              {upfront60 !== null && (
                <div className="mt-2 pt-2 border-t border-orayn-green/20 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-orayn-gray">60% upfront due</p>
                    <p className="text-sm font-semibold text-orayn-text">
                      {formatNairaDirect(upfront60)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-orayn-gray">40% on delivery</p>
                    <p className="text-sm font-semibold text-orayn-text">
                      {formatNairaDirect(
                        Math.round(Number(dealAmountRaw) * 0.4),
                      )}
                    </p>
                  </div>
                </div>
              )}
              {preview.rate === 0.3 && (
                <div className="flex items-start gap-1.5 mt-2 text-xs text-orayn-amber">
                  <Info size={11} className="flex-shrink-0 mt-0.5" />
                  Deal exceeds listed range — 30% rate applies.
                </div>
              )}
            </div>
          )}

          {/* Paystack payment link */}
          <div>
            <label
              htmlFor="paystackLink"
              className="block text-sm font-semibold text-orayn-text mb-1"
            >
              Paystack payment link{" "}
              <span className="text-orayn-gray font-normal">(optional)</span>
            </label>
            <p className="text-xs text-orayn-gray mb-1.5">
              Paste the Paystack link for the 60% upfront payment. Saved to the
              deal record.
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orayn-gray">
                <Link size={13} />
              </span>
              <input
                id="paystackLink"
                type="url"
                {...register("paystackLink")}
                className={`input-field pl-8 pr-9 ${errors.paystackLink ? "input-error" : ""}`}
                placeholder="https://paystack.com/pay/..."
              />
              {paystackLinkRaw?.trim() && !errors.paystackLink && (
                <button
                  type="button"
                  onClick={copyLink}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-orayn-gray hover:text-orayn-navy transition-colors"
                  aria-label="Copy payment link"
                  title="Copy to clipboard"
                >
                  {linkCopied ? (
                    <CheckCircle size={13} className="text-orayn-green" />
                  ) : (
                    <Copy size={13} />
                  )}
                </button>
              )}
            </div>
            {errors.paystackLink && (
              <p className="text-xs text-orayn-red mt-1">
                {errors.paystackLink.message}
              </p>
            )}
            {linkCopied && (
              <p className="text-xs text-orayn-green mt-1">
                Copied to clipboard
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
              disabled={closeDealMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={closeDealMutation.isPending || !preview}
              className="btn-success flex items-center gap-2"
            >
              {closeDealMutation.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Closing...
                </>
              ) : (
                "Confirm Deal Closed"
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
