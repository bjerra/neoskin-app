'use client'

import {updateVariantStock,getProductVariantByBarCode} from '../actions'
import { useState } from 'react';
import BarcodeListener from '../../components/barcodeListener'

export default function Page() {

    const [loading, setLoading] = useState(null);
    const [lastScanned, setLastScanned] = useState(null);

    const handleScan = async (barcode) => {
           setLoading(true);
           console.log('Scanned barcode:', barcode);
           setLastScanned(barcode);
          
            try {
                const productResult = await getProductVariantByBarCode(barcode);
           
                if(productResult.error){
                    console.error(productResult.error);
                } else{
                    console.log(productResult.variant)
                    //  const result = await updateVariantStock(productResult.variant.id, 1);
                }
              
              } catch (error) {
                console.error(error);
              } finally {
                setLoading(false);
              }
        };

    return (
       <div className="p-8 border-2 border-blue-500">
      <h1 className="text-2xl mb-6">Fyll på Produkt</h1>
      
      <BarcodeListener onScan={handleScan} />

      <div className="mt-8 p-4 bg-gray-100 rounded">
        {lastScanned ? (
          <p className="text-lg">Last scanned: <strong>{lastScanned}</strong></p>
        ) : (
          <p className="text-gray-600">Waiting for scan...</p>
        )}
      </div>

      {/* Optional visible input for debugging or manual entry */}
      <input
        type="text"
        className="mt-4 border p-2 w-full max-w-xs"
        placeholder="Scanner will fill this automatically"
        readOnly
      />
    </div>
    );
}
