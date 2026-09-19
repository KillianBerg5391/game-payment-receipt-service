import assert from "node:assert/strict";
import test from "node:test";
import { decideReceipt, ReceiptRequest } from "../src/receipt_policy.js";

const validRequest = {
  receiptId: "rcpt_123",
  payment: {
    paymentId: "pay_123",
    status: "captured" as const,
    amountMinor: 1299,
    currency: "USD",
    capturedAt: "2026-09-03T08:30:00.000Z",
  },
  player: { playerId: "player_42", displayName: "RiverPilot" },
  asset: { assetId: "skin_88", title: "Aurora Trail", moderation: "approved" as const },
  liveEvent: { eventId: "event_17", title: "Autumn Finals", status: "live" as const },
};

test("queues do not receive a payment receipt before moderation approval", () => {
  const input = ReceiptRequest.parse({
    ...validRequest,
    asset: { ...validRequest.asset, moderation: "queued" },
  });
  assert.deepEqual(decideReceipt(input), { issue: false, reason: "ASSET_NOT_APPROVED" });
});

test("captured payment for an approved live-event asset can receive a receipt", () => {
  const input = ReceiptRequest.parse(validRequest);
  assert.deepEqual(decideReceipt(input), { issue: true });
});
