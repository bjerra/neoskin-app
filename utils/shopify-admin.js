
export async function shopifyAdminFetch({query,variables = {}, next, cache}) {
 
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
      cache, // Important for mutations — never cache
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

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

export function getProductAvailableQuantity(product) {
  let total = 0;

  const variants = product.variants?.edges || [];
  
  for (const variantEdge of variants) {
    const variant = variantEdge.node;
    const inventoryItem = variant.inventoryItem;
    
    if (!inventoryItem) continue;
    
    const levels = inventoryItem.inventoryLevels?.edges || [];
    
    for (const levelEdge of levels) {
      const quantities = levelEdge.node.quantities || [];
      const availableQty = quantities.find((q) => q.name === 'available')?.quantity || 0;
      total += availableQty;
    }
  }

  return total;
}

export function getProductVariants(product) {
  let data = [];

  const variants = product.variants?.edges || [];
  
  for (const variantEdge of variants) {
    const variant = variantEdge.node;
    const inventoryItem = variant.inventoryItem;
    
    if (!inventoryItem) continue;
    
    const levels = inventoryItem.inventoryLevels?.edges || [];
    
    let quantity = 0;
    for (const levelEdge of levels) {
      const quantities = levelEdge.node.quantities || [];
      const availableQty = quantities.find((q) => q.name === 'available')?.quantity || 0;
      quantity += availableQty;
    }
    data.push({title: variant.title, sku: variant.sku, quantity })
  }

  return data;
}

const PRODUCTS_WITH_INVENTORY_QUERY = `
  query GetProductsWithInventory($first: Int = 20, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          title
          handle
          collections(first: 10) {
          edges {
            node {
              id
              title
              handle
            }
          }
        }
          variants(first: 10) {         
            edges {
              node {
                id
                title
                sku
                inventoryItem {
                  id
                  inventoryLevels(first: 1) { 
                    edges {
                      node {
                        location {
                          id
                          name
                        }
                        quantities(names: ["available", "on_hand", "committed", "incoming"]) {
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
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export async function getAllProductsWithInventory() {
  let allProducts = [];
  let afterCursor= null;
  let hasNextPage = true;

  while (hasNextPage) {
    const variables = { 
      first: 20,          
      after: afterCursor 
    };
    
    const { data, errors } = await shopifyAdminFetch({
      query: PRODUCTS_WITH_INVENTORY_QUERY,
      variables,
       next: { 
        tags: ['shopify-inventory'], 
        }
    });

    if (errors || !data) {
      console.error('Fetch error:', errors);
      break;
    }
    const pageProducts = data.products.edges.map(edge => edge.node);
    allProducts = allProducts.concat(pageProducts);

    hasNextPage = data.products.pageInfo.hasNextPage;
    afterCursor = data.products.pageInfo.endCursor;

    // Optional: small delay to be polite to rate limits
    // await new Promise(r => setTimeout(r, 300));
  }

  return allProducts;
}

export async function updateProduct(productId, updates) {

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/update-product`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, ...updates }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Update failed');
  }

  return res.json();
}

