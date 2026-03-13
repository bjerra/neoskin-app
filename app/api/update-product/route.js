import { NextRequest, NextResponse } from 'next/server';
import { shopifyAdminFetch } from '@/lib/shopify-admin';

const PRODUCT_UPDATE_MUTATION = `
  mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        title
        descriptionHtml
        vendor
        status
        tags
        seo {
          title
          description
        }
        featuredMedia {
          ... on MediaImage {
            preview {
              image {
                url
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export async function POST(request) {
  try {
    const body = await request.json();
    const { productId, title, description, vendor, status, tags, seoTitle, seoDescription, newImageUrl } = body;

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    // Build the input object dynamically (only include fields you want to update)
    const input = {
      id: productId, // Required: gid://shopify/Product/1234567890
    };

    if (title) input.title = title;
    if (description) input.descriptionHtml = description;
    if (vendor) input.vendor = vendor;
    if (status) input.status = status; // "ACTIVE" | "DRAFT" | "ARCHIVED"
    if (tags) input.tags = tags; // array of strings
    if (seoTitle || seoDescription) {
      input.seo = {
        title: seoTitle || undefined,
        description: seoDescription || undefined,
      };
    }

    // Optional: Add new media (image from URL)
    if (newImageUrl) {
      input.media = [
        {
          originalSource: newImageUrl,
          mediaContentType: 'IMAGE',
          alt: `Updated image for ${title || 'product'}`,
        },
      ];
    }

    const { data, errors } = await shopifyAdminFetch<{
      productUpdate
    }>({
      query: PRODUCT_UPDATE_MUTATION,
      variables: { input },
    });

    if (errors || data?.productUpdate.userErrors?.length > 0) {
      return NextResponse.json(
        { error: data?.productUpdate.userErrors || errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, updatedProduct: data?.productUpdate.product });
  } catch (error) {
    console.error('Update failed:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}