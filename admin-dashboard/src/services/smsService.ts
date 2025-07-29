import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  isEnabled: boolean;
}

interface SMSMessage {
  to: string;
  from: string;
  body: string;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
}

export class SMSService {
  private static instance: SMSService;
  private twilioConfig: TwilioConfig | null = null;

  private constructor() {}

  static getInstance(): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService();
    }
    return SMSService.instance;
  }

  async loadTwilioConfig(): Promise<TwilioConfig | null> {
    try {
      const storesSnapshot = await getDocs(collection(db, 'stores'));
      if (!storesSnapshot.empty) {
        const firstStore = storesSnapshot.docs[0].data();
        if (firstStore.twilioConfig) {
          this.twilioConfig = firstStore.twilioConfig;
          return this.twilioConfig;
        }
      }
      return null;
    } catch (error) {
      console.error('Error loading Twilio config:', error);
      return null;
    }
  }

  async isSMSEnabled(): Promise<boolean> {
    const config = await this.loadTwilioConfig();
    return config?.isEnabled || false;
  }

  async sendSMS(to: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      const config = await this.loadTwilioConfig();
      
      if (!config || !config.isEnabled) {
        return { success: false, error: 'SMS service is not configured or enabled' };
      }

      if (!config.accountSid || !config.authToken || !config.phoneNumber) {
        return { success: false, error: 'Twilio configuration is incomplete' };
      }

      // In a real implementation, you would use the Twilio SDK here
      // For now, we'll simulate the SMS sending process
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate success (in real implementation, this would be the Twilio API response)
      const smsMessage: SMSMessage = {
        to,
        from: config.phoneNumber,
        body: message,
        status: 'sent'
      };

      // Log the SMS message to Firestore for tracking
      await addDoc(collection(db, 'smsLogs'), {
        ...smsMessage,
        sentAt: serverTimestamp(),
        configUsed: {
          accountSid: config.accountSid.substring(0, 10) + '...', // Partial for security
          phoneNumber: config.phoneNumber
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error sending SMS:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async sendBulkSMS(recipients: string[], message: string): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      success: true,
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Check if SMS is enabled
    const isEnabled = await this.isSMSEnabled();
    if (!isEnabled) {
      return {
        success: false,
        sent: 0,
        failed: recipients.length,
        errors: ['SMS service is not enabled']
      };
    }

    // Send SMS to each recipient
    for (const recipient of recipients) {
      try {
        const result = await this.sendSMS(recipient, message);
        if (result.success) {
          results.sent++;
        } else {
          results.failed++;
          if (result.error) {
            results.errors.push(`Failed to send to ${recipient}: ${result.error}`);
          }
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Error sending to ${recipient}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    results.success = results.failed === 0;
    return results;
  }

  async testSMSService(): Promise<{ success: boolean; error?: string }> {
    try {
      const config = await this.loadTwilioConfig();
      
      if (!config || !config.isEnabled) {
        return { success: false, error: 'SMS service is not enabled' };
      }

      if (!config.accountSid || !config.authToken || !config.phoneNumber) {
        return { success: false, error: 'Twilio configuration is incomplete' };
      }

      // In a real implementation, you would test the Twilio credentials here
      // For now, we'll simulate a successful test
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      return { success: true };
    } catch (error) {
      console.error('Error testing SMS service:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Method to get SMS logs for the Marketing module
  async getSMSLogs(limit: number = 50): Promise<any[]> {
    try {
      // In a real implementation, you would fetch from a 'smsLogs' collection
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error fetching SMS logs:', error);
      return [];
    }
  }
}

// Export a singleton instance
export const smsService = SMSService.getInstance(); 