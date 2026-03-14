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


export async function updateVariantStock(inventoryItemId, delta) {

  if (!inventoryItemId) {
    return { error: 'Missing inventoryItemId or locationId' };
  }


  // Step 2: Adjust
  const adjustMutation = `
    mutation Adjust($input: InventoryAdjustQuantitiesInput!) {
      inventoryAdjustQuantities(input: $input) {
        userErrors { field message }
        inventoryAdjustmentGroup { id }
      }
    }
  `;

  const adjustVars = {
    input: {
      name: "available",
      reason: "correction",
      changes: [{ delta, inventoryItemId, locationId: "gid://shopify/Location/66022244525" }],
    },
  };

  const adjustRes = await fetch(
    `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2026-01/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query: adjustMutation, variables: adjustVars }),
    }
  );

  const adjustResult = await adjustRes.json();

  if (adjustResult.errors || adjustResult.data?.inventoryAdjustQuantities?.userErrors?.length > 0) {
    return { error: adjustResult.data?.inventoryAdjustQuantities?.userErrors || adjustResult.errors };
  }
console.log()
   return { success: true, adjustedBy: delta,adjustmentId: adjustResult.data.inventoryAdjustQuantities.inventoryAdjustmentGroup.i };

}

export async function updateBarcode(productId,variantId, newBarcode) {

    if (!variantId || newBarcode === undefined) {
      return { error: 'variantId and barcode are required' };
    }

    const mutation = `
      mutation UpdateVariantBarcode($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            product {
                id
            }
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

    const variables = {
      productId,
      variants: [
        {
          id: variantId,
          barcode: newBarcode || null,  // null or "" to clear
        },
      ],
    };

    const response = await fetch(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2026-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
        },
        body: JSON.stringify({ query: mutation, variables }),
      }
    );

    const result = await response.json();

    if (!response.ok || result.errors) {
      return { error: result.errors || 'API request failed' }
    }

    const { productVariants, userErrors } = result.data.productVariantsBulkUpdate;

    if (userErrors?.length > 0) {
      return { error: userErrors };
    }

    return {
      success: true,
      updatedVariants: productVariants,
    };
}

export async function getProductVariantByBarCode(barcode) {

  if (!barcode) {
    return { error: 'barcode query param required' };
  }

  const query = `
    query FindByBarcode($q: String!) {
      productVariants(first: 1, query: $q) {
        edges {
          node {
            id
          }
        }
      }
    }
  `;

  const variables = { q: `barcode:${barcode}` };

    const response = await fetch(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2026-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
        },
        body: JSON.stringify({ query, variables }),
      }
    );

    const result = await response.json();

    if (result.errors || !result.data) {
      return { error: result.errors || 'API error' };
    }

    const variants = result.data.productVariants.edges.map((e) => e.node);

    if (variants.length === 0) {
      return { error: 'No variant with this barcode' };
    }

    return {
      variant: variants[0],  // usually expect 1; take first if multiples
      allMatches: variants,
    };
}
