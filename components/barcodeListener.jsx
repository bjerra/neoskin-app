'use client';

import { useEffect, useState, useRef } from 'react';

export default function BarcodeListener({onScan}) {
  const [buffer, setBuffer] = useState('');
  const timeoutRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore modifier keys, function keys, etc.
      if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1 && e.key !== 'Enter') {
        return;
      }

      // Start collecting characters
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Very fast typing → likely scanner
      timeoutRef.current = setTimeout(() => {
        // If buffer has content after short silence → treat as complete scan
        if (buffer.length > 3) { // min length to avoid keyboard noise
          const scanned = buffer.trim();
          onScan(scanned);
        }
        setBuffer('');
      }, 80); // 80 ms silence = end of scan (adjust 50–150 ms)

      // Add character (most scanners send printable chars + Enter)
      if (e.key === 'Enter') {
        if (buffer.length > 3) {
          const scanned = buffer.trim();
          onScan(scanned);
        }
        setBuffer('');
        e.preventDefault(); // prevent form submit if inside <form>
      } else if (e.key.length === 1) {
        setBuffer(prev => prev + e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [buffer, onScan]);

  return null; // invisible component
}