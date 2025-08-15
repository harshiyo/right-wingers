import React, { memo } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';
import { PaymentMethod } from '../../hooks/useCheckout';

interface PaymentMethodCardProps {
  method: PaymentMethod;
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
}

export const PaymentMethodCard = memo(({ 
  method, 
  icon: Icon, 
  title, 
  description, 
  isSelected, 
  onClick 
}: PaymentMethodCardProps) => (
  <button
    onClick={onClick}
    className={cn(
      "p-2 rounded-lg border-2 transition-all duration-200 hover:shadow-md text-left w-full",
      isSelected 
        ? "border-red-600 bg-red-50 shadow-lg" 
        : "border-gray-200 hover:border-gray-300 bg-white"
    )}
  >
    <div className="flex items-center gap-2">
      <div className={cn(
        "p-2 rounded-lg",
        isSelected ? "bg-red-100" : "bg-gray-100"
      )}>
        <Icon className={cn(
          "h-4 w-4",
          isSelected ? "text-red-600" : "text-gray-600"
        )} />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        <p className="text-xs text-gray-600">{description}</p>
      </div>
      {isSelected && (
        <div className="ml-auto">
          <Check className="h-5 w-5 text-red-600" />
        </div>
      )}
    </div>
  </button>
));

PaymentMethodCard.displayName = 'PaymentMethodCard';
