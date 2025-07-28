import { doc, setDoc, serverTimestamp, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export interface CreateNotificationData {
  type: 'job_complete' | 'permission_change' | 'discount_code' | 'new_order' | 'system_alert';
  title: string;
  message: string;
  data?: any;
  storeId?: string;
  userId?: string;
}

// Debounce mechanism to prevent duplicate notifications
const notificationDebounce = new Map<string, number>();

// Cleanup old entries from debounce map every 5 minutes
setInterval(() => {
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  
  for (const [key, timestamp] of notificationDebounce.entries()) {
    if (timestamp < fiveMinutesAgo) {
      notificationDebounce.delete(key);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

const isDuplicateNotification = async (type: string, message: string, storeId?: string): Promise<boolean> => {
  try {
    const now = Date.now();
    const key = `${type}-${message}-${storeId || 'all'}`;
    const lastNotification = notificationDebounce.get(key);
    
    // Check if we've created a similar notification in the last 30 seconds
    if (lastNotification && (now - lastNotification) < 30000) {
      return true;
    }
    
    // Check for existing notifications with the same message in the last 5 minutes
    const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('type', '==', type),
      where('message', '==', message),
      where('timestamp', '>=', fiveMinutesAgo)
    );
    
    const snapshot = await getDocs(notificationsQuery);
    if (!snapshot.empty) {
      return true;
    }
    
    // Update debounce timestamp
    notificationDebounce.set(key, now);
    return false;
  } catch (error) {
    console.error('Error checking for duplicate notifications:', error);
    return false;
  }
};

export const createNotification = async (notificationData: CreateNotificationData) => {
  try {
    // Check for duplicate notifications
    const isDuplicate = await isDuplicateNotification(
      notificationData.type,
      notificationData.message,
      notificationData.storeId
    );
    
    if (isDuplicate) {
      console.log('Skipping duplicate notification:', notificationData.message);
      return;
    }
    
    const notificationRef = doc(db, 'notifications', crypto.randomUUID());
    
    // Filter out undefined values to prevent Firebase errors
    const cleanData = Object.fromEntries(
      Object.entries({
        ...notificationData,
        timestamp: serverTimestamp(),
        read: false,
        deleted: false
      }).filter(([_, value]) => value !== undefined)
    );
    
    await setDoc(notificationRef, cleanData);
    console.log('✅ Notification created:', notificationData.message);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Job completion notifications
export const notifyJobComplete = async (jobName: string, jobData: any, storeId?: string) => {
  await createNotification({
    type: 'job_complete',
    title: 'Job Completed',
    message: `${jobName} has been completed successfully`,
    data: { jobData },
    storeId
  });
};

// Permission change notifications
export const notifyPermissionChange = async (userName: string, userId: string, storeId?: string) => {
  await createNotification({
    type: 'permission_change',
    title: 'Permissions Updated',
    message: `Permissions updated for ${userName}`,
    data: { userId, userName },
    storeId
  });
};

// Discount code notifications
export const notifyDiscountCodeAdded = async (code: string, storeId?: string) => {
  await createNotification({
    type: 'discount_code',
    title: 'New Discount Code',
    message: `New discount code "${code}" has been added`,
    data: { code },
    storeId
  });
};

export const notifyDiscountCodeExpired = async (code: string, storeId?: string) => {
  await createNotification({
    type: 'discount_code',
    title: 'Discount Code Expired',
    message: `Discount code "${code}" has expired`,
    data: { code },
    storeId
  });
};

// System alert notifications
export const notifySystemAlert = async (title: string, message: string, storeId?: string) => {
  await createNotification({
    type: 'system_alert',
    title,
    message,
    storeId
  });
};

// New order notifications
export const notifyNewOrder = async (orderNumber: string, customerName: string, total: number, storeId?: string) => {
  await createNotification({
    type: 'new_order',
    title: 'New Order Received',
    message: `Order #${orderNumber} from ${customerName} - $${total.toFixed(2)}`,
    data: { orderNumber, customerName, total },
    storeId
  });
}; 