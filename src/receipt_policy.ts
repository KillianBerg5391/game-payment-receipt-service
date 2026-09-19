import { z } from "zod";

export const ReceiptRequest = z.object({
  receiptId: z.string().min(1).max(80),
  payment: z.object({
    paymentId: z.string().min(1).max(100),
    status: z.enum(["captured", "pending", "refunded"]),
    amountMinor: z.number().int().positive(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    capturedAt: z.string().datetime(),
  }),
  player: z.object({
    playerId: z.string().min(1).max(100),
    displayName: z.string().min(1).max(80),
  }),
  asset: z.object({
    assetId: z.string().min(1).max(100),
    title: z.string().min(1).max(120),
    moderation: z.enum(["approved", "queued", "rejected"]),
  }),
  liveEvent: z.object({
    eventId: z.string().min(1).max(100),
    title: z.string().min(1).max(120),
    status: z.enum(["scheduled", "live", "ended"]),
  }),
});

export type ReceiptRequest = z.infer<typeof ReceiptRequest>;

export type ReceiptDecision =
  | { issue: true }
  | { issue: false; reason: "PAYMENT_NOT_CAPTURED" | "ASSET_NOT_APPROVED" | "EVENT_NOT_LIVE" };

export function decideReceipt(input: ReceiptRequest): ReceiptDecision {
  if (input.payment.status !== "captured") return { issue: false, reason: "PAYMENT_NOT_CAPTURED" };
  if (input.asset.moderation !== "approved") return { issue: false, reason: "ASSET_NOT_APPROVED" };
  if (input.liveEvent.status !== "live") return { issue: false, reason: "EVENT_NOT_LIVE" };
  return { issue: true };
}

export function receiptMarkdown(input: ReceiptRequest): string {
  const amount = new Intl.NumberFormat("en", {
    style: "currency",
    currency: input.payment.currency,
  }).format(input.payment.amountMinor / 100);

  return [
    `# Payment receipt ${input.receiptId}`,
    "",
    `Payment: ${input.payment.paymentId}`,
    `Captured: ${input.payment.capturedAt}`,
    `Amount: ${amount}`,
    `Player: ${input.player.displayName} (${input.player.playerId})`,
    `Asset: ${input.asset.title} (${input.asset.assetId})`,
    `Live event: ${input.liveEvent.title} (${input.liveEvent.eventId})`,
  ].join("\n");
}
