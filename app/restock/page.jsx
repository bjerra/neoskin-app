'use client'

import { useState } from 'react';
import BarcodeListener from '../../components/barcodeListener'

export default function Page() {

    const [lastScanned, setLastScanned] = useState(null);

    const handleScan = (barcode) => {
    console.log('Scanned barcode:', barcode);
    setLastScanned(barcode);
    // → lookup product in Shopify/Supabase, add to cart, etc.
    // fetch(`/api/products?barcode=${barcode}`)
  };

    return (
       <div className="p-8">
      <h1 className="text-2xl mb-6">Scan a product barcode</h1>
      
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
