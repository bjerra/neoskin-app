
'use client'

import {scanAndAdjust} from '../actions'
import { useCallback, useState } from 'react';
import BarcodeListener from '../../components/barcodeListener'

// Example usage in a form handler (Server Action)
export default function Page() {

    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(null);
    const [lastScanned, setLastScanned] = useState(null);

       // useCallback keeps the identity stable so BarcodeListener doesn't
       // re-subscribe its keydown handler on every render.
       const handleScan = useCallback(async (barcode) => {
        if(loading) return;
        setLoading(true);
        setLastScanned(barcode);

         try {
             // Lookup + adjust in a single server action. Next serializes
             // Server Actions, so doing this as two calls meant two strictly
             // sequential round trips per scan.
             setStatus(await scanAndAdjust(barcode, -1));
           } catch (error) {
             console.error(error);
             setStatus({error: "något gick fel"})
           } finally {
             setLoading(false);
           }
     }, [loading]);

       return (
          <div className="p-8 border-2 border-green-500">
         <h1 className="text-2xl mb-6">Sälj Produkt</h1>
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
          {status && 
             (status.error ? ( 
             <p className="text-2xl text-red-600">{status.error}</p>
            ) : ( 
                <div className='text-green-600 text-2xl'>
                    <p className="">OK!</p>
                    <p className="">{status.title}</p>
                    <p className="">{`Nytt lagersaldo : ${status.quantity}`}</p>
                </div>
            )
        )}
       </div>
       );
}