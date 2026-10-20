import { Suspense } from 'react';
import ProductList from '../components/productList';
import { RefreshButton } from '../components/refreshButton';
import { getAllProductsWithInventory } from '../utils/shopify-admin';
import { requireUser } from '../utils/require-user.js';

async function Products() {
  // The request proxy skips the session check on router prefetches, so this component
  // must not rely on it: the product data ends up in the RSC payload, and a
  // prefetch would hand it to an unauthenticated caller.
  await requireUser();

  const products = await getAllProductsWithInventory();

  return <ProductList initialProducts={products} />;
}

export default function Page() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">
        Inventory Overview
      </h1>
      <RefreshButton />
      <Suspense fallback={<p className="text-gray-600">Laddar produkter…</p>}>
        <Products />
      </Suspense>
    </div>
  );
}
