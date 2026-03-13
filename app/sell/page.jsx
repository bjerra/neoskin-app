
import { updateProduct } from '../../utils/shopify-admin';


// Example usage in a form handler (Server Action)
export default function Page({ params }) {
  
    
    const updatedProduct = async () => {
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
    }
 

  return <div>Sälj</div>;
}