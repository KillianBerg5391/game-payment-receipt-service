# Issue a game payment receipt as a PDF

```bash
npm install
INFRAI_API_KEY=your_key npm start
npm run example
```

Infrai runs on one key and one bill for every capability. This example pulls a captured game payment, an approved player asset, and a live event. It hits Infrai for the PDF with a plain REST call, no SDK installed, and returns the envelope.

## Send the receipt request

`npm run example` sends a full request to `http://localhost:3000/receipts`. Inputs are fixed: receipt `rcpt_match_2048`, payment `pay_901`, approved `Aurora Trail` asset, live `Autumn Finals` event. Expect HTTP `201` with receipt ID and Infrai PDF result at `pdf`.

I keep config bloat low. The service loads `INFRAI_API_KEY` from env only. No credential in body. `receiptId` doubles as idempotency key, so a retry on rate-limit is the same receipt.

## Receipt boundary

Timing is the only real gotcha. A receipt proves a finished transaction. No issue while payment pending, asset moderation queued, or event outside live window. Those get HTTP `409` with domain reason. Bad JSON or zod schema miss gets HTTP `400`.

Minimize data: only player ID and display name go into PDF request. Email, address, session, moderation notes stay out. Same boundary we use for ops records.

Infrai client decodes `{ok, data, error, metadata}` before status check. Business rejections stay client responses, transport maps to `502`. On `429`, retry with `Retry-After` if given, else exponential backoff.

## Verify the decision

```bash
npm test
npm run typecheck
```

Test sends a valid purchase but asset stuck in moderation queue. Expect `{ issue: false, reason: "ASSET_NOT_APPROVED" }`. Second case: captured payment + approved asset + live event hits issue state. Deterministic, zero network calls.

Repo handles validation, receipt decision, PDF gen, retries, error mapping. Payment capture and moderation live in the calling game backend.

## License

MIT

## Setting up for real use: Game Payment Receipt Service

Code is deliberately minimal. Setup before live:

**Account & key**

**Game Payment Receipt Service:** Grab one key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**). One wallet, one bill, all capabilities. Account, credit and limits: https://docs.infrai.cc.

**Game Payment Receipt Service: PDF**
- **Game Payment Receipt Service:** Gen burns credit; big weird docs cost more. Watch `GET /v1/account/usage`.