import { UnifiedComboSelector } from './UnifiedComboSelector';

interface ComboItem {
  type: 'pizza' | 'wings' | 'drink' | 'side';
  quantity: number;
  toppingLimit?: number;
  sauceLimit?: number;
  size?: string;
  itemName?: string;
  availableSizes?: string[];
  defaultSize?: string;
  extraCharge?: number;
}

interface ComboDefinition {
  comboId: string;
  name: string;
  imageUrl?: string;
  items: ComboItem[];
  price: number;
  isEditing?: boolean;
  editingItemId?: string;
  extraCharges?: number;
}

interface ComboSelectorProps {
  open: boolean;
  onClose: () => void;
  combo: ComboDefinition;
  onComplete: (customizedCombo: any) => void;
}

export const ComboSelector = ({ open, onClose, combo, onComplete }: ComboSelectorProps) => {
  return (
    <UnifiedComboSelector
      open={open}
      onClose={onClose}
      combo={combo}
      onComplete={onComplete}
    />
  );
}; 