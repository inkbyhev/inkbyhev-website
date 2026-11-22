export async function onRequestGet({ env }) {
  const reply = (status, body) => Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

  if (!env.SQUARE_CATALOG_TOKEN) {
    return reply(503, { ok: false, reason: "square_token_missing" });
  }

  try {
    const response = await fetch("https://connect.squareup.com/v2/catalog/list?types=ITEM", {
      headers: {
        Authorization: `Bearer ${env.SQUARE_CATALOG_TOKEN}`,
        "Square-Version": "2026-09-16",
        Accept: "application/json",
      },
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      return reply(502, { ok: false, reason: "square_request_failed", squareStatus: response.status });
    }
    const catalog = await response.json();
    return reply(200, { ok: true, itemCountOnFirstPage: catalog.objects?.length ?? 0 });
  } catch {
    return reply(502, { ok: false, reason: "square_unreachable" });
  }
}
