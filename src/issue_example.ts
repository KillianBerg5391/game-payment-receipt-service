export {};

const response = await fetch("http://localhost:3000/receipts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    receiptId: "rcpt_match_2048",
    payment: {
      paymentId: "pay_901",
      status: "captured",
      amountMinor: 1299,
      currency: "USD",
      capturedAt: "2026-09-03T08:30:00.000Z",
    },
    player: { playerId: "player_42", displayName: "RiverPilot" },
    asset: { assetId: "skin_88", title: "Aurora Trail", moderation: "approved" },
    liveEvent: { eventId: "event_17", title: "Autumn Finals", status: "live" },
  }),
});

console.log(response.status, await response.json());
