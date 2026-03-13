
import { shopifyAdminFetch } from '@/lib/shopify-admin';

async function updateProduct(productId, updates) {
  'use server';

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/update-product`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, ...updates }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Update failed');
  }

  return res.json();
}

// Example usage in a form handler (Server Action)
export default async function Page({ params }) {
  // ... fetch current product data first if needed

  // Example: Update title and add an image
  const updates = {
    title: 'New Awesome Product Title',
    description: '<p>Updated description with <strong>bold</strong> text.</p>',
    status: 'ACTIVE',
    tags: ['summer', 'new-arrival'],
    newImageUrl: 'https://example.com/new-product-image.jpg',
  };

  try {
    const result = await updateProduct(`gid://shopify/Product/${params.id}`, updates);
    console.log('Updated:', result.updatedProduct);
  } catch (err) {
    // handle error
  }

  return <div>Product updated successfully!</div>;
}