'use server';

import { revalidateTag } from 'next/cache';

export async function refreshInventory() {
  // Optional: you can add logic here, e.g. check Supabase auth session if needed
  // const session = await getSession();
  // if (!session) throw new Error('Unauthorized');

  revalidateTag('shopify-inventory');   // ← Invalidates all fetches tagged with this
  // OR revalidateTag('shopify-products'); for broader invalidation

  return { success: true, message: 'Inventory cache invalidated – refresh the page' };
}
