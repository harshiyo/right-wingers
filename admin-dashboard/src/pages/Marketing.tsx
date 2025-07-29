import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../services/auth';
import { smsService } from '../services/smsService';
import { 
  MessageSquare, 
  Users, 
  Send, 
  Check, 
  X, 
  Phone, 
  Mail, 
  User, 
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  Clock,
  Settings
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
  };
  isBlocked?: boolean;
  blockedNote?: string;
  createdAt: string;
  lastOrder?: string;
  totalOrders?: number;
  totalSpent?: number;
}

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: 'promotional' | 'informational' | 'reminder';
}

const Marketing = () => {
  const { currentUser } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [messageHistory, setMessageHistory] = useState<any[]>([]);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsConfigStatus, setSmsConfigStatus] = useState<'loading' | 'enabled' | 'disabled' | 'error'>('loading');

  // Message templates
  const messageTemplates: MessageTemplate[] = [
    {
      id: 'welcome',
      name: 'Welcome Message',
      content: 'Welcome to Right Wingers! 🍕 Thank you for choosing us. Enjoy 10% off your first order with code WELCOME10.',
      category: 'promotional'
    },
    {
      id: 'promo',
      name: 'Special Promotion',
      content: '🔥 Hot Deal Alert! Get 20% off all pizzas this weekend. Use code WEEKEND20. Order now!',
      category: 'promotional'
    },
    {
      id: 'reminder',
      name: 'Order Reminder',
      content: 'Missing our delicious pizza? 🍕 Place your order now and get it delivered hot and fresh!',
      category: 'reminder'
    },
    {
      id: 'info',
      name: 'Store Update',
      content: 'We\'re now open for delivery until 11 PM! 🚚 Order your favorite pizza anytime.',
      category: 'informational'
    },
    {
      id: 'loyalty',
      name: 'Loyalty Reward',
      content: 'You\'ve earned a free side with your next order! 🎉 Use code LOYALTY for your reward.',
      category: 'promotional'
    }
  ];

  useEffect(() => {
    fetchCustomers();
    fetchMessageHistory();
    checkSMSStatus();
  }, []);

  const checkSMSStatus = async () => {
    try {
      setSmsConfigStatus('loading');
      const isEnabled = await smsService.isSMSEnabled();
      setSmsEnabled(isEnabled);
      setSmsConfigStatus(isEnabled ? 'enabled' : 'disabled');
    } catch (error) {
      console.error('Error checking SMS status:', error);
      setSmsConfigStatus('error');
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const customersQuery = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(customersQuery);
      const customersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Customer[];
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessageHistory = async () => {
    try {
      const historyQuery = query(collection(db, 'messageHistory'), orderBy('sentAt', 'desc'));
      const snapshot = await getDocs(historyQuery);
      const historyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessageHistory(historyData);
    } catch (error) {
      console.error('Error fetching message history:', error);
    }
  };

  const handleCustomerSelection = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSelectAll = () => {
    const filteredCustomerIds = filteredCustomers.map(c => c.id);
    setSelectedCustomers(filteredCustomerIds);
  };

  const handleDeselectAll = () => {
    setSelectedCustomers([]);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = messageTemplates.find(t => t.id === templateId);
    if (template) {
      setMessage(template.content);
      setSelectedTemplate(templateId);
    }
  };

  const sendMessages = async () => {
    if (!message.trim() || selectedCustomers.length === 0) {
      alert('Please select customers and enter a message.');
      return;
    }

    try {
      setSending(true);
      
      // Get selected customer phone numbers
      const selectedCustomerData = customers.filter(c => selectedCustomers.includes(c.id));
      const phoneNumbers = selectedCustomerData.map(c => c.phone).filter(phone => phone);
      
      if (phoneNumbers.length === 0) {
        alert('No valid phone numbers found for selected customers.');
        return;
      }

      let result;
      
      if (smsEnabled) {
        // Send real SMS using the SMS service
        result = await smsService.sendBulkSMS(phoneNumbers, message);
      } else {
        // Simulate SMS sending for testing
        console.log('SMS disabled - simulating message sending');
        await new Promise(resolve => setTimeout(resolve, 2000));
        result = {
          success: true,
          sent: phoneNumbers.length,
          failed: 0,
          errors: []
        };
      }

      // Save message to history
      const messageData = {
        content: message,
        recipients: selectedCustomers.length,
        customerIds: selectedCustomers,
        phoneNumbers: phoneNumbers,
        sentBy: currentUser?.id,
        sentByEmail: currentUser?.email,
        sentAt: serverTimestamp(),
        status: result.success ? 'sent' : 'failed',
        smsEnabled: smsEnabled,
        sentCount: result.sent,
        failedCount: result.failed,
        errors: result.errors
      };

      await addDoc(collection(db, 'messageHistory'), messageData);

      if (result.success) {
        alert(`Message sent successfully! ${result.sent} messages delivered, ${result.failed} failed.`);
      } else {
        alert(`Message sending completed with errors. ${result.sent} sent, ${result.failed} failed. Check console for details.`);
        console.error('SMS sending errors:', result.errors);
      }
      
      // Reset form
      setMessage('');
      setSelectedCustomers([]);
      setSelectedTemplate('');
      
      // Refresh message history
      fetchMessageHistory();
      
    } catch (error) {
      console.error('Error sending messages:', error);
      alert('Error sending messages. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         customer.phone.includes(searchQuery) ||
                         customer.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'active' && !customer.isBlocked) ||
                         (filterType === 'blocked' && customer.isBlocked) ||
                         (filterType === 'with-orders' && (customer.totalOrders || 0) > 0);

    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSMSStatusBadge = () => {
    switch (smsConfigStatus) {
      case 'loading':
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Loading...</span>;
      case 'enabled':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">SMS Enabled</span>;
      case 'disabled':
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">SMS Disabled</span>;
      case 'error':
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">SMS Error</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Marketing</h1>
          <p className="text-gray-600 mt-2">Send promotional messages and updates to your customers</p>
        </div>
        <div className="flex items-center gap-4">
          {getSMSStatusBadge()}
          <span className="text-sm text-gray-500">
            {selectedCustomers.length} customers selected
          </span>
          <Button
            onClick={() => window.location.href = '/settings'}
            variant="outline"
            className="text-xs"
          >
            <Settings className="h-3 w-3 mr-1" />
            SMS Settings
          </Button>
        </div>
      </div>

      {/* SMS Status Alert */}
      {smsConfigStatus === 'disabled' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">SMS Service Not Configured</h3>
              <p className="text-sm text-yellow-700 mt-1">
                To send real SMS messages, please configure your Twilio settings in the Settings page.
                Messages will be simulated until SMS is enabled.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Customer Selection */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Select Customers</h2>
              <div className="flex gap-2">
                <Button
                  onClick={handleSelectAll}
                  variant="outline"
                  className="text-xs"
                >
                  Select All
                </Button>
                <Button
                  onClick={handleDeselectAll}
                  variant="outline"
                  className="text-xs"
                >
                  Clear All
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Customers</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by name, phone, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter</label>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All Customers</option>
                  <option value="active">Active Customers</option>
                  <option value="blocked">Blocked Customers</option>
                  <option value="with-orders">Customers with Orders</option>
                </Select>
              </div>
            </div>

            {/* Customer List */}
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading customers...</p>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No customers found matching your criteria.
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer ${
                        selectedCustomers.includes(customer.id) ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => handleCustomerSelection(customer.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            selectedCustomers.includes(customer.id)
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-gray-300'
                          }`}>
                            {selectedCustomers.includes(customer.id) && (
                              <Check className="h-2.5 w-2.5 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-medium text-gray-900 truncate">
                                {customer.name}
                              </h3>
                              {customer.isBlocked && (
                                <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                                  Blocked
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {customer.phone}
                              </span>
                              {customer.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {customer.email}
                                </span>
                              )}
                              {customer.totalOrders && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {customer.totalOrders} orders
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Message Composition */}
        <div className="space-y-6">
          {/* Message Templates */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Templates</h3>
            <div className="space-y-2">
              {messageTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedTemplate === template.id
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{template.name}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      template.category === 'promotional' ? 'bg-orange-100 text-orange-800' :
                      template.category === 'informational' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {template.category}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Message Composition */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Compose Message</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message Content
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your message here..."
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  maxLength={160}
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500">
                    {message.length}/160 characters
                  </span>
                  <span className="text-xs text-gray-500">
                    {Math.ceil(message.length / 160)} SMS
                  </span>
                </div>
              </div>

              <Button
                onClick={sendMessages}
                disabled={!message.trim() || selectedCustomers.length === 0 || sending}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {smsEnabled ? 'Sending SMS...' : 'Simulating...'}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {smsEnabled ? 'Send SMS' : 'Send (Simulated)'} to {selectedCustomers.length} customers
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Message History */}
      <div className="mt-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Message History</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipients</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SMS</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {messageHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No message history yet.
                    </td>
                  </tr>
                ) : (
                  messageHistory.map((msg) => (
                    <tr key={msg.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {msg.content}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {msg.recipients} customers
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {msg.sentByEmail}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {msg.sentAt?.toDate ? msg.sentAt.toDate().toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(msg.status)}`}>
                          {msg.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          msg.smsEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {msg.smsEnabled ? 'Real SMS' : 'Simulated'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Marketing; 