'use client';

import { useEffect, useRef } from 'react';

const MIN_LENGTH = 3;      // ignore stray keyboard noise
const END_OF_SCAN_MS = 80; // silence that marks the end of a scan

export default function BarcodeListener({ onScan }) {
  const bufferRef = useRef('');
  const timeoutRef = useRef(null);
  const onScanRef = useRef(onScan);

  // Track the latest onScan without re-subscribing the listener.
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    // Both the Enter key and the silence timeout funnel through here, and this
    // clears the buffer and any pending timer before dispatching. Previously
    // Enter called onScan directly while a timeout scheduled earlier in the
    // same keydown was still pending -- that timeout then fired against a
    // stale buffer and could dispatch the same scan a second time.
    const flush = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const scanned = bufferRef.current.trim();
      bufferRef.current = '';

      if (scanned.length > MIN_LENGTH) {
        onScanRef.current(scanned);
      }
    };

    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === 'Enter') {
        e.preventDefault(); // prevent form submit if inside <form>
        flush();
        return;
      }

      // Printable characters only; ignore Shift, arrows, F-keys, etc.
      if (e.key.length !== 1) return;

      // Buffer in a ref: a 15-character scan used to cause 15 re-renders and
      // 15 listener teardown/rebind cycles mid-scan.
      bufferRef.current += e.key;

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(flush, END_OF_SCAN_MS);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []); // subscribe once

  return null; // invisible component
}
