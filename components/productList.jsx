'use client';

import { useState,useMemo } from 'react';
import {getProductVariants,getProductAvailableQuantity } from '../utils/shopify-admin';

export default function ProductList({ initialProducts }) {
  const [products, setProducts] = useState(initialProducts); 
  const [searchTerm, setSearchTerm] = useState('');

const sortedProducts = products.sort((a, b) => 
    a.title.localeCompare(b.title)
  );

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;

    const lowerSearch = searchTerm.toLowerCase().trim();

    return products.filter(product =>
      product.title?.toLowerCase().includes(lowerSearch)
    );
  }, [products, searchTerm]);


  return (
    <div>
        <div className="max-w-md">
            <label htmlFor="product-search" className="block text-sm font-medium text-gray-700 mb-1">
            Search by product title
            </label>
            <input
            id="product-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="e.g. T-Shirt, Hoodie..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
      </div>
        {filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchTerm
            ? `No products found matching "${searchTerm}"`
            : 'No products loaded yet'}
        </div>
      ) : (
     
      <div className="grid gap-3 grid-cols-1 md:grid-cols-1">
        {filteredProducts.map(product => {
             const variants = getProductVariants(product)
            return(
          <div key={product.id} className="border bg-amber-50 p-4 rounded">
            <h4>{product.title}</h4>
             {variants.map((variant) => {
                 return(
                    <div key={variant.id} className="border-b border-gray-400 flex flex-row justify-between">
                        <p key={variant.id}>{`${variant.title} sku: ${variant.sku}`}</p>
                        <p className="font-bold">{`inStock: ${variant.quantity}`}</p>
                    </div>
                 )
             })}
          </div>
        )})}
      </div>
)}
    </div>
  );
}