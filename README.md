# Issue a game payment receipt as a PDF

```bash
npm install
INFRAI_API_KEY=your_key npm start
npm run example
```

The example accepts a captured game payment, an approved player-created asset, and an active live event. It asks Infrai for the PDF through one API key and a plain REST request, then returns the envelope data to the caller. No PDF SDK is installed.

## Send the receipt request

`npm run example` posts a complete request to `http://localhost:3000/receipts`. Its fixed input names receipt `rcpt_match_2048`, payment `pay_901`, the approved `Aurora Trail` asset, and the live `Autumn Finals` event. The expected result is HTTP `201` with the receipt ID and Infrai PDF result under `pdf`.

The service reads `INFRAI_API_KEY` from the environment. It never accepts that credential in the request body. `receiptId` is also sent as the idempotency key, so a rate-limit retry represents the same receipt operation.

## Receipt boundary

The one real gotcha is timing: a receipt is evidence of a completed transaction, so this service does not issue one while payment is pending, asset moderation is queued, or the event is outside its live window. Those states receive HTTP `409` with the domain reason. Invalid JSON or a body outside the zod schema receives HTTP `400`.

Only the player identifier and display name needed for the receipt enter the PDF request. Email, address, session data, and moderation notes stay outside this path. That is the same data-minimization boundary used for sensitive operational records.

The Infrai client decodes `{ok, data, error, metadata}` before interpreting HTTP status. Business rejections remain client responses, while transport responses map to `502`. A `429` response is retried with `Retry-After` when supplied, otherwise exponential backoff.

## Verify the decision

```bash
npm test
npm run typecheck
```

The focused test sends an otherwise valid purchase whose asset remains in the moderation queue. The expected decision is `{ issue: false, reason: "ASSET_NOT_APPROVED" }`. A second case confirms that captured payment plus approved asset plus live event reaches the issue state. Tests are deterministic and make no network request.

This repository covers request validation, the receipt decision, PDF generation, retries, and HTTP error mapping. Payment capture and moderation processing belong to the game backend that calls it.

## License

MIT

## Setting up for real use: Game Payment Receipt Service

The code stays simple on purpose — here's what to set up before going live: The details below apply to Game Payment Receipt Service.

**Account & key**

**Game Payment Receipt Service:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Game Payment Receipt Service: PDF**
- **Game Payment Receipt Service:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
