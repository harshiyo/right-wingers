import { collection, query, where, getDocs, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from './firebase';

export interface DiscountCode {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  applicableTo: 'all' | 'pickup' | 'delivery' | 'dine-in';
  createdAt: string;
  updatedAt: string;
}

export interface DiscountValidationResult {
  isValid: boolean;
  discountCode?: DiscountCode;
  error?: string;
  discountAmount?: number;
}

export class DiscountCodeService {
  static async validateDiscountCode(
    code: string, 
    orderTotal: number, 
    orderType: 'pickup' | 'delivery' | 'dine-in'
  ): Promise<DiscountValidationResult> {
    try {
      // Convert code to uppercase for case-insensitive matching
      const upperCode = code.toUpperCase().trim();
      
      // Query for the discount code
      const codesQuery = query(
        collection(db, 'discountCodes'),
        where('code', '==', upperCode),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(codesQuery);
      
      if (snapshot.empty) {
        return {
          isValid: false,
          error: 'Invalid discount code'
        };
      }
      
      const discountCode = {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as DiscountCode;
      
      // Check if code is active
      if (!discountCode.isActive) {
        return {
          isValid: false,
          error: 'Discount code is inactive'
        };
      }
      
      // Check start date
      if (discountCode.startDate) {
        const startDate = new Date(discountCode.startDate);
        const now = new Date();
        if (now < startDate) {
          return {
            isValid: false,
            error: 'Discount code has not started yet'
          };
        }
      }
      
      // Check end date
      if (discountCode.endDate) {
        const endDate = new Date(discountCode.endDate);
        const now = new Date();
        if (now > endDate) {
          return {
            isValid: false,
            error: 'Discount code has expired'
          };
        }
      }
      
      // Check usage limit
      if (discountCode.usageLimit && discountCode.usedCount >= discountCode.usageLimit) {
        return {
          isValid: false,
          error: 'Discount code usage limit reached'
        };
      }
      
      // Check minimum order amount
      if (discountCode.minOrderAmount && orderTotal < discountCode.minOrderAmount) {
        return {
          isValid: false,
          error: `Minimum order amount of $${discountCode.minOrderAmount.toFixed(2)} required`
        };
      }
      
      // Check if code applies to this order type
      if (discountCode.applicableTo !== 'all' && discountCode.applicableTo !== orderType) {
        return {
          isValid: false,
          error: `Discount code only applies to ${discountCode.applicableTo} orders`
        };
      }
      
      // Calculate discount amount
      let discountAmount = 0;
      
      if (discountCode.type === 'percentage') {
        discountAmount = (orderTotal * discountCode.value) / 100;
        
        // Apply maximum discount if set
        if (discountCode.maxDiscount && discountAmount > discountCode.maxDiscount) {
          discountAmount = discountCode.maxDiscount;
        }
      } else {
        discountAmount = discountCode.value;
      }
      
      // Ensure discount doesn't exceed order total
      if (discountAmount > orderTotal) {
        discountAmount = orderTotal;
      }
      
      return {
        isValid: true,
        discountCode,
        discountAmount
      };
      
    } catch (error) {
      console.error('Error validating discount code:', error);
      return {
        isValid: false,
        error: 'Error validating discount code'
      };
    }
  }
  
  static async applyDiscountCode(codeId: string): Promise<void> {
    try {
      // Increment the usage count
      const codeRef = doc(db, 'discountCodes', codeId);
      await updateDoc(codeRef, {
        usedCount: increment(1),
        updatedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error applying discount code:', error);
      throw error;
    }
  }
  
  static async getDiscountCode(code: string): Promise<DiscountCode | null> {
    try {
      const upperCode = code.toUpperCase().trim();
      
      const codesQuery = query(
        collection(db, 'discountCodes'),
        where('code', '==', upperCode)
      );
      
      const snapshot = await getDocs(codesQuery);
      
      if (snapshot.empty) {
        return null;
      }
      
      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as DiscountCode;
      
    } catch (error) {
      console.error('Error getting discount code:', error);
      return null;
    }
  }
} 