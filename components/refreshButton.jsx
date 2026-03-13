'use client';

import { useState } from 'react';
import { refreshInventory } from '../app/actions.js'; 
import { useRouter } from 'next/navigation';


export function RefreshButton() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
// ...


  const handleRefresh = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const result = await refreshInventory();
      setStatus(result.message || 'Cache refreshed!');
      router.refresh();
    } catch (error) {
      setStatus('Error refreshing cache');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6">
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Refreshing...' : 'Refresh Inventory Data'}
      </button>

      {status && (
        <p className={`mt-2 text-sm ${status.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
          {status}
        </p>
      )}
    </div>
  );
}