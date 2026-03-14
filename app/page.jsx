
import ProductList from '../components/productList'

export default async function Page() {

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">
        Inventory Overview
      </h1>
        <ProductList/>
    </div>
  );
}
