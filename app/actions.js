'use server';

import { revalidateTag } from 'next/cache';
import { shopifyAdminFetch, INVENTORY_TAG } from '../utils/shopify-admin';
import { requireUser } from '../utils/supabase-server';

const LOCATION_ID = 'gid://shopify/Location/66022244525';

export async function refreshInventory() {
  await requireUser();

  // Now that the product list is actually cached (see unstable_cache in
  // shopify-admin.js) this does something. Previously nothing was cached, so
  // this call invalidated nothing.
  revalidateTag(INVENTORY_TAG);

  return { success: true, message: 'Inventory cache invalidated – refresh the page' };
}

const ADJUST_MUTATION = `
  mutation Adjust($input: InventoryAdjustQuantitiesInput!) {
    inventoryAdjustQuantities(input: $input) {
      userErrors { field message }
      inventoryAdjustmentGroup { id }
    }
  }
`;

const FIND_BY_BARCODE_QUERY = `
  query FindByBarcode($q: String!) {
    productVariants(first: 1, query: $q) {
      edges {
        node {
          id
          title
          product { title }
          inventoryItem {
            id
            inventoryLevels(first: 1) {
              edges {
                node {
                  quantities(names: ["available"]) {
                    name
                    quantity
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

/** Shared lookup. Callers are responsible for the auth check. */
async function findVariantByBarcode(barcode) {
  const { data, errors } = await shopifyAdminFetch({
    query: FIND_BY_BARCODE_QUERY,
    variables: { q: `barcode:${barcode}` },
    cache: 'no-store',
  });

  if (errors || !data) {
    return { error: 'något gick fel' };
  }

  const variants = data.productVariants.edges.map((e) => e.node);

  if (variants.length === 0) {
    return { error: 'Finns ingen produkt med denna streckkod' };
  }

  const node = variants[0];
  const variant = { id: node.id };
  const inventoryItem = node.inventoryItem;

  if (inventoryItem) {
    const levelEdge = inventoryItem.inventoryLevels?.edges?.[0];
    const quantities = levelEdge?.node?.quantities || [];
    variant.quantity = quantities.find((q) => q.name === 'available')?.quantity || 0;
    variant.inventoryItemId = inventoryItem.id;
  }

  variant.title = node.title === 'Default Title' ? node.product.title : node.title;

  return { variant, allMatches: variants };
}

/** Shared adjust. Callers are responsible for the auth check. */
async function adjustStock(inventoryItemId, delta) {
  const { data, errors } = await shopifyAdminFetch({
    query: ADJUST_MUTATION,
    variables: {
      input: {
        name: 'available',
        reason: 'correction',
        changes: [{ delta, inventoryItemId, locationId: LOCATION_ID }],
      },
    },
    cache: 'no-store',
  });

  const userErrors = data?.inventoryAdjustQuantities?.userErrors;

  if (errors || userErrors?.length > 0) {
    return { error: userErrors || errors };
  }

  revalidateTag(INVENTORY_TAG);

  return {
    success: true,
    adjustedBy: delta,
    adjustmentId: data.inventoryAdjustQuantities.inventoryAdjustmentGroup?.id,
  };
}

export async function updateVariantStock(inventoryItemId, delta) {
  await requireUser();

  if (!inventoryItemId) {
    return { error: 'Missing inventoryItemId or locationId' };
  }

  return adjustStock(inventoryItemId, delta);
}

/**
 * Look up a barcode and adjust its stock in one round trip.
 *
 * Next.js serializes Server Actions, so the previous two-call flow
 * (getProductVariantByBarCode then updateVariantStock) meant two strictly
 * sequential browser -> server round trips per scan. This is one.
 *
 * @param {string} barcode
 * @param {number} delta -1 to sell, +1 to restock
 */
export async function scanAndAdjust(barcode, delta) {
  await requireUser();

  if (!barcode) {
    return { error: 'barcode query param required' };
  }

  const lookup = await findVariantByBarcode(barcode);

  if (lookup.error) {
    return { error: lookup.error };
  }

  const { variant } = lookup;

  if (!variant.inventoryItemId) {
    return { error: 'Produkten har inget lagersaldo' };
  }

  if (delta < 0 && variant.quantity <= 0) {
    return { error: 'Finns inga i lager' };
  }

  const result = await adjustStock(variant.inventoryItemId, delta);

  if (result.error) {
    console.log(result.error);
    return { error: 'något gick fel' };
  }

  return { title: variant.title, quantity: variant.quantity + delta };
}

export async function updateBarcode(productId, variantId, newBarcode) {
  await requireUser();

  if (!variantId || newBarcode === undefined) {
    return { error: 'variantId and barcode are required' };
  }

  const mutation = `
    mutation UpdateVariantBarcode($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          product { id }
          productVariants {
              id
              barcode
          }
          userErrors {
              field
              message
          }
      }
  }
  `;

  const { data, errors } = await shopifyAdminFetch({
    query: mutation,
    variables: {
      productId,
      variants: [{ id: variantId, barcode: newBarcode || null }],
    },
    cache: 'no-store',
  });

  if (errors || !data) {
    return { error: errors || 'API request failed' };
  }

  const { productVariants, userErrors } = data.productVariantsBulkUpdate;

  if (userErrors?.length > 0) {
    return { error: userErrors };
  }

  revalidateTag(INVENTORY_TAG);

  return {
    success: true,
    updatedVariants: productVariants,
  };
}
