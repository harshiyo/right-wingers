import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/Button';
import { ItemCustomizationDialog } from './ItemCustomizationDialog';

// Types for combo and cart
interface ComboComponent {
  type: 'pizza' | 'wings' | 'side' | 'drink';
  itemId: string;
  itemName: string;
  quantity: number;
  maxToppings?: number;
  maxSauces?: number;
}

interface Combo {
  id: string;
  name: string;
  basePrice: number;
  description?: string;
  components: ComboComponent[];
}

interface CartCombo {
  id: string;
  name: string;
  price: number;
  customizations: any[];
}

interface ComboCustomizationDialogProps {
  open: boolean;
  onClose: () => void;
  combo: Combo | null;
  onAddToCart: (combo: CartCombo) => void;
}

export const ComboCustomizationDialog = ({ open, onClose, combo, onAddToCart }: ComboCustomizationDialogProps) => {
  // Flatten the combo components into a step list (e.g., 2 pizzas = 2 steps)
  // Each step will have type, itemId, itemName, maxToppings, maxSauces, and a clear name
  const steps = combo
    ? combo.components.flatMap((comp, idx) =>
        Array(comp.quantity)
          .fill(null)
          .map((_, i) => ({
            type: comp.type,
            itemId: comp.itemId,
            itemName: comp.itemName,
            maxToppings: comp.maxToppings,
            maxSauces: comp.maxSauces,
            // Give each pizza a unique name, e.g., "Pizza 1", "Pizza 2", etc.
            name:
              comp.type === 'pizza'
                ? `${comp.itemName || 'Pizza'} ${i + 1}`
                : comp.type === 'wings'
                ? `${comp.itemName || 'Wings'}`
                : comp.itemName || comp.type.charAt(0).toUpperCase() + comp.type.slice(1),
          }))
      )
    : [];
  const [currentStep, setCurrentStep] = useState(0);
  const [customizations, setCustomizations] = useState<any[]>([]);
  const [showItemDialog, setShowItemDialog] = useState(false);

  // Start customization when dialog opens
  React.useEffect(() => {
    if (open && combo) {
      setCurrentStep(0);
      setCustomizations([]);
      setShowItemDialog(true);
    }
  }, [open, combo]);

  if (!open || !combo) return null;

  const handleItemCustomized = (item: any) => {
    setCustomizations(prev => [...prev, item]);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setShowItemDialog(true);
    } else {
      // All steps done, add combo to cart
      onAddToCart({
        id: combo.id + '-' + Date.now(),
        name: combo.name,
        price: combo.basePrice, // Optionally sum up customizations
        customizations,
      });
      setShowItemDialog(false);
      onClose();
    }
  };

  // For each step, show the appropriate customization dialog
  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col">
        <div className="flex-shrink-0 flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Customize {combo.name}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200"><X className="h-6 w-6" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-lg font-semibold mb-4">Step {currentStep + 1} of {steps.length}: {step.name}</h3>
          {/* Show the item customization dialog for this step */}
          {showItemDialog && (
            <ItemCustomizationDialog
              open={showItemDialog}
              onClose={() => setShowItemDialog(false)}
              item={{
                id: step.itemId || step.type,
                name: step.name,
                price: 0, // Optionally use a price
                type: step.type,
                maxToppings: step.maxToppings,
                maxSauces: step.maxSauces,
              }}
              onAddToCart={handleItemCustomized}
            />
          )}
        </div>
      </div>
    </div>
  );
}; 