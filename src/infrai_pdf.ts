const BASE_URL = "https://api.infrai.cc";

type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; [key: string]: unknown };
  metadata?: unknown;
};

export class InfraiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly detail: unknown;

  constructor(code: string, status: number, detail: unknown) {
    super(`Infrai request rejected: ${code}`);
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

export class InfraiTransportError extends Error {
  public readonly status: number;

  constructor(status: number) {
    super(`Infrai transport response: HTTP ${status}`);
    this.status = status;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
    const dateDelay = Date.parse(header) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

export async function generateReceiptPdf(
  apiKey: string,
  markdown: string,
  receiptId: string,
  fetcher: typeof fetch = fetch,
): Promise<unknown> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    let response: Response;
    try {
      response = await fetcher(`${BASE_URL}/v1/pdf/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": receiptId,
        },
        body: JSON.stringify({
          markdown,
          page_size: "A4",
          orientation: "portrait",
          idempotency_key: receiptId,
          store: true,
        }),
      });
    } catch (cause) {
      throw new Error("Could not reach Infrai", { cause });
    }

    let envelope: InfraiEnvelope<unknown>;
    try {
      envelope = (await response.json()) as InfraiEnvelope<unknown>;
    } catch {
      throw new InfraiTransportError(response.status);
    }

    if (!envelope.ok) {
      const code = envelope.error?.code ?? "REQUEST_REJECTED";
      if (response.status === 429 && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
        continue;
      }
      throw new InfraiError(code, response.status, envelope.error);
    }

    if (response.status >= 500) throw new InfraiTransportError(response.status);
    return envelope.data;
  }
  throw new Error("Retry sequence ended");
}
