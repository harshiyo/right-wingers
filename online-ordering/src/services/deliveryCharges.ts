import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from './firebase';

export interface DeliveryCharge {
  id: string;
  name: string;
  minDistance: number;
  maxDistance: number;
  baseCharge: number;
  perKmCharge: number;
  freeDeliveryThreshold: number;
  isActive: boolean;
  storeId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryChargeResult {
  charge: number;
  rule: DeliveryCharge | null;
  isFree: boolean;
  reason: string;
}

/**
 * Calculate delivery charge based on distance and order subtotal
 * @param distance - Distance in kilometers
 * @param subtotal - Order subtotal amount
 * @param storeId - Optional store ID for store-specific rules
 * @returns DeliveryChargeResult with calculated charge and rule details
 */
export const calculateDeliveryCharge = async (
  distance: number,
  subtotal: number,
  storeId?: string
): Promise<DeliveryChargeResult> => {
  try {
    // Build query for delivery charges
    let chargesQuery = query(
      collection(db, 'deliveryCharges'),
      where('isActive', '==', true),
      orderBy('minDistance', 'asc')
    );

    // If storeId is provided, filter by store-specific rules
    if (storeId) {
      chargesQuery = query(
        collection(db, 'deliveryCharges'),
        where('isActive', '==', true),
        where('storeId', '==', storeId),
        orderBy('minDistance', 'asc')
      );
    }

    const snapshot = await getDocs(chargesQuery);
    const charges = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as DeliveryCharge[];

    // If no store-specific rules, get global rules
    if (storeId && charges.length === 0) {
      const globalQuery = query(
        collection(db, 'deliveryCharges'),
        where('isActive', '==', true),
        where('storeId', '==', null),
        orderBy('minDistance', 'asc')
      );
      const globalSnapshot = await getDocs(globalQuery);
      charges.push(...globalSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as DeliveryCharge[]);
    }

    // Find the applicable rule based on distance
    const applicableRule = charges.find(charge => 
      distance >= charge.minDistance && distance <= charge.maxDistance
    );

    if (!applicableRule) {
      return {
        charge: 0,
        rule: null,
        isFree: false,
        reason: 'No delivery charge rule found for this distance'
      };
    }

    // Check if order qualifies for free delivery
    if (subtotal >= applicableRule.freeDeliveryThreshold) {
      return {
        charge: 0,
        rule: applicableRule,
        isFree: true,
        reason: `Free delivery for orders $${applicableRule.freeDeliveryThreshold}+`
      };
    }

    // Calculate charge based on rule
    // Base charge covers the maxDistance in the range, then charge per km for additional distance
    const additionalDistance = Math.max(0, distance - applicableRule.maxDistance);
    const charge = applicableRule.baseCharge + (additionalDistance * applicableRule.perKmCharge);

    return {
      charge: Math.max(0, charge), // Ensure charge is not negative
      rule: applicableRule,
      isFree: false,
      reason: `Base: $${applicableRule.baseCharge.toFixed(2)} (covers 0-${applicableRule.maxDistance}km) + Additional: ${additionalDistance.toFixed(1)}km × $${applicableRule.perKmCharge.toFixed(2)}/km`
    };

  } catch (error) {
    console.error('Error calculating delivery charge:', error);
    
    // Fallback to default calculation
    const defaultCharge = subtotal >= 30 ? 0 : 3.99;
    
    return {
      charge: defaultCharge,
      rule: null,
      isFree: defaultCharge === 0,
      reason: 'Fallback: Free delivery for orders $30+'
    };
  }
};

/**
 * Get all active delivery charge rules
 * @param storeId - Optional store ID for store-specific rules
 * @returns Array of active delivery charge rules
 */
export const getDeliveryChargeRules = async (storeId?: string): Promise<DeliveryCharge[]> => {
  try {
    let chargesQuery = query(
      collection(db, 'deliveryCharges'),
      where('isActive', '==', true),
      orderBy('minDistance', 'asc')
    );

    if (storeId) {
      chargesQuery = query(
        collection(db, 'deliveryCharges'),
        where('isActive', '==', true),
        where('storeId', '==', storeId),
        orderBy('minDistance', 'asc')
      );
    }

    const snapshot = await getDocs(chargesQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as DeliveryCharge[];

  } catch (error) {
    console.error('Error fetching delivery charge rules:', error);
    return [];
  }
};

/**
 * Get delivery charge preview for a range of distances
 * @param rule - Delivery charge rule
 * @param distances - Array of distances to calculate charges for
 * @returns Array of distance-charge pairs
 */
export const getDeliveryChargePreview = (
  rule: DeliveryCharge,
  distances: number[]
): Array<{ distance: number; charge: number; isFree: boolean }> => {
  return distances.map(distance => {
    if (distance < rule.minDistance) {
      return { distance, charge: 0, isFree: false };
    }
    
    // For preview, we'll use a sample subtotal of $25 (below free delivery threshold)
    // Base charge covers the maxDistance in the range, then charge per km for additional distance
    const additionalDistance = Math.max(0, distance - rule.maxDistance);
    const charge = rule.baseCharge + (additionalDistance * rule.perKmCharge);
    
    return {
      distance,
      charge: Math.max(0, charge),
      isFree: false
    };
  });
};
