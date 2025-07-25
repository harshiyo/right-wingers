import React from 'react';
import UnifiedComboSelector from './UnifiedComboSelector';

interface ComboItem {
  type: 'pizza' | 'wings' | 'drink' | 'side';
  stepIndex: number;
  toppingLimit?: number;
  sauceLimit?: number;
  size?: string;
  itemName?: string;
  quantity: number;
  availableSizes?: string[];
  defaultSize?: string;
  isSpecialty?: boolean;
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
  isOpen: boolean;
  onClose: () => void;
  combo: ComboDefinition;
  onSubmit: (customizedCombo: any) => void;
}

export default function ComboSelector({ isOpen, onClose, combo, onSubmit }: ComboSelectorProps) {
  return (
    <UnifiedComboSelector
      isOpen={isOpen}
      onClose={onClose}
      combo={combo}
      onSubmit={onSubmit}
    />
  );
} 