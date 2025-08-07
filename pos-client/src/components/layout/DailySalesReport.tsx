import React, { useState, useEffect } from 'react';
import { X, Printer, Calendar, DollarSign, Package, Truck, Users } from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useStore } from '../../context/StoreContext';

interface DailySalesReportProps {
  open: boolean;
  onClose: () => void;
}

interface DailySalesData {
  totalOrders: number;
  deliveryOrders: number;
  pickupOrders: number;
  cancelledOrders: number;
  grossSalesWithTax: number;
  grossSalesWithoutTax: number;
  totalTaxCollected: number;
  averageOrderValue: number;
  uniqueCustomers: number;
  firstOrderTime: string;
  lastOrderTime: string;
  peakHour: string;
  ordersByHour: { [key: string]: number };
}

export const DailySalesReport: React.FC<DailySalesReportProps> = ({ open, onClose }) => {
  const [reportData, setReportData] = useState<DailySalesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { currentStore } = useStore();

  const generateDailyReport = async () => {
    if (!currentStore?.id) return;
    
    setIsLoading(true);
    try {
      // Get start and end of today
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      // Fetch all orders for today for this store
      const ordersQuery = query(
        collection(db, 'orders'),
        where('storeId', '==', currentStore.id),
        where('timestamp', '>=', startOfDay.getTime()),
        where('timestamp', '<=', endOfDay.getTime()),
        orderBy('timestamp', 'asc')
      );

      const snapshot = await getDocs(ordersQuery);
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any));

      // Calculate report data
      const validOrders = orders.filter((order: any) => order.status !== 'cancelled');
      const cancelledOrders = orders.filter((order: any) => order.status === 'cancelled');
      
      const deliveryOrders = validOrders.filter((order: any) => order.orderType === 'delivery');
      const pickupOrders = validOrders.filter((order: any) => order.orderType === 'pickup');
      
      // Fix tax calculation - use tax field from order data
      const grossSalesWithTax = validOrders.reduce((sum: number, order: any) => sum + (order.total || 0), 0);
      const totalTaxCollected = validOrders.reduce((sum: number, order: any) => {
        // Try different possible tax field names
        const taxAmount = order.tax || order.taxAmount || order.taxCollected || 0;
        return sum + taxAmount;
      }, 0);
      const grossSalesWithoutTax = grossSalesWithTax - totalTaxCollected;
      
      const averageOrderValue = validOrders.length > 0 ? grossSalesWithTax / validOrders.length : 0;
      
      // Get unique customers
      const uniqueCustomers = new Set(validOrders.map((order: any) => order.customerInfo?.phone || '')).size;
      
      // Get first and last order times
      const firstOrder = validOrders[0];
      const lastOrder = validOrders[validOrders.length - 1];
      
      const firstOrderTime = firstOrder ? new Date(firstOrder.timestamp).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }) : 'N/A';
      
      const lastOrderTime = lastOrder ? new Date(lastOrder.timestamp).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }) : 'N/A';
      
      // Calculate orders by hour and find peak hour
      const ordersByHour: { [key: string]: number } = {};
      let peakHour = 'N/A';
      let maxOrders = 0;
      
      validOrders.forEach((order: any) => {
        const hour = new Date(order.timestamp).getHours();
        const hourKey = `${hour}:00`;
        ordersByHour[hourKey] = (ordersByHour[hourKey] || 0) + 1;
        
        if (ordersByHour[hourKey] > maxOrders) {
          maxOrders = ordersByHour[hourKey];
          peakHour = hourKey;
        }
      });

      const data: DailySalesData = {
        totalOrders: validOrders.length,
        deliveryOrders: deliveryOrders.length,
        pickupOrders: pickupOrders.length,
        cancelledOrders: cancelledOrders.length,
        grossSalesWithTax,
        grossSalesWithoutTax,
        totalTaxCollected,
        averageOrderValue,
        uniqueCustomers,
        firstOrderTime,
        lastOrderTime,
        peakHour,
        ordersByHour
      };

      setReportData(data);
    } catch (error) {
      console.error('Error generating daily report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      generateDailyReport();
    }
  }, [open, currentStore?.id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const printReport = async () => {
    if (!reportData) return;
    
    if (window.electronAPI && typeof (window.electronAPI as any).printDailySalesReport === 'function') {
      await (window.electronAPI as any).printDailySalesReport(reportData, currentStore?.name);
    } else {
      // Fallback for browser mode
      const printContent = `
        ${currentStore?.name || 'Store'} - Daily Sales Report
        ${new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
        
        ORDER SUMMARY:
        Total Orders: ${reportData.totalOrders}
        Delivery Orders: ${reportData.deliveryOrders} (${((reportData.deliveryOrders / reportData.totalOrders) * 100).toFixed(1)}%)
        Pickup Orders: ${reportData.pickupOrders} (${((reportData.pickupOrders / reportData.totalOrders) * 100).toFixed(1)}%)
        Cancelled Orders: ${reportData.cancelledOrders}
        
        FINANCIAL SUMMARY:
        Gross Sales (with tax): ${formatCurrency(reportData.grossSalesWithTax)}
        Gross Sales (without tax): ${formatCurrency(reportData.grossSalesWithoutTax)}
        Total Tax Collected: ${formatCurrency(reportData.totalTaxCollected)}
        Average Order Value: ${formatCurrency(reportData.averageOrderValue)}
        
        CUSTOMER INSIGHTS:
        Unique Customers: ${reportData.uniqueCustomers}
        First Order: ${reportData.firstOrderTime}
        Last Order: ${reportData.lastOrderTime}
        Peak Hour: ${reportData.peakHour}
        
        ORDERS BY HOUR:
        ${Object.entries(reportData.ordersByHour)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([hour, count]) => `${hour}: ${count} orders`)
          .join('\n')}
        
        Generated on: ${new Date().toLocaleString()}
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Daily Sales Report</title>
              <style>
                body { font-family: monospace; font-size: 12px; line-height: 1.4; }
                .header { text-align: center; font-weight: bold; margin-bottom: 20px; }
                .section { margin-bottom: 15px; }
                .section-title { font-weight: bold; text-decoration: underline; margin-bottom: 5px; }
                .metric { margin-bottom: 3px; }
                @media print {
                  body { margin: 0; padding: 10px; }
                }
              </style>
            </head>
            <body>
              <pre>${printContent}</pre>
              <script>window.print();</script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-2xl max-h-[70vh] rounded-xl shadow-xl z-50 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-100 rounded-lg">
              <Calendar className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Daily Sales Report</h2>
              <p className="text-xs text-gray-500">
                {currentStore?.name} • {new Date().toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-3 overflow-y-auto max-h-[calc(70vh-100px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
              <span className="ml-2 text-gray-600 text-sm">Generating report...</span>
            </div>
          ) : reportData ? (
            <div className="space-y-3">
              {/* Order Summary - Compact Cards */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-blue-50 p-2 rounded-lg text-center">
                  <Package className="w-3 h-3 text-blue-600 mx-auto mb-1" />
                  <p className="text-xs text-blue-600 font-medium">Total</p>
                  <p className="text-sm font-bold text-blue-900">{reportData.totalOrders}</p>
                </div>
                
                <div className="bg-green-50 p-2 rounded-lg text-center">
                  <Truck className="w-3 h-3 text-green-600 mx-auto mb-1" />
                  <p className="text-xs text-green-600 font-medium">Delivery</p>
                  <p className="text-sm font-bold text-green-900">{reportData.deliveryOrders}</p>
                </div>
                
                <div className="bg-purple-50 p-2 rounded-lg text-center">
                  <Package className="w-3 h-3 text-purple-600 mx-auto mb-1" />
                  <p className="text-xs text-purple-600 font-medium">Pickup</p>
                  <p className="text-sm font-bold text-purple-900">{reportData.pickupOrders}</p>
                </div>
                
                <div className="bg-red-50 p-2 rounded-lg text-center">
                  <X className="w-3 h-3 text-red-600 mx-auto mb-1" />
                  <p className="text-xs text-red-600 font-medium">Cancelled</p>
                  <p className="text-sm font-bold text-red-900">{reportData.cancelledOrders}</p>
                </div>
              </div>

              {/* Financial Summary - Compact */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Financial Summary
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-600">Gross Sales (with tax)</p>
                    <p className="font-bold text-gray-900">{formatCurrency(reportData.grossSalesWithTax)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Gross Sales (without tax)</p>
                    <p className="font-bold text-gray-900">{formatCurrency(reportData.grossSalesWithoutTax)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Tax Collected</p>
                    <p className="font-bold text-gray-900">{formatCurrency(reportData.totalTaxCollected)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Average Order Value</p>
                    <p className="font-bold text-gray-900">{formatCurrency(reportData.averageOrderValue)}</p>
                  </div>
                </div>
              </div>

              {/* Customer Insights - Compact */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Customer Insights
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-600">Unique Customers</p>
                    <p className="font-bold text-gray-900">{reportData.uniqueCustomers}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Peak Hour</p>
                    <p className="font-bold text-gray-900">{reportData.peakHour}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">First Order</p>
                    <p className="font-bold text-gray-900">{reportData.firstOrderTime}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Last Order</p>
                    <p className="font-bold text-gray-900">{reportData.lastOrderTime}</p>
                  </div>
                </div>
              </div>

              {/* Orders by Hour - Compact */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Orders by Hour</h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
                  {Object.entries(reportData.ordersByHour)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([hour, count]) => (
                      <div key={hour} className="text-center p-1 bg-white rounded text-xs">
                        <p className="font-medium text-gray-900">{hour}</p>
                        <p className="font-bold text-red-600">{count}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500 text-sm">No data available for today</p>
            </div>
          )}
        </div>

        {reportData && (
          <div className="flex items-center justify-between p-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-600">
              Generated {new Date().toLocaleTimeString()}
            </p>
            <button
              onClick={printReport}
              className="flex items-center gap-1 px-2 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
            >
              <Printer className="w-3 h-3" />
              Print
            </button>
          </div>
        )}
      </div>
    </div>
  );
}; 