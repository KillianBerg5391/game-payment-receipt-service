import { createServer } from "node:http";
import { ZodError } from "zod";
import { generateReceiptPdf, InfraiError, InfraiTransportError } from "./infrai_pdf.js";
import { decideReceipt, ReceiptRequest, receiptMarkdown } from "./receipt_policy.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    length += buffer.length;
    if (length > 64 * 1024) throw new RangeError("Request body is too large");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(response: import("node:http").ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/receipts") {
    send(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const input = ReceiptRequest.parse(await readJson(request));
    const decision = decideReceipt(input);
    if (!decision.issue) {
      send(response, 409, decision);
      return;
    }

    const pdf = await generateReceiptPdf(apiKey, receiptMarkdown(input), input.receiptId);
    send(response, 201, { receiptId: input.receiptId, pdf });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError || error instanceof RangeError) {
      send(response, 400, { error: "Invalid receipt request" });
    } else if (error instanceof InfraiError) {
      send(response, error.status >= 400 && error.status < 500 ? error.status : 502, {
        error: error.code,
        detail: error.detail,
      });
    } else if (error instanceof InfraiTransportError) {
      send(response, 502, { error: "PDF transport error" });
    } else {
      send(response, 500, { error: "Receipt service error" });
    }
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Receipt service listening on http://localhost:${port}`));
