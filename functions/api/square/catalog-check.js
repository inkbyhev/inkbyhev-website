// Preview smoke test. Expose only the first-page item count.
export async function onRequestGet({ env }) {
  const reply = (status, body) => Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

  if (!env.SQUARE_CATALOG_TOKEN) {
    return reply(503, { ok: false, reason: "square_token_missing" });
  }

  const token = env.SQUARE_CATALOG_TOKEN.trim();
  if (!token || /[^\x21-\x7e]/.test(token)) {
    return reply(503, { ok: false, reason: "square_token_contains_invalid_characters" });
  }

  let stage = "request";
  try {
    const response = await fetch("https://connect.squareup.com/v2/catalog/list?types=ITEM", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Square-Version": "2026-09-16",
        Accept: "application/json",
      },
      redirect: "manual",
    });
    if (!response.ok) {
      return reply(502, { ok: false, reason: "square_request_failed", squareStatus: response.status });
    }
    stage = "decode";
    const catalog = await response.json();
    return reply(200, { ok: true, itemCountOnFirstPage: catalog.objects?.length ?? 0 });
  } catch (error) {
    return reply(502, { ok: false, reason: "square_unreachable", stage, errorType: error.name });
  }
}
