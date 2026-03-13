import { getAllProductsWithInventory, getProductAvailableQuantity } from '../utils/shopify-admin';
import { RefreshButton } from '../components/refreshButton';
import ProductList from '../components/productList'

export default async function Page() {

 const products = await getAllProductsWithInventory();
  // Optional: sort by name or stock level

  return (
    <div className="container mx-auto p-6">
        <RefreshButton />
      <h1 className="text-3xl font-bold mb-8">
        Inventory Overview ({products.length} products)
      </h1>

      {products.length === 0 ? (
        <p className="text-gray-500">No products found or error fetching inventory.</p>
      ) : (
        <ProductList initialProducts={products}/>
      )}
    </div>
  );
}
