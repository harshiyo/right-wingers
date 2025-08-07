import { useEffect } from 'react';
import { X, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

interface OrderNotificationProps {
  orderId: string;
  customerName?: string;
  onClose: () => void;
}

export const OrderNotification: React.FC<OrderNotificationProps> = ({
  orderId,
  customerName,
  onClose
}) => {
  // Auto-dismiss after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 10000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -100, opacity: 0 }}
      className="bg-white rounded-lg shadow-lg p-4 mb-2 border-l-4 border-red-500 flex items-center justify-between"
      style={{ width: '400px' }}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-100 rounded-full">
          <Globe className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">New Online Order!</h3>
          <p className="text-sm text-gray-600">
            {customerName ? `From ${customerName}` : `Order #${orderId}`}
          </p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>
    </motion.div>
  );
}; 