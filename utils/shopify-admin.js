import { unstable_cache } from 'next/cache';

/**
 * Cache tag for the product/inventory list.
 *
 * The list is cached indefinitely and only dropped when something explicitly
 * invalidates this tag -- the Refresh button, or any stock/barcode change made
 * through this app. Changes made directly in Shopify admin or the POS will not
 * show up until someone hits Refresh.
 */
export const INVENTORY_TAG = 'shopify-inventory';

export async function shopifyAdminFetch({ query, variables = {}, next, cache }) {
  const endpoint = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2026-01/graphql.json`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
      next,
      cache,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    // Shopify reports query cost and the state of the leaky bucket here. If
    // `currentlyAvailable` is trending towards 0 we are being throttled, and
    // Shopify is making us wait between calls -- which looks exactly like "the
    // app is slow". Without this there is no way to tell.
    const cost = result.extensions?.cost;
    if (cost) {
      const available = cost.throttleStatus?.currentlyAvailable;
      const max = cost.throttleStatus?.maximumAvailable;
      console.log(
        `[shopify] cost requested=${cost.requestedQueryCost} actual=${cost.actualQueryCost} bucket=${available}/${max}`
      );
    }

    if (result.errors) {
      console.error('GraphQL Errors:', result.errors);
      return { data: null, errors: result.errors };
    }

    return { data: result.data, errors: undefined };
  } catch (error) {
    console.error('Shopify Admin fetch failed:', error);
    return { data: null, errors: [{ message: 'Network or server error' }] };
  }
}

export function getProductVariants(product) {
  let data = [];

  const variants = product.variants?.edges || [];

  for (const variantEdge of variants) {
    const variant = variantEdge.node;
    const inventoryItem = variant.inventoryItem;

    if (!inventoryItem) continue;

    const inventoryItemId = inventoryItem.id;

    const levels = inventoryItem.inventoryLevels?.edges || [];
    const levelEdge = levels[0];

    // A variant that is not stocked at any location has no inventory levels.
    // Reading levels[0].node directly used to throw here.
    const quantities = levelEdge?.node?.quantities || [];
    const quantity = quantities.find((q) => q.name === 'available')?.quantity || 0;

    data.push({
      id: variant.id,
      title: variant.title,
      inventoryItemId,
      barcode: variant.barcode,
      quantity,
    });
  }

  return data;
}

/*
 * Only the fields getProductVariants() and the UI actually read.
 *
 * This previously also pulled collections(first: 10) with id/title/handle for
 * every product, plus handle and sku, plus four quantity names -- none of which
 * are used anywhere in the app. They were pure query cost.
 */
const PRODUCTS_WITH_INVENTORY_QUERY = `
  query GetProductsWithInventory($first: Int = 20, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          title
          variants(first: 10) {
            edges {
              node {
                id
                title
                barcode
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
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

async function fetchAllProductsWithInventory() {
  let allProducts = [];
  let afterCursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const variables = {
      first: 20,
      after: afterCursor,
    };

    const { data, errors } = await shopifyAdminFetch({
      query: PRODUCTS_WITH_INVENTORY_QUERY,
      variables,
      // Caching is handled by unstable_cache below. Next cannot cache this
      // fetch itself: it only caches GET, and Shopify GraphQL is POST.
      cache: 'no-store',
    });

    if (errors || !data) {
      console.error('Fetch error:', errors);
      // Don't cache a partial catalogue as if it were the whole thing.
      throw new Error('Failed to load products from Shopify');
    }

    const pageProducts = data.products.edges.map((edge) => edge.node);
    allProducts = allProducts.concat(pageProducts);

    hasNextPage = data.products.pageInfo.hasNextPage;
    afterCursor = data.products.pageInfo.endCursor;
  }

  allProducts.forEach((product) => {
    product.variants = getProductVariants(product);
  });

  // Sort once here, on the server, instead of re-sorting on every render.
  allProducts.sort((a, b) => a.title.localeCompare(b.title));

  return allProducts;
}

/**
 * Cached product list. Held until INVENTORY_TAG is revalidated.
 */
export const getAllProductsWithInventory = unstable_cache(
  fetchAllProductsWithInventory,
  ['shopify-products-with-inventory'],
  { tags: [INVENTORY_TAG], revalidate: false }
);
