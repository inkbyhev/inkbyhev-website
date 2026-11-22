// Return only the fields needed for the shop preview.
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
    const response = await fetch("https://connect.squareup.com/v2/catalog/list?types=ITEM%2CIMAGE", {
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
    const objects = catalog.objects ?? [];
    const images = new Map(objects.filter(object => object.type === "IMAGE")
      .map(object => [object.id, object.image_data?.url]));
    const prints = objects.filter(object => object.type === "ITEM"
      && !object.item_data?.is_archived
      && object.item_data?.product_type !== "APPOINTMENTS_SERVICE"
      && object.item_data?.name !== "Haircut (example service)")
      .map(({ item_data: item }) => ({
        name: item.name,
        description: item.description_plaintext ?? item.description ?? "",
        image: (item.image_ids ?? []).map(id => images.get(id))
          .find(url => typeof url === "string" && url.startsWith("https://")) ?? null,
        prices: (item.variations ?? []).map(variation => variation.item_variation_data?.price_money)
          .filter(price => Number.isSafeInteger(price?.amount) && price.currency === "USD")
          .map(price => price.amount),
      }));
    return reply(200, { ok: true, prints });
  } catch (error) {
    return reply(502, { ok: false, reason: "square_unreachable", stage, errorType: error.name });
  }
}
