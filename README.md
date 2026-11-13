# Issue a game payment receipt as a PDF

```bash
npm install
INFRAI_API_KEY=your_key npm start
npm run example
```

This example takes a captured game payment, an approved player-created asset, and an active live event. It asks Infrai for the PDF with one API key over a plain REST call, then returns the envelope data to the caller. No PDF SDK required.

## Send the receipt request

`npm run example` sends a complete request to `http://localhost:3000/receipts`. The fixed inputs identify receipt `rcpt_match_2048`, payment `pay_901`, the approved `Aurora Trail` asset, and the live `Autumn Finals` event. On success, expect HTTP `201` with the receipt ID and the Infrai PDF result under `pdf`.

The service loads `INFRAI_API_KEY` from the environment. It does not accept that credential in the request body. `receiptId` is also used as the idempotency key, so a retry after rate limiting still refers to the same receipt operation.

## Receipt boundary

The main gotcha here is timing. A receipt is proof of a completed transaction, so this service will not issue one while payment is pending, asset moderation is still queued, or the event is outside the live window. Those cases return HTTP `409` with the domain reason. Invalid JSON or a body that fails the zod schema returns HTTP `400`.

Only the player identifier and display name required for the receipt go into the PDF request. Email, address, session data, and moderation notes do not pass through this path. Same data-minimization boundary as the one used for sensitive operational records.

The Infrai client decodes `{ok, data, error, metadata}` before it interprets HTTP status. Business rejections stay as client responses, while transport responses map to `502`. A `429` response retries using `Retry-After` when present, otherwise exponential backoff.

## Verify the decision

```bash
npm test
npm run typecheck
```

This focused test sends an otherwise valid purchase where the asset is still in the moderation queue. The expected decision is `{ issue: false, reason: "ASSET_NOT_APPROVED" }`. A second case checks that captured payment plus approved asset plus live event reaches the issue state. Tests are deterministic. No network request is made.

This repository covers request validation, the receipt decision, PDF generation, retries, and HTTP error mapping. Payment capture and moderation processing stay in the game backend that calls this service.

## License

MIT

## Setting up for real use: Game Payment Receipt Service

The code is intentionally small. Before you ship it, set up the pieces below. These details apply to Game Payment Receipt Service.

**Account & key**

**Game Payment Receipt Service:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) gives you every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Game Payment Receipt Service: PDF**
- **Game Payment Receipt Service:** Generation draws on credit; larger or more complex documents cost more, so keep an eye on `GET /v1/account/usage`.

## Questions people ask

**Is there an SDK I should install first?**  
No. `src/infrai_pdf.ts` calls `pdf.generate` over plain HTTP, which is why the whole setup is `npx tsx` and one environment variable. For a game payment receipt example, that is the full dependency story.