
export async function onRequestGet({ env }) {
  const stateBytes = crypto.getRandomValues(new Uint8Array(32));
  const state = Array.from(stateBytes, b =>
    b.toString(16).padStart(2, "0")
  ).join("");

  await env.SQUARE_TOKENS.put(`oauth_state:${state}`, "pending", {
    expirationTtl: 600
  });

  const params = new URLSearchParams({
    client_id: env.SQUARE_APPLICATION_ID,
    scope: "ITEMS_READ INVENTORY_READ MERCHANT_PROFILE_READ",
    session: "false",
    state
  });

  return Response.redirect(
    `https://connect.squareup.com/oauth2/authorize?${params}`,
    302
  );
}
