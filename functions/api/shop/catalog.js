// Cloudflare Pages Function. SQUARE_ACCESS_TOKEN must be a Cloudflare Secret.
// No tokens are ever returned to browsers.
export async function onRequestGet({ env }) {
  if (!env.SQUARE_ACCESS_TOKEN) return Response.json({ error: 'Catalog not configured' }, { status: 503 });
  const headers = { Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`, 'Square-Version': '2025-10-16', 'Content-Type': 'application/json' };
  try {
    const objects = [];
    let cursor;
    do {
      const response = await fetch('https://connect.squareup.com/v2/catalog/list', {
        method: 'POST', headers,
        body: JSON.stringify({ types: 'ITEM,IMAGE', ...(cursor ? { cursor } : {}) })
      });
      if (!response.ok) throw new Error(`Square API returned ${response.status}`);
      const result = await response.json();
      objects.push(...(result.objects || []));
      cursor = result.cursor;
    } while (cursor && objects.length < 1000);
    const images = new Map(objects.filter(o => o.type === 'IMAGE').map(o => [o.id, o.image_data?.url]));
    const items = objects.filter(o => o.type === 'ITEM' && !o.is_deleted && !o.item_data?.is_archived).map(o => {
      const d = o.item_data || {};
      const variations = (d.variations || []).filter(v => !v.is_deleted).map(v => ({
        name: v.item_variation_data?.name || 'Print',
        price: typeof v.item_variation_data?.price_money?.amount === 'number'
          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: v.item_variation_data.price_money.currency || 'USD' }).format(v.item_variation_data.price_money.amount / 100)
          : 'Price at checkout'
      }));
      return { name: d.name || 'Untitled', description: d.description || '', image: (d.image_ids || []).map(id => images.get(id)).find(Boolean) || null, variations };
    });
    return Response.json({ items }, { headers: { 'Cache-Control': 'public, max-age=120' } });
  } catch (error) {
    console.error('Catalog fetch failed', error);
    return Response.json({ error: 'Unable to load catalog' }, { status: 502 });
  }
}
