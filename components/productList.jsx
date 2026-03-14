'use client';

import { useState,useMemo } from 'react';
import {updateVariantStock,updateBarcode} from '../app/actions';
import BarcodeListener from '../components/barcodeListener'
import Modal from '../components/modal'


export default function ProductList({ initialProducts }) {
    const [products, setProducts] = useState(initialProducts); 
    const [searchTerm, setSearchTerm] = useState('');
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [barcodeItemId, setBarcodeItemId] = useState(null);
    

     const handleSetBarcodeItemId = ({productId, variantId}) => {
        if(barcodeItemId){
            setBarcodeItemId(null)
        } else{
            setBarcodeItemId({productId, variantId})
        }
     }
 
    const handleScan = async (scannedBarcode) => {
        if(!barcodeItemId) return;
        
          setLoading(true);
        try {
            const {productId, variantId} = barcodeItemId;
            const result = await updateBarcode(
            productId,
            variantId,
            scannedBarcode
            );
            if(result.error){
                console.log('Error:', result.error);
            } else{
                console.log('Updated:', result.updatedVariants);
                const newProducts = [...products];
                newProducts.forEach(p=>{
                if(p.id == productId){
                    p.variants.forEach(variant => {
                        if(variant.id == variantId){
                            variant.barcode = scannedBarcode;
                        }
                    })
                }
             });
           
             setProducts(newProducts)
        }
       
        } catch (err) {
            console.error(err);
        }finally {
            setBarcodeItemId(null)
            setLoading(false);
        }
    };
  
    const handleUpdateStock = async (inventoryItemId, change) => {
      setLoading(true);
      setStatus(null);
  
      try {
        const result = await updateVariantStock(inventoryItemId, change);
        if(result.error){
            console.error(result.error);
        } else{
            setStatus(result.message || 'Stock Updated!');
        }
      
      } catch (error) {
        setStatus('Error update stock');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

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
       {status && (
        <p className={`mt-2 text-sm ${status.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
          {status}
        </p>
      )}
        {filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchTerm
            ? `No products found matching "${searchTerm}"`
            : 'No products loaded yet'}
        </div>
      ) : (
     
      <div className="grid gap-3 grid-cols-1 md:grid-cols-1">
        {filteredProducts.map(product => {
            return(
          <div key={product.id} className="border bg-amber-50 p-4 rounded">
            <h4>{product.title}</h4>
             {product.variants.map((variant) => {
                 return(
                    <div key={variant.id} className="border-b border-gray-400 flex flex-row justify-between">
                        <p key={variant.id}>{`${variant.title === 'Default Title' ? '' : variant.title} barcode: ${variant.barcode}`}</p>
                        <p className="font-bold">{`inStock: ${variant.quantity}`}</p>
                         <button onClick={() => handleUpdateStock(variant.inventoryItemId, -1)}  disabled={loading}>-</button>
                        <button onClick={() => handleUpdateStock(variant.inventoryItemId, 1)}  disabled={loading}>+</button>
                        <button onClick={() =>  handleSetBarcodeItemId({productId: product.id, variantId: variant.id})}  disabled={loading}>Scan</button>
                    </div>
                 )
             })}
          </div>
        )})}
      </div>
)}
        <Modal
            isOpen={barcodeItemId}
            onClose={() => setBarcodeItemId(null)}
            title={loading ? "Loading" :"Scan Product"}
            maxWidth="max-w-lg"
        > 
            <BarcodeListener onScan={handleScan}/>
      
      </Modal>
    </div>
  );
}