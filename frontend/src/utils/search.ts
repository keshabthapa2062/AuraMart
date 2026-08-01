import { Product } from '../types';

/**
 * Checks if a product matches a search query across name, description, and all product details/specifications.
 */
export function matchesProductSearch(product: Product, query: string): boolean {
  if (!query || !query.trim()) return true;

  const q = query.trim().toLowerCase();
  
  // Extract all searchable strings from product details
  const searchFields: string[] = [
    product.name || '',
    product.description || '',
    product.category || '',
    product.subcategory || '',
    product.brand || '',
    product.sku || '',
    product.sellerName || '',
    product.warranty || '',
    product.returnPolicy || '',
    product.shippingInfo || ''
  ];

  if (Array.isArray(product.tags)) {
    searchFields.push(...product.tags);
  }

  if (Array.isArray(product.keyFeatures)) {
    searchFields.push(...product.keyFeatures);
  }

  if (Array.isArray(product.whatsIncluded)) {
    searchFields.push(...product.whatsIncluded);
  }

  if (product.specs && typeof product.specs === 'object') {
    Object.entries(product.specs).forEach(([key, val]) => {
      searchFields.push(key, String(val));
    });
  }

  const combinedText = searchFields.join(' ').toLowerCase();

  // Direct substring match
  if (combinedText.includes(q)) {
    return true;
  }

  // Multi-token match: all query words must match somewhere in product details
  const tokens = q.split(/\s+/).filter(t => t.length > 0);
  if (tokens.length > 1) {
    return tokens.every(token => combinedText.includes(token));
  }

  return false;
}
