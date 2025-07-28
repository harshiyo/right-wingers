import { collection, addDoc, getDocs, query, orderBy, where, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { notifyJobComplete } from './notificationService';

export interface JobStatus {
  id: string;
  type: 'customer_sync' | 'order_sync' | 'inventory_sync';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
  recordsProcessed?: number;
  createdAt: Date;
}

export interface JobSchedule {
  id: string;
  type: 'customer_sync' | 'order_sync' | 'inventory_sync';
  interval: number; // in minutes
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

class JobScheduler {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Create default job schedules if they don't exist
      await this.ensureDefaultSchedules();
      
      // Start all active jobs
      await this.startActiveJobs();
      
      this.isInitialized = true;
      console.log('✅ Job Scheduler initialized');
    } catch (error) {
      console.error('❌ Error initializing job scheduler:', error);
    }
  }

  private async ensureDefaultSchedules() {
    try {
      const schedulesQuery = query(collection(db, 'jobSchedules'));
      const schedulesSnapshot = await getDocs(schedulesQuery);
      
      if (schedulesSnapshot.empty) {
        // Create default customer sync job (every 5 minutes)
        await addDoc(collection(db, 'jobSchedules'), {
          type: 'customer_sync',
          interval: 5,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log('✅ Created default customer sync schedule');
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
      await this.runJob(jobType);
    }, intervalMinutes * 60 * 1000);

    this.intervals.set(jobType, interval);
    console.log(`✅ Started ${jobType} job with ${intervalMinutes} minute interval`);
  }

  private async runJob(jobType: string) {
    const jobId = `${jobType}_${Date.now()}`;
    
    try {
      console.log(`🔄 Starting ${jobType} job: ${jobId}`);
      
      // Create job status record
      const jobStatusRef = await addDoc(collection(db, 'jobStatus'), {
        type: jobType,
        status: 'running',
        startTime: new Date(),
        createdAt: new Date()
      });

      const startTime = Date.now();
      let recordsProcessed = 0;

      // Execute the specific job
      switch (jobType) {
        case 'customer_sync':
          recordsProcessed = await this.runCustomerSync();
          break;
        case 'order_sync':
          recordsProcessed = await this.runOrderSync();
          break;
        case 'inventory_sync':
          recordsProcessed = await this.runInventorySync();
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
        recordsProcessed
      });

      // Update schedule last run time
      await this.updateScheduleLastRun(jobType);

      // Create notification for job completion
      await notifyJobComplete(jobType, {
        jobId: jobStatusRef.id,
        recordsProcessed,
        duration,
        type: jobType
      });

      console.log(`✅ ${jobType} job completed: ${recordsProcessed} records processed in ${duration}ms`);
      
    } catch (error) {
      console.error(`❌ Error running ${jobType} job:`, error);
      
      // Update job status as failed
      const jobStatusRef = await addDoc(collection(db, 'jobStatus'), {
        type: jobType,
        status: 'failed',
        startTime: new Date(),
        endTime: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        createdAt: new Date()
      });
    }
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
        lastOrderDate: any; // Allow any type for flexibility
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
          // Ensure lastOrderDate is a string and format it properly
          let formattedLastOrderDate: string;
          if (typeof stats.lastOrderDate === 'string') {
            formattedLastOrderDate = stats.lastOrderDate.split('T')[0];
          } else if (stats.lastOrderDate && typeof stats.lastOrderDate === 'object' && 'toISOString' in stats.lastOrderDate) {
            formattedLastOrderDate = (stats.lastOrderDate as Date).toISOString().split('T')[0];
          } else {
            // Fallback to current date if invalid
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

  private async runOrderSync(): Promise<number> {
    // Placeholder for order sync logic
    console.log('🔄 Running order sync job...');
    return 0;
  }

  private async runInventorySync(): Promise<number> {
    // Placeholder for inventory sync logic
    console.log('🔄 Running inventory sync job...');
    return 0;
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

  async getJobStatus(limit: number = 50): Promise<JobStatus[]> {
    try {
      const statusQuery = query(
        collection(db, 'jobStatus'),
        orderBy('createdAt', 'desc')
      );
      const statusSnapshot = await getDocs(statusQuery);
      
      return statusSnapshot.docs.slice(0, limit).map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate(),
        endTime: doc.data().endTime?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
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
    await this.runJob(jobType);
  }

  destroy() {
    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.intervals.clear();
    console.log('✅ Job Scheduler destroyed');
  }
}

export const jobScheduler = new JobScheduler(); 