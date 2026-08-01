import { Product } from '../types';

export interface DeliverabilityResult {
  isDeliverable: boolean;
  badgeText: string;
  deliveryEst: string;
  reason?: string;
  expressAvailable: boolean;
}

export function checkDeliverability(
  product: Product,
  userPincode: string = '110001',
  userCity: string = 'New Delhi',
  userState: string = 'Delhi'
): DeliverabilityResult {
  if (!product) {
    return {
      isDeliverable: true,
      badgeText: 'Standard Shipping',
      deliveryEst: '3-5 Business Days',
      expressAvailable: false
    };
  }

  const range = product.availabilityRange || 'india';
  const cleanUserPin = (userPincode || '110001').trim();
  const cleanUserCity = (userCity || 'New Delhi').trim().toLowerCase();
  const cleanUserState = (userState || 'Delhi').trim().toLowerCase();

  const sellerPin = (product.sellerPincode || '110001').trim();
  const sellerCity = (product.sellerCity || 'New Delhi').trim().toLowerCase();
  const sellerState = (product.sellerState || 'Delhi').trim().toLowerCase();

  const userPinPrefix = cleanUserPin.slice(0, 3);
  const sellerPinPrefix = sellerPin.slice(0, 3);

  const isExactSameLocation = (userPinPrefix === sellerPinPrefix) || (cleanUserCity === sellerCity);

  if (range === 'india') {
    return {
      isDeliverable: true,
      badgeText: isExactSameLocation ? '⚡ Local Express Available (24 Hours)' : 'Standard Delivery (3-5 Days)',
      deliveryEst: isExactSameLocation ? 'Delivering tomorrow via Local Hub' : 'Standard nationwide shipping',
      expressAvailable: isExactSameLocation
    };
  }

  if (range === 'nearest') {
    if (isExactSameLocation) {
      return {
        isDeliverable: true,
        badgeText: '⚡ Hyperlocal Express (24 Hours)',
        deliveryEst: `Dispatched locally from ${product.sellerCity || 'seller hub'}`,
        expressAvailable: true
      };
    }
    return {
      isDeliverable: false,
      badgeText: `❌ Not Deliverable to ${cleanUserPin}`,
      deliveryEst: 'Unavailable at location',
      reason: `Dispatched from ${product.sellerCity || 'seller hub'} (${product.sellerPincode || ''}). Not deliverable to pincode ${cleanUserPin}.`,
      expressAvailable: false
    };
  }

  if (range === 'city') {
    if (cleanUserCity === sellerCity || userPinPrefix === sellerPinPrefix) {
      return {
        isDeliverable: true,
        badgeText: '⚡ City Express Delivery',
        deliveryEst: `Delivering within ${product.sellerCity || 'city'}`,
        expressAvailable: true
      };
    }
    return {
      isDeliverable: false,
      badgeText: `❌ Not Deliverable outside ${product.sellerCity || 'seller city'}`,
      deliveryEst: 'City boundary restriction',
      reason: `This seller only delivers within ${product.sellerCity || 'their city'}.`,
      expressAvailable: false
    };
  }

  if (range === 'state') {
    if (cleanUserState === sellerState || cleanUserCity === sellerCity) {
      return {
        isDeliverable: true,
        badgeText: 'Statewide Priority Shipping',
        deliveryEst: `1-2 Days within ${product.sellerState || 'state'}`,
        expressAvailable: false
      };
    }
    return {
      isDeliverable: false,
      badgeText: `❌ Not Deliverable outside ${product.sellerState || 'seller state'}`,
      deliveryEst: 'State boundary restriction',
      reason: `This seller delivers within ${product.sellerState || 'their state'} only.`,
      expressAvailable: false
    };
  }

  return {
    isDeliverable: true,
    badgeText: 'Standard Delivery',
    deliveryEst: '3-5 Days',
    expressAvailable: false
  };
}
