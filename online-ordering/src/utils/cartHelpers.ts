interface Topping {
  id: string;
  name: string;
  price: number;
}

interface ToppingSide {
  wholePizza: Topping[];
  leftSide: Topping[];
  rightSide: Topping[];
}

interface ComboItem {
  id: string;
  name: string;
  quantity: number;
}

interface CartItem {
  id: string;
  uniqueId?: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  toppings?: ToppingSide;
  sauces?: { name: string; price?: number }[];
  extraCharges?: number;
  isHalfAndHalf?: boolean;
  isCombo?: boolean;
  comboItems?: ComboItem[];
  size?: 'small' | 'medium' | 'large';
}

export const generateUniqueId = (item: CartItem) => {
  const customizations = {
    toppings: item.toppings ? JSON.stringify(item.toppings) : '',
    sauces: item.sauces ? JSON.stringify(item.sauces) : '',
    size: item.size || '',
    isHalfAndHalf: item.isHalfAndHalf || false
  };
  return `${item.id}-${JSON.stringify(customizations)}`;
}; 