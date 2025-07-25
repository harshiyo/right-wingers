import Dexie, { Table } from 'dexie';

export interface LocalOrder {
  orderId: string;
  storeId: string;
  orderData: any;
  printed: boolean;
  timestamp: number;
}

class LocalDB extends Dexie {
  orders!: Table<LocalOrder, string>;
  constructor() {
    super('RightWingersPOS');
    this.version(1).stores({
      orders: 'orderId, storeId, printed, timestamp'
    });
  }
  async saveOrder(order: LocalOrder) {
    await this.orders.put(order);
  }
  async markPrinted(orderId: string) {
    await this.orders.update(orderId, { printed: true });
  }
  async getUnprintedOrders(storeId: string) {
    return this.orders.where({ storeId, printed: false }).toArray();
  }
  async getLastSyncTime(storeId: string): Promise<number> {
    const last = await this.orders.where({ storeId }).last();
    return last ? last.timestamp : 0;
  }
}

export const localDB = new LocalDB(); 