import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, doc, setDoc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../services/auth';

export interface Notification {
  id: string;
  type: 'job_complete' | 'permission_change' | 'discount_code' | 'new_order' | 'system_alert';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  deleted?: boolean;
  data?: any;
  storeId?: string;
  userId?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (notificationId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { currentUser } = useAuth();

  // Listen for real-time notifications
  useEffect(() => {
    if (!currentUser) return;

    // Query for notifications - filter by user role and store
    let notificationsQuery;
    
    if (currentUser.role === 'master_admin') {
      // Master admin sees all notifications
      notificationsQuery = query(
        collection(db, 'notifications'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
    } else {
      // Store admin sees only their store notifications
      notificationsQuery = query(
        collection(db, 'notifications'),
        where('storeId', '==', currentUser.assignedStoreId),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
    }

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date(),
            deleted: data.deleted || false
          } as Notification;
        })
        .filter(notification => !notification.deleted); // Filter out deleted notifications
      
      setNotifications(notificationsData);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Listen for job completion notifications
  useEffect(() => {
    if (!currentUser) return;

    const jobsQuery = query(
      collection(db, 'jobStatus'),
      where('status', '==', 'completed'),
      orderBy('completedAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
      // Just listen for changes, don't create notifications automatically
      // Notifications are created explicitly by the job scheduler
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Listen for permission changes
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'master_admin') return;

    const usersQuery = query(
      collection(db, 'users'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      // Just listen for changes, don't create notifications automatically
      // Notifications are created explicitly by the role management system
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Listen for discount code changes
  useEffect(() => {
    if (!currentUser) return;

    const discountCodesQuery = query(
      collection(db, 'discountCodes'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(discountCodesQuery, (snapshot) => {
      // Just listen for changes, don't create notifications automatically
      // Notifications are created explicitly by the discount code management system
    });

    return () => unsubscribe();
  }, [currentUser]);

  const markAsRead = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // If document doesn't exist, just remove it from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      const batch = writeBatch(db);
      
      unreadNotifications.forEach(notification => {
        const notificationRef = doc(db, 'notifications', notification.id);
        batch.update(notificationRef, { read: true });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const clearNotification = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        deleted: true
      });
    } catch (error) {
      console.error('Error clearing notification:', error);
      // If document doesn't exist, just remove it from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 