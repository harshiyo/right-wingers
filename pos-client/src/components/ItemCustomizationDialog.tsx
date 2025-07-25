import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';
import { Input } from './ui/Input';

// --- Interfaces --- //
export interface CartItem {
    id: string; // Unique ID for this specific cart instance
    baseId: string; // ID of the original menu item
    name: string;
    price: number; // Final calculated price
    quantity: number;
    customizations?: {
        size?: string;
        toppings?: Topping[];
        specialOptions?: SpecialOption[];
        sauce?: string;
        selectedSauces?: Sauce[];
    };
    imageUrl?: string;
}

interface CustomizableMenuItem {
  id: string;
  name: string;
  price: number; // Base price for 'Medium' size
  type?: 'pizza' | 'wings' | 'side' | 'drink'; // Add type for customization logic
  maxToppings?: number;
  maxSauces?: number;
}

interface Topping {
  id:string;
  name: string;
  price: number;
  category?: string;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isKeto?: boolean;
}

interface Sauce {
  id: string;
  name: string;
  price: number;
}

interface SizeOption {
  name: string;
  priceModifier: number;
}

interface SpecialOption {
  name: string;
  price: number;
}

interface ItemCustomizationDialogProps {
  open: boolean;
  onClose: () => void;
  item: CustomizableMenuItem | null;
  onAddToCart: (item: CartItem) => void;
}

// --- Hardcoded Data (for now, can be moved to Firestore later) --- //
const SIZES: SizeOption[] = [
  { name: 'Small', priceModifier: -2 },
  { name: 'Medium', priceModifier: 0 },
  { name: 'Large', priceModifier: 2 },
];

const SPECIAL_OPTIONS: SpecialOption[] = [
    { name: 'Light on Sauce', price: 0 },
    { name: 'Light Cheese', price: 0 },
    { name: 'Extra Cheese', price: 2.50 },
    { name: 'Well Done', price: 0 },
];

const BASE_SAUCES = ['Marinara', 'White Garlic', 'Pesto', 'Other'];

// Helper function to determine item type from name or id
const getItemType = (item: CustomizableMenuItem | null): 'pizza' | 'wings' | 'side' | 'drink' => {
  if (!item) return 'pizza'; // Default fallback
  if ('type' in item && item.type) return item.type as any;
  const name = (item.name || '').toLowerCase();
  const itemName = (item as any).itemName ? (item as any).itemName.toLowerCase() : '';
  const id = item.id.toLowerCase();
  if (name.includes('pizza') || itemName.includes('pizza') || id.includes('pizza')) return 'pizza';
  if (name.includes('wing') || itemName.includes('wing') || id.includes('wing')) return 'wings';
  if (name.includes('drink') || itemName.includes('drink') || name.includes('soda') || name.includes('pop')) return 'drink';
  return 'side';
};

export const ItemCustomizationDialog = ({ open, onClose, item, onAddToCart }: ItemCustomizationDialogProps) => {
  // Early return if dialog is not open or item is null
  if (!open || !item) {
    return null;
  }

  // --- Data Fetching --- //
  const [toppingsSnapshot, loadingToppings] = useCollection(
    query(collection(db, 'toppings'), orderBy('name'))
  );
  const [saucesSnapshot, loadingSauces] = useCollection(
    query(collection(db, 'sauces'), orderBy('name'))
  );
  
  const toppings = toppingsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topping)) || [];
  const sauces = saucesSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sauce)) || [];

  // --- Determine item type --- //
  console.log('item.type in dialog:', item.type);
  const itemType = getItemType(item);
  // If wings and maxSauces is undefined, default to 1
  const maxSauces = itemType === 'wings' ? (item?.maxSauces ?? 1) : item?.maxSauces;
  console.log('ItemCustomizationDialog itemType:', itemType, 'item:', item);

  // --- State Management --- //
  const [selectedSize, setSelectedSize] = useState<SizeOption>(SIZES[1]);
  const [selectedToppings, setSelectedToppings] = useState<Map<string, Topping>>(new Map());
  const [selectedSauces, setSelectedSauces] = useState<Map<string, Sauce>>(new Map());
  const [selectedSpecialOptions, setSelectedSpecialOptions] = useState<Map<string, SpecialOption>>(new Map());
  const [baseSauce, setBaseSauce] = useState<string>(BASE_SAUCES[0]);
  const [otherSauceText, setOtherSauceText] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeDietaryFilter, setActiveDietaryFilter] = useState<string>('All');

  // --- Reset state when dialog opens --- //
  useEffect(() => {
    if (item) {
      setSelectedSize(SIZES[1]);
      setSelectedToppings(new Map());
      setSelectedSauces(new Map());
      setSelectedSpecialOptions(new Map());
      setBaseSauce(BASE_SAUCES[0]);
      setOtherSauceText('');
    }
  }, [item]);

  // --- Price Calculation --- //
  // --- Filtering Logic --- //
  const categories = ['All', ...Array.from(new Set(toppings.map(t => t.category).filter((cat): cat is string => Boolean(cat))))];
  const dietaryFilters = ['All', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Keto'];

  const filteredToppings = toppings.filter(topping => {
    const categoryMatch = activeCategory === 'All' || topping.category === activeCategory;
    
    let dietaryMatch = true;
    if (activeDietaryFilter === 'Vegetarian') {
      dietaryMatch = topping.isVegetarian === true;
    } else if (activeDietaryFilter === 'Vegan') {
      dietaryMatch = topping.isVegan === true;
    } else if (activeDietaryFilter === 'Gluten-Free') {
      dietaryMatch = topping.isGlutenFree === true;
    } else if (activeDietaryFilter === 'Keto') {
      dietaryMatch = topping.isKeto === true;
    }
    
    return categoryMatch && dietaryMatch;
  });

  const totalPrice = useMemo(() => {
    if (!item) return 0;
    const basePrice = item.price + (itemType === 'pizza' ? selectedSize.priceModifier : 0);
    const toppingsPrice = Array.from(selectedToppings.values()).reduce((sum, topping) => sum + (topping.price || 0), 0);
    const saucesPrice = Array.from(selectedSauces.values()).reduce((sum, sauce) => sum + (sauce.price || 0), 0);
    const specialOptionsPrice = Array.from(selectedSpecialOptions.values()).reduce((sum, option) => sum + (option.price || 0), 0);
    return basePrice + toppingsPrice + saucesPrice + specialOptionsPrice;
  }, [item, itemType, selectedSize, selectedToppings, selectedSauces, selectedSpecialOptions]);

  // --- Event Handlers --- //
  const handleToppingToggle = (topping: Topping) => {
    if (itemType === 'pizza' && item?.maxToppings && !selectedToppings.has(topping.id) && selectedToppings.size >= item.maxToppings) {
      // Prevent selecting more than allowed
      return;
    }
    setSelectedToppings(prev => {
      const newMap = new Map(prev);
      if (newMap.has(topping.id)) { newMap.delete(topping.id); } 
      else { newMap.set(topping.id, topping); }
      return newMap;
    });
  };

  const handleSauceToggle = (sauce: Sauce) => {
    if (itemType === 'wings' && item?.maxSauces && !selectedSauces.has(sauce.id) && selectedSauces.size >= item.maxSauces) {
      // Prevent selecting more than allowed
      return;
    }
    setSelectedSauces(prev => {
      const newMap = new Map(prev);
      if (newMap.has(sauce.id)) { newMap.delete(sauce.id); } 
      else { newMap.set(sauce.id, sauce); }
      return newMap;
    });
  };

  const handleSpecialOptionToggle = (option: SpecialOption) => {
    setSelectedSpecialOptions(prev => {
        const newMap = new Map(prev);
        if (newMap.has(option.name)) { newMap.delete(option.name); }
        else { newMap.set(option.name, option); }
        return newMap;
    });
  };

  const handleAddToOrder = () => {
    if (!item) return;

    const finalSauce = baseSauce === 'Other' ? otherSauceText : baseSauce;

    const customizedItem: CartItem = {
      id: `${item.id}-${Date.now()}`, // Simple unique ID
      baseId: item.id,
      name: item.name,
      price: totalPrice,
      quantity: 1,
      customizations: {
        ...(itemType === 'pizza' && { size: selectedSize.name }),
        ...(selectedToppings.size > 0 && { toppings: Array.from(selectedToppings.values()) }),
        ...(selectedSauces.size > 0 && { selectedSauces: Array.from(selectedSauces.values()) }),
        ...(selectedSpecialOptions.size > 0 && { specialOptions: Array.from(selectedSpecialOptions.values()) }),
        ...(itemType === 'pizza' && { sauce: finalSauce }),
      },
    };

    onAddToCart(customizedItem);
    onClose(); // Close the dialog after adding
  };

  // --- Render --- //
  console.log('RENDER: itemType', itemType, 'item', item);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl flex flex-col max-h-[95vh]">
        <div className="flex-shrink-0 flex justify-between items-center p-6 border-b">
          <h2 className="text-3xl font-bold text-gray-800">Customize {item?.name}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200"><X className="h-6 w-6" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Pizza-specific sections */}
          {itemType === 'pizza' && (
            <>
              {/* 1. Size Selection */}
              <section>
                <h3 className="text-3xl font-bold mb-6 text-gray-800">1. Select Size</h3>
                <div className="grid grid-cols-3 gap-4">
                  {SIZES.map(size => (
                    <button key={size.name} onClick={() => setSelectedSize(size)} className={cn("p-4 rounded-lg border-2 text-center transition-all duration-200", selectedSize.name === size.name ? "bg-[#800000] text-white border-[#800000] shadow-lg" : "bg-gray-50 hover:border-gray-400")}>
                      <p className="text-lg font-bold">{size.name}</p>
                      <p className="text-sm">${(item.price + size.priceModifier).toFixed(2)}</p>
                    </button>
                  ))}
                </div>
              </section>

              {/* 2. Choose Toppings */}
              <section>
                <h3 className="text-3xl font-bold mb-6 text-gray-800">2. Choose Toppings{item?.maxToppings ? ` (Max ${item.maxToppings})` : ''}</h3>
                
                {/* Category Tabs */}
                <div className="mb-6">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {categories.map(category => (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={cn(
                          "px-4 py-2 rounded-lg font-medium transition-all duration-200",
                          activeCategory === category
                            ? "bg-red-800 text-white shadow-md"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                  
                  {/* Dietary Filters */}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm font-medium text-gray-600 py-2">Dietary:</span>
                    {dietaryFilters.map(filter => (
                      <button
                        key={filter}
                        onClick={() => setActiveDietaryFilter(filter)}
                        className={cn(
                          "px-3 py-1 rounded-full text-sm font-medium transition-all duration-200",
                          activeDietaryFilter === filter
                            ? "bg-green-600 text-white shadow-md"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        )}
                      >
                        {filter === 'Vegetarian' && '🌱 '}
                        {filter === 'Vegan' && '🌿 '}
                        {filter === 'Gluten-Free' && '🌾 '}
                        {filter === 'Keto' && '🥩 '}
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                {loadingToppings ? (
                  <p>Loading toppings...</p>
                ) : filteredToppings.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-lg text-gray-500">No toppings found for the selected filters.</p>
                    <p className="text-sm text-gray-400 mt-2">Try selecting "All" or different dietary options.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {filteredToppings.map(topping => (
                      <label key={topping.id} className={cn("flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 text-center min-h-[80px]", selectedToppings.has(topping.id) ? "bg-green-100 border-green-500" : "bg-gray-50 hover:border-gray-400", itemType === 'pizza' && !!item?.maxToppings && !selectedToppings.has(topping.id) && selectedToppings.size >= (item.maxToppings || 0) ? 'opacity-50 cursor-not-allowed' : '')}>
                        <input type="checkbox" checked={selectedToppings.has(topping.id)} onChange={() => handleToppingToggle(topping)} className="h-4 w-4 rounded text-green-600 focus:ring-green-500 mb-2" disabled={itemType === 'pizza' && !!item?.maxToppings && !selectedToppings.has(topping.id) && selectedToppings.size >= (item.maxToppings || 0)}/>
                        <div className="flex-1 min-w-0 w-full">
                          <div className="font-medium text-gray-800 text-sm leading-tight mb-1">{topping.name}</div>
                          <div className="flex justify-center gap-1 mb-1">
                            {topping.isVegetarian && <span className="text-xs">🌱</span>}
                            {topping.isVegan && <span className="text-xs">🌿</span>}
                            {topping.isGlutenFree && <span className="text-xs">🌾</span>}
                            {topping.isKeto && <span className="text-xs">🥩</span>}
                          </div>
                          {topping.price > 0 && <span className="text-xs text-gray-600 font-medium">+${topping.price.toFixed(2)}</span>}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {itemType === 'pizza' && item?.maxToppings && selectedToppings.size >= item.maxToppings && (
                  <p className="text-sm text-red-600 mt-2">Maximum {item.maxToppings} toppings allowed.</p>
                )}
              </section>

              {/* 3. Special Options */}
              <section>
                <h3 className="text-3xl font-bold mb-6 text-gray-800">3. Special Options</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {SPECIAL_OPTIONS.map(option => (
                        <label key={option.name} className={cn("flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200", selectedSpecialOptions.has(option.name) ? "bg-green-100 border-green-500" : "bg-gray-50 hover:border-gray-400")}>
                            <input type="checkbox" checked={selectedSpecialOptions.has(option.name)} onChange={() => handleSpecialOptionToggle(option)} className="h-5 w-5 rounded text-green-600 focus:ring-green-500"/>
                            <span className="ml-3 flex-1 font-medium text-gray-800">{option.name}</span>
                            {option.price > 0 && (<span className="text-sm text-gray-600">+${option.price.toFixed(2)}</span>)}
                        </label>
                    ))}
                </div>
              </section>
              
              {/* 4. Base Sauce */}
              <section>
                <h3 className="text-3xl font-bold mb-6 text-gray-800">4. Base Sauce</h3>
                <div className="flex flex-wrap gap-4">
                    {BASE_SAUCES.map(sauce => (
                        <label key={sauce} className="flex items-center cursor-pointer">
                            <input type="radio" name="baseSauce" value={sauce} checked={baseSauce === sauce} onChange={(e) => setBaseSauce(e.target.value)} className="h-5 w-5 text-red-800 focus:ring-red-700"/>
                            <span className="ml-2 font-medium text-gray-800">{sauce}</span>
                        </label>
                    ))}
                </div>
                {baseSauce === 'Other' && (
                    <div className="mt-4">
                        <Input 
                            type="text" 
                            value={otherSauceText}
                            onChange={(e) => setOtherSauceText(e.target.value)}
                            placeholder="Please specify other sauce"
                            className="w-full md:w-1/2"
                        />
                    </div>
                )}
              </section>
            </>
          )}

          {/* Wings-specific sections (fallback: also render if item?.type === 'wings') */}
          {(itemType === 'wings' || item?.type === 'wings') && (
            <section>
              <h3 className="text-3xl font-bold mb-6 text-gray-800">Choose Sauces{maxSauces ? ` (Max ${maxSauces})` : ''}</h3>
              {loadingSauces ? <p>Loading sauces...</p> : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {sauces.map(sauce => (
                    <label key={sauce.id} className={cn("flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200", selectedSauces.has(sauce.id) ? "bg-green-100 border-green-500" : "bg-gray-50 hover:border-gray-400", (itemType === 'wings' || item?.type === 'wings') && !!maxSauces && !selectedSauces.has(sauce.id) && selectedSauces.size >= maxSauces ? 'opacity-50 cursor-not-allowed' : '')}>
                      <input type="checkbox" checked={selectedSauces.has(sauce.id)} onChange={() => handleSauceToggle(sauce)} className="h-5 w-5 rounded text-green-600 focus:ring-green-500" disabled={(itemType === 'wings' || item?.type === 'wings') && !!maxSauces && !selectedSauces.has(sauce.id) && selectedSauces.size >= maxSauces}/>
                      <span className="ml-3 flex-1 font-medium text-gray-800">{sauce.name}</span>
                      {sauce.price > 0 && (<span className="text-sm text-gray-600">+${sauce.price.toFixed(2)}</span>)}
                    </label>
                  ))}
                </div>
              )}
              {(itemType === 'wings' || item?.type === 'wings') && maxSauces && selectedSauces.size >= maxSauces && (
                <p className="text-sm text-red-600 mt-2">Maximum {maxSauces} sauces allowed.</p>
              )}
            </section>
          )}

          {/* Side and Drink items - no customization needed */}
          {(itemType === 'side' || itemType === 'drink') && (
            <section>
              <div className="text-center py-8">
                <p className="text-lg text-gray-600">No customization needed for this item.</p>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 mt-auto p-8 border-t-2 bg-gradient-to-br from-gray-50 to-gray-100 rounded-b-lg">
            <div className="flex justify-between items-center">
                <p className="text-3xl font-bold">Total: <span className="text-red-800">${totalPrice.toFixed(2)}</span></p>
                <Button 
                  size="lg" 
                  className="px-10 py-4 h-auto text-xl font-bold bg-gradient-to-r from-red-800 to-red-900 hover:from-red-900 hover:to-red-950 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105" 
                  onClick={handleAddToOrder}
                >
                  Add to Order
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};