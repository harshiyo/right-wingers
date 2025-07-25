import { localDB } from './localdb';
import { printReceiptIfLocal } from './printReceiptIfLocal';
import { listenForOrders, fetchOrdersSince } from './firebase';
import { Order } from './types';

export async function syncAndPrintOrders(currentStoreId: string) {
  // Listen for new orders in real-time
  listenForOrders(currentStoreId, async (order: Order) => {
    await localDB.saveOrder({
      orderId: order.id,
      storeId: order.storeId,
      orderData: order,
      printed: false,
      timestamp: Date.now()
    });
    await tryPrintUnprinted(currentStoreId);
  });

  // On reconnect or app start
  const lastSync = await localDB.getLastSyncTime(currentStoreId);
  const newOrders = await fetchOrdersSince(currentStoreId, lastSync);
  for (const order of newOrders) {
    await localDB.saveOrder({
      orderId: order.id,
      storeId: order.storeId,
      orderData: order,
      printed: false,
      timestamp: Date.now()
    });
  }
  await tryPrintUnprinted(currentStoreId);
}

export async function tryPrintUnprinted(currentStoreId: string) {
  const unprinted = await localDB.getUnprintedOrders(currentStoreId);
  for (const localOrder of unprinted) {
    const printed = await printReceiptIfLocal(localOrder.orderData, currentStoreId, 'new');
    if (printed) await localDB.markPrinted(localOrder.orderId);
  }
} 