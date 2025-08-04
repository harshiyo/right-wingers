import { collection, addDoc, getDocs, query, orderBy, where, updateDoc, doc, writeBatch, limit as firestoreLimit } from 'firebase/firestore';
import { db } from './firebase';
import { notifyJobComplete } from './notificationService';

export interface JobStatus {
  id: string;
  type: 'order_sync' | 'customer_sync' | 'inventory_sync' | 'online_order_sync' | 'pos_order_sync';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'queued';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
  recordsProcessed?: number;
  recordsFailed?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  source: 'online' | 'pos' | 'system';
  createdAt: Date;
  updatedAt: Date;
}

export interface JobSchedule {
  id: string;
  type: 'order_sync' | 'customer_sync' | 'inventory_sync' | 'online_order_sync' | 'pos_order_sync';
  interval: number; // in minutes
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  maxRetries: number;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueueItem {
  id: string;
  jobType: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  source: 'online' | 'pos' | 'system';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  data?: any;
  retryCount: number;
  maxRetries: number;
}

class JobScheduler {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = false;
  private queue: QueueItem[] = [];
  private isProcessingQueue = false;

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Create default job schedules if they don't exist
      await this.ensureDefaultSchedules();
      
      // Start all active jobs
      await this.startActiveJobs();
      
      // Start queue processor
      this.startQueueProcessor();
      
      this.isInitialized = true;
      console.log('✅ Enhanced Job Scheduler initialized');
    } catch (error) {
      console.error('❌ Error initializing job scheduler:', error);
    }
  }

  private async ensureDefaultSchedules() {
    try {
      const schedulesQuery = query(collection(db, 'jobSchedules'));
      const schedulesSnapshot = await getDocs(schedulesQuery);
      
      if (schedulesSnapshot.empty) {
        const batch = writeBatch(db);
        
        // Create default schedules - only customer_sync is active by default
        const defaultSchedules = [
          {
            type: 'order_sync',
            interval: 10,
            isActive: false, // Inactive by default
            priority: 'high' as const,
            maxRetries: 3,
            retryCount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            type: 'customer_sync',
            interval: 10,
            isActive: true, // Only this job is active by default
            priority: 'medium' as const,
            maxRetries: 3,
            retryCount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            type: 'inventory_sync',
            interval: 10,
            isActive: false, // Inactive by default
            priority: 'medium' as const,
            maxRetries: 3,
            retryCount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            type: 'online_order_sync',
            interval: 10,
            isActive: false, // Inactive by default
            priority: 'critical' as const,
            maxRetries: 5,
            retryCount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            type: 'pos_order_sync',
            interval: 10,
            isActive: false, // Inactive by default
            priority: 'critical' as const,
            maxRetries: 5,
            retryCount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];

        defaultSchedules.forEach(schedule => {
          const docRef = doc(collection(db, 'jobSchedules'));
          batch.set(docRef, schedule);
        });

        await batch.commit();
        console.log('✅ Created default job schedules (10-minute intervals, only customer_sync active)');
      } else {
        // Update existing schedules to ensure 10-minute intervals and correct active state
        const batch = writeBatch(db);
        let hasUpdates = false;
        
        schedulesSnapshot.forEach((scheduleDoc) => {
          const schedule = scheduleDoc.data() as JobSchedule;
          const updates: Partial<JobSchedule> = {};
          
          // Ensure interval is 10 minutes
          if (schedule.interval !== 10) {
            updates.interval = 10;
            hasUpdates = true;
          }
          
          // Ensure only customer_sync is active by default
          if (schedule.type === 'customer_sync' && !schedule.isActive) {
            updates.isActive = true;
            hasUpdates = true;
          } else if (schedule.type !== 'customer_sync' && schedule.isActive) {
            updates.isActive = false;
            hasUpdates = true;
          }
          
          if (hasUpdates) {
            updates.updatedAt = new Date();
            batch.update(scheduleDoc.ref, updates);
          }
        });
        
        if (hasUpdates) {
          await batch.commit();
          console.log('✅ Updated existing job schedules (10-minute intervals, only customer_sync active)');
        }
      }
    } catch (error) {
      console.error('❌ Error ensuring default schedules:', error);
    }
  }

  private async startActiveJobs() {
    try {
      const activeSchedulesQuery = query(
        collection(db, 'jobSchedules'),
        where('isActive', '==', true)
      );
      const schedulesSnapshot = await getDocs(activeSchedulesQuery);
      
      schedulesSnapshot.forEach((scheduleDoc) => {
        const schedule = scheduleDoc.data() as JobSchedule;
        this.startJob(schedule.type, schedule.interval);
      });
    } catch (error) {
      console.error('❌ Error starting active jobs:', error);
    }
  }

  private startJob(jobType: string, intervalMinutes: number) {
    // Clear existing interval if any
    if (this.intervals.has(jobType)) {
      clearInterval(this.intervals.get(jobType)!);
    }

    // Start new interval
    const interval = setInterval(async () => {
      await this.addToQueue(jobType, 'system');
    }, intervalMinutes * 60 * 1000);

    this.intervals.set(jobType, interval);
    console.log(`✅ Started ${jobType} job with ${intervalMinutes} minute interval`);
  }

  private async addToQueue(jobType: string, source: 'online' | 'pos' | 'system') {
    const queueItem: QueueItem = {
      id: `${jobType}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      jobType,
      priority: this.getJobPriority(jobType),
      status: 'queued',
      source,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: this.getJobMaxRetries(jobType)
    };

    this.queue.push(queueItem);
    console.log(`📥 Added ${jobType} to queue (${source} source)`);
    
    // Process queue if not already processing
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  private getJobPriority(jobType: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (jobType) {
      case 'online_order_sync':
      case 'pos_order_sync':
        return 'critical';
      case 'order_sync':
        return 'high';
      case 'customer_sync':
      case 'inventory_sync':
        return 'medium';
      default:
        return 'low';
    }
  }

  private getJobMaxRetries(jobType: string): number {
    switch (jobType) {
      case 'online_order_sync':
      case 'pos_order_sync':
        return 5;
      case 'order_sync':
        return 3;
      default:
        return 2;
    }
  }

  private async processQueue() {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    
    while (this.queue.length > 0) {
      // Sort queue by priority (critical > high > medium > low)
      this.queue.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      const item = this.queue.shift();
      if (!item) continue;

      try {
        console.log(`🔄 Processing queue item: ${item.jobType} (${item.priority} priority)`);
        
        // Update item status to processing
        item.status = 'processing';
        item.startedAt = new Date();

        // Run the job
        await this.runJob(item.jobType, item.source);

        // Mark as completed
        item.status = 'completed';
        item.completedAt = new Date();
        
        console.log(`✅ Queue item completed: ${item.jobType}`);
        
      } catch (error) {
        console.error(`❌ Error processing queue item ${item.jobType}:`, error);
        
        item.retryCount++;
        if (item.retryCount < item.maxRetries) {
          // Re-add to queue for retry
          item.status = 'queued';
          this.queue.push(item);
          console.log(`🔄 Re-queued ${item.jobType} for retry (${item.retryCount}/${item.maxRetries})`);
        } else {
          // Mark as failed
          item.status = 'failed';
          console.log(`❌ Queue item failed permanently: ${item.jobType}`);
        }
      }
    }
    
    this.isProcessingQueue = false;
  }

  private startQueueProcessor() {
    // Process queue every 30 seconds
    setInterval(() => {
      if (!this.isProcessingQueue && this.queue.length > 0) {
        this.processQueue();
      }
    }, 30000);
  }

  private async runJob(jobType: string, source: 'online' | 'pos' | 'system') {
    const jobId = `${jobType}_${Date.now()}`;
    
    try {
      console.log(`🔄 Starting ${jobType} job: ${jobId} (${source} source)`);
      
      // Create job status record
      const jobStatusRef = await addDoc(collection(db, 'jobStatus'), {
        type: jobType,
        status: 'running',
        startTime: new Date(),
        priority: this.getJobPriority(jobType),
        source,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const startTime = Date.now();
      let recordsProcessed = 0;
      let recordsFailed = 0;

      // Execute the specific job
      switch (jobType) {
        case 'order_sync':
          const orderResult = await this.runOrderSync();
          recordsProcessed = orderResult.processed;
          recordsFailed = orderResult.failed;
          break;
        case 'customer_sync':
          recordsProcessed = await this.runCustomerSync();
          break;
        case 'inventory_sync':
          recordsProcessed = await this.runInventorySync();
          break;
        case 'online_order_sync':
          const onlineResult = await this.runOnlineOrderSync();
          recordsProcessed = onlineResult.processed;
          recordsFailed = onlineResult.failed;
          break;
        case 'pos_order_sync':
          const posResult = await this.runPOSOrderSync();
          recordsProcessed = posResult.processed;
          recordsFailed = posResult.failed;
          break;
        default:
          throw new Error(`Unknown job type: ${jobType}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Update job status as completed
      await updateDoc(jobStatusRef, {
        status: 'completed',
        endTime: new Date(),
        duration,
        recordsProcessed,
        recordsFailed,
        updatedAt: new Date()
      });

      // Update schedule last run time
      await this.updateScheduleLastRun(jobType);

      // Create notification for job completion
      await notifyJobComplete(jobType, {
        jobId: jobStatusRef.id,
        recordsProcessed,
        recordsFailed,
        duration,
        type: jobType,
        source
      });

      console.log(`✅ ${jobType} job completed: ${recordsProcessed} processed, ${recordsFailed} failed in ${duration}ms`);
      
    } catch (error) {
      console.error(`❌ Error running ${jobType} job:`, error);
      
      // Update job status as failed
      const jobStatusRef = await addDoc(collection(db, 'jobStatus'), {
        type: jobType,
        status: 'failed',
        startTime: new Date(),
        endTime: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        priority: this.getJobPriority(jobType),
        source,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      throw error;
    }
  }

  private async runOrderSync(): Promise<{ processed: number; failed: number }> {
    try {
      console.log('🔄 Running order sync job...');
      
      // Fetch recent orders from both online and POS
      const ordersQuery = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc'),
        firestoreLimit(100)
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      
      let processed = 0;
      let failed = 0;

      for (const orderDoc of ordersSnapshot.docs) {
        try {
          const order = orderDoc.data();
          
          // Process order based on source
          if (order.source === 'online') {
            await this.processOnlineOrder(order);
          } else if (order.source === 'pos') {
            await this.processPOSOrder(order);
          }
          
          processed++;
        } catch (error) {
          console.error(`❌ Failed to process order ${orderDoc.id}:`, error);
          failed++;
        }
      }

      return { processed, failed };
      
    } catch (error) {
      console.error('❌ Error in order sync:', error);
      throw error;
    }
  }

  private async runOnlineOrderSync(): Promise<{ processed: number; failed: number }> {
    try {
      console.log('🔄 Running online order sync job...');
      
      // Fetch online orders from online-ordering collection
      const onlineOrdersQuery = query(
        collection(db, 'online-orders'),
        orderBy('createdAt', 'desc'),
        firestoreLimit(50)
      );
      const onlineOrdersSnapshot = await getDocs(onlineOrdersQuery);
      
      let processed = 0;
      let failed = 0;

      for (const orderDoc of onlineOrdersSnapshot.docs) {
        try {
          const order = orderDoc.data();
          await this.processOnlineOrder(order);
          processed++;
        } catch (error) {
          console.error(`❌ Failed to process online order ${orderDoc.id}:`, error);
          failed++;
        }
      }

      return { processed, failed };
      
    } catch (error) {
      console.error('❌ Error in online order sync:', error);
      throw error;
    }
  }

  private async runPOSOrderSync(): Promise<{ processed: number; failed: number }> {
    try {
      console.log('🔄 Running POS order sync job...');
      
      // Fetch POS orders
      const posOrdersQuery = query(
        collection(db, 'orders'),
        where('source', '==', 'pos'),
        orderBy('createdAt', 'desc'),
        firestoreLimit(50)
      );
      const posOrdersSnapshot = await getDocs(posOrdersQuery);
      
      let processed = 0;
      let failed = 0;

      for (const orderDoc of posOrdersSnapshot.docs) {
        try {
          const order = orderDoc.data();
          await this.processPOSOrder(order);
          processed++;
        } catch (error) {
          console.error(`❌ Failed to process POS order ${orderDoc.id}:`, error);
          failed++;
        }
      }

      return { processed, failed };
      
    } catch (error) {
      console.error('❌ Error in POS order sync:', error);
      throw error;
    }
  }

  private async processOnlineOrder(order: any) {
    // Process online order specific logic
    // Update customer stats, inventory, etc.
    console.log(`📦 Processing online order: ${order.id}`);
    
    // Add your online order processing logic here
    // For example: update inventory, customer stats, etc.
  }

  private async processPOSOrder(order: any) {
    // Process POS order specific logic
    console.log(`💳 Processing POS order: ${order.id}`);
    
    // Add your POS order processing logic here
    // For example: update inventory, customer stats, etc.
  }

  private async runCustomerSync(): Promise<number> {
    try {
      console.log('🔄 Running customer sync job...');
      
      // Fetch all orders
      const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      // Fetch all customers
      const customersQuery = query(collection(db, 'customers'));
      const customersSnapshot = await getDocs(customersQuery);
      const customers = customersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      // Group orders by customer phone number
      const customerStats = new Map<string, { 
        orderCount: number; 
        totalSpent: number; 
        lastOrderDate: any;
      }>();

      orders.forEach((order: any) => {
        const phone = order.customerInfo?.phone || order.customerPhone;
        if (!phone) return;

        const cleanPhone = phone.replace(/\D/g, '');
        const orderTotal = order.total || 0;
        const orderDate = order.createdAt || new Date().toISOString();

        if (!customerStats.has(cleanPhone)) {
          customerStats.set(cleanPhone, {
            orderCount: 0,
            totalSpent: 0,
            lastOrderDate: orderDate
          });
        }

        const stats = customerStats.get(cleanPhone)!;
        stats.orderCount += 1;
        stats.totalSpent += orderTotal;
        
        if (orderDate > stats.lastOrderDate) {
          stats.lastOrderDate = orderDate;
        }
      });

      // Update customer statistics
      let updatedCount = 0;
      for (const customer of customers) {
        const cleanPhone = customer.phone.replace(/\D/g, '');
        const stats = customerStats.get(cleanPhone);
        
        if (stats) {
          let formattedLastOrderDate: string;
          if (typeof stats.lastOrderDate === 'string') {
            formattedLastOrderDate = stats.lastOrderDate.split('T')[0];
          } else if (stats.lastOrderDate && typeof stats.lastOrderDate === 'object' && 'toISOString' in stats.lastOrderDate) {
            formattedLastOrderDate = (stats.lastOrderDate as Date).toISOString().split('T')[0];
          } else {
            formattedLastOrderDate = new Date().toISOString().split('T')[0];
          }
          
          if (
            customer.orderCount !== stats.orderCount || 
            customer.totalSpent !== stats.totalSpent ||
            customer.lastOrderDate !== formattedLastOrderDate
          ) {
            const customerRef = doc(db, 'customers', customer.id);
            await updateDoc(customerRef, {
              orderCount: stats.orderCount,
              totalOrders: stats.orderCount,
              totalSpent: stats.totalSpent,
              lastOrderDate: formattedLastOrderDate,
              updatedAt: new Date().toISOString()
            });
            updatedCount++;
          }
        }
      }

      console.log(`✅ Customer sync completed: ${updatedCount} customers updated`);
      return updatedCount;
      
    } catch (error) {
      console.error('❌ Error in customer sync:', error);
      throw error;
    }
  }

  private async runInventorySync(): Promise<number> {
    try {
      console.log('🔄 Running inventory sync job...');
      
      // Fetch all orders from the last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const ordersQuery = query(
        collection(db, 'orders'),
        where('createdAt', '>=', yesterday),
        orderBy('createdAt', 'desc')
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      
      let updatedItems = 0;
      
      // Process each order to update inventory
      for (const orderDoc of ordersSnapshot.docs) {
        const order = orderDoc.data();
        
        if (order.items && Array.isArray(order.items)) {
          for (const item of order.items) {
            // Update inventory for each item
            // This is a placeholder - implement your inventory logic
            updatedItems++;
          }
        }
      }

      console.log(`✅ Inventory sync completed: ${updatedItems} items processed`);
      return updatedItems;
      
    } catch (error) {
      console.error('❌ Error in inventory sync:', error);
      throw error;
    }
  }

  private async updateScheduleLastRun(jobType: string) {
    try {
      const schedulesQuery = query(
        collection(db, 'jobSchedules'),
        where('type', '==', jobType)
      );
      const schedulesSnapshot = await getDocs(schedulesQuery);
      
      if (!schedulesSnapshot.empty) {
        const scheduleDoc = schedulesSnapshot.docs[0];
        const nextRun = new Date(Date.now() + (scheduleDoc.data().interval * 60 * 1000));
        
        await updateDoc(scheduleDoc.ref, {
          lastRun: new Date(),
          nextRun,
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('❌ Error updating schedule last run:', error);
    }
  }

  async getJobStatus(limit: number = 100): Promise<JobStatus[]> {
    try {
      const statusQuery = query(
        collection(db, 'jobStatus'),
        orderBy('createdAt', 'desc'),
        firestoreLimit(limit)
      );
      const statusSnapshot = await getDocs(statusQuery);
      
      return statusSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate(),
        endTime: doc.data().endTime?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as JobStatus[];
    } catch (error) {
      console.error('❌ Error fetching job status:', error);
      return [];
    }
  }

  async getJobSchedules(): Promise<JobSchedule[]> {
    try {
      const schedulesQuery = query(collection(db, 'jobSchedules'));
      const schedulesSnapshot = await getDocs(schedulesQuery);
      
      return schedulesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastRun: doc.data().lastRun?.toDate(),
        nextRun: doc.data().nextRun?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as JobSchedule[];
    } catch (error) {
      console.error('❌ Error fetching job schedules:', error);
      return [];
    }
  }

  async getQueueStatus(): Promise<QueueItem[]> {
    return [...this.queue];
  }

  async updateJobSchedule(scheduleId: string, updates: Partial<JobSchedule>) {
    try {
      const scheduleRef = doc(db, 'jobSchedules', scheduleId);
      await updateDoc(scheduleRef, {
        ...updates,
        updatedAt: new Date()
      });

      // Restart the job if it's active
      const schedule = await this.getJobSchedules();
      const updatedSchedule = schedule.find(s => s.id === scheduleId);
      if (updatedSchedule?.isActive) {
        this.startJob(updatedSchedule.type, updatedSchedule.interval);
      }

      console.log(`✅ Updated job schedule: ${scheduleId}`);
    } catch (error) {
      console.error('❌ Error updating job schedule:', error);
      throw error;
    }
  }

  async runManualJob(jobType: string) {
    console.log(`🔄 Running manual ${jobType} job...`);
    await this.addToQueue(jobType, 'system');
  }

  async addManualJob(jobType: string, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    return this.addToQueue(jobType, 'system');
  }

  async resetToDefaultSchedules() {
    try {
      const schedulesQuery = query(collection(db, 'jobSchedules'));
      const schedulesSnapshot = await getDocs(schedulesQuery);
      
      const batch = writeBatch(db);
      
      schedulesSnapshot.forEach((scheduleDoc) => {
        const schedule = scheduleDoc.data() as JobSchedule;
        const updates: Partial<JobSchedule> = {
          interval: 10,
          isActive: schedule.type === 'customer_sync',
          updatedAt: new Date()
        };
        
        batch.update(scheduleDoc.ref, updates);
      });
      
      await batch.commit();
      console.log('✅ Reset all schedules to default (only customer_sync active)');
      
      // Restart active jobs
      this.startActiveJobs();
    } catch (error) {
      console.error('❌ Error resetting schedules:', error);
    }
  }

  async getAutomationStatus() {
    try {
      const schedules = await this.getJobSchedules();
      const activeJobs = schedules.filter(s => s.isActive);
      
      // Debug: Log all schedules to see if there are duplicates
      console.log('🔍 Current schedules in database:', schedules.map(s => ({ id: s.id, type: s.type, isActive: s.isActive })));
      
      return {
        totalSchedules: schedules.length,
        activeJobs: activeJobs.length,
        activeJobTypes: activeJobs.map(s => s.type),
        defaultActiveJob: 'customer_sync',
        intervalMinutes: 10
      };
    } catch (error) {
      console.error('❌ Error getting automation status:', error);
      return null;
    }
  }

  async cleanupDuplicateSchedules() {
    try {
      const schedules = await this.getJobSchedules();
      const typeCounts = new Map<string, string[]>();
      
      // Group schedules by type
      schedules.forEach(schedule => {
        if (!typeCounts.has(schedule.type)) {
          typeCounts.set(schedule.type, []);
        }
        typeCounts.get(schedule.type)!.push(schedule.id);
      });
      
      const batch = writeBatch(db);
      let hasChanges = false;
      
      // For each type, keep only the first schedule and delete the rest
      typeCounts.forEach((scheduleIds, type) => {
        if (scheduleIds.length > 1) {
          console.log(`🧹 Found ${scheduleIds.length} schedules for ${type}, keeping first one and deleting ${scheduleIds.length - 1} duplicates`);
          
          // Keep the first one, delete the rest
          for (let i = 1; i < scheduleIds.length; i++) {
            const scheduleRef = doc(db, 'jobSchedules', scheduleIds[i]);
            batch.delete(scheduleRef);
            hasChanges = true;
          }
        }
      });
      
      if (hasChanges) {
        await batch.commit();
        console.log('✅ Cleaned up duplicate schedules');
      } else {
        console.log('✅ No duplicate schedules found');
      }
    } catch (error) {
      console.error('❌ Error cleaning up duplicate schedules:', error);
    }
  }

  destroy() {
    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.intervals.clear();
    this.queue = [];
    this.isProcessingQueue = false;
    console.log('✅ Enhanced Job Scheduler destroyed');
  }
}

export const jobScheduler = new JobScheduler(); 