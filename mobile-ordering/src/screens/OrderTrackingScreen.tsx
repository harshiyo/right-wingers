import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Order {
  id: string;
  orderNumber: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  items: OrderItem[];
  total: number;
  estimatedTime: string;
  createdAt: Date;
  storeName: string;
  orderType: 'pickup' | 'delivery';
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: '#RW-2024-001',
    status: 'preparing',
    items: [
      { name: 'Pepperoni Pizza (Large)', quantity: 1, price: 18.99 },
      { name: 'Buffalo Wings (12pc)', quantity: 1, price: 12.99 },
      { name: 'Coke (2L)', quantity: 1, price: 3.99 },
    ],
    total: 35.97,
    estimatedTime: '25-30 min',
    createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
    storeName: 'Right Wingers - Downtown',
    orderType: 'pickup',
  },
  {
    id: '2',
    orderNumber: '#RW-2024-002',
    status: 'ready',
    items: [
      { name: 'Supreme Combo', quantity: 1, price: 24.99 },
    ],
    total: 24.99,
    estimatedTime: 'Ready for pickup',
    createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
    storeName: 'Right Wingers - Downtown',
    orderType: 'pickup',
  },
  {
    id: '3',
    orderNumber: '#RW-2024-003',
    status: 'delivered',
    items: [
      { name: 'Margherita Pizza (Medium)', quantity: 1, price: 15.99 },
      { name: 'Garlic Bread', quantity: 1, price: 4.99 },
    ],
    total: 20.98,
    estimatedTime: 'Delivered',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    storeName: 'Right Wingers - Downtown',
    orderType: 'delivery',
  },
];

const statusConfig = {
  pending: { color: '#ff9800', icon: 'time', label: 'Order Placed' },
  preparing: { color: '#2196f3', icon: 'restaurant', label: 'Preparing' },
  ready: { color: '#4caf50', icon: 'checkmark-circle', label: 'Ready' },
  delivered: { color: '#4caf50', icon: 'checkmark-done-circle', label: 'Delivered' },
  cancelled: { color: '#f44336', icon: 'close-circle', label: 'Cancelled' },
};

const progressSteps = [
  { key: 'pending', label: 'Order Placed', icon: 'receipt' },
  { key: 'preparing', label: 'Preparing', icon: 'restaurant' },
  { key: 'ready', label: 'Ready', icon: 'checkmark-circle' },
  { key: 'delivered', label: 'Completed', icon: 'checkmark-done-circle' },
];

export const OrderTrackingScreen: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const getStatusIndex = (status: Order['status']) => {
    return progressSteps.findIndex(step => step.key === status);
  };

  const renderProgressBar = (order: Order) => {
    const currentIndex = getStatusIndex(order.status);
    const totalSteps = progressSteps.length;

    return (
      <View style={styles.progressContainer}>
        {progressSteps.map((step, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <View key={step.key} style={styles.progressStep}>
              <View style={styles.progressStepContent}>
                <View
                  style={[
                    styles.progressIcon,
                    isCompleted && styles.progressIconCompleted,
                    isCurrent && styles.progressIconCurrent,
                  ]}
                >
                  <Ionicons
                    name={step.icon as any}
                    size={16}
                    color={isCompleted ? '#fff' : '#ccc'}
                  />
                </View>
                <Text
                  style={[
                    styles.progressLabel,
                    isCompleted && styles.progressLabelCompleted,
                  ]}
                >
                  {step.label}
                </Text>
              </View>
              {index < totalSteps - 1 && (
                <View
                  style={[
                    styles.progressLine,
                    index < currentIndex && styles.progressLineCompleted,
                  ]}
                />
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderOrderCard = (order: Order) => {
    const status = statusConfig[order.status];
    const isExpanded = selectedOrder?.id === order.id;

    return (
      <TouchableOpacity
        key={order.id}
        style={[styles.orderCard, isExpanded && styles.orderCardExpanded]}
        onPress={() => setSelectedOrder(isExpanded ? null : order)}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            <Text style={styles.orderTime}>
              {order.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
            <Ionicons name={status.icon as any} size={16} color="#fff" />
            <Text style={styles.statusText}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.orderSummary}>
          <Text style={styles.orderType}>
            {order.orderType === 'pickup' ? '🛍️ Pickup' : '🚚 Delivery'}
          </Text>
          <Text style={styles.orderTotal}>${order.total.toFixed(2)}</Text>
        </View>

        {isExpanded && (
          <View style={styles.orderDetails}>
            <Text style={styles.detailsTitle}>Order Details</Text>
            {order.items.map((item, index) => (
              <View key={index} style={styles.orderItem}>
                <Text style={styles.itemName}>
                  {item.quantity}x {item.name}
                </Text>
                <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
              </View>
            ))}
            
            <View style={styles.estimatedTime}>
              <Ionicons name="time" size={16} color="#666" />
              <Text style={styles.estimatedTimeText}>
                {order.estimatedTime}
              </Text>
            </View>

            {renderProgressBar(order)}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order Tracking</Text>
        <Text style={styles.headerSubtitle}>Track your orders in real time</Text>
      </View>

      {/* Active Orders */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Orders</Text>
          {orders.filter(order => order.status !== 'delivered' && order.status !== 'cancelled').map(renderOrderCard)}
        </View>

        {/* Recent Orders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          {orders.filter(order => order.status === 'delivered' || order.status === 'cancelled').map(renderOrderCard)}
        </View>

        {orders.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Orders Yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Place your first order to see it here
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderCardExpanded: {
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  orderSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderType: {
    fontSize: 14,
    color: '#666',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  orderDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  estimatedTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  estimatedTimeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressStep: {
    flex: 1,
    alignItems: 'center',
  },
  progressStepContent: {
    alignItems: 'center',
  },
  progressIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressIconCompleted: {
    backgroundColor: '#4caf50',
  },
  progressIconCurrent: {
    backgroundColor: '#2196f3',
  },
  progressLabel: {
    fontSize: 10,
    color: '#ccc',
    textAlign: 'center',
  },
  progressLabelCompleted: {
    color: '#333',
    fontWeight: '500',
  },
  progressLine: {
    position: 'absolute',
    top: 16,
    left: '50%',
    width: '100%',
    height: 2,
    backgroundColor: '#f0f0f0',
    zIndex: -1,
  },
  progressLineCompleted: {
    backgroundColor: '#4caf50',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
}); 