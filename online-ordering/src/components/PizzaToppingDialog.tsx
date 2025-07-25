import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '../utils/cn';

// Import SVG icons
import fullPizza from '../assets/full-pizza.svg';
import leftHalfPizza from '../assets/left-half-pizza.svg';
import rightHalfPizza from '../assets/right-half-pizza.svg';

interface Topping {
  id: string;
  name: string;
  price: number;
  category?: string;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isKeto?: boolean;
}

interface ToppingSide {
  wholePizza: Topping[];
  leftSide: Topping[];
  rightSide: Topping[];
}

interface PizzaToppingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (result: { toppings: ToppingSide; extraCharge: number; isHalfAndHalf: boolean }) => void;
  pizzaName: string;
  toppingLimit: number;
  sharedToppingInfo?: {
    totalLimit: number;
    usedToppings: number;
    remainingToppings: number;
    pizzaNumber: number;
    totalPizzas: number;
  };
  existingSelections?: any;
  contentOnly?: boolean;
}

export default function PizzaToppingDialog({ 
  isOpen, 
  onClose, 
  onSubmit, 
  pizzaName, 
  toppingLimit,
  sharedToppingInfo,
  existingSelections,
  contentOnly = false
}: PizzaToppingDialogProps) {
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSelection, setActiveSelection] = useState<'whole' | 'left' | 'right'>('whole');
  const [selectedToppings, setSelectedToppings] = useState<{
    wholePizza: Map<string, Topping>;
    leftSide: Map<string, Topping>;
    rightSide: Map<string, Topping>;
  }>({
    wholePizza: new Map(),
    leftSide: new Map(),
    rightSide: new Map()
  });
  const [activeCategory, setActiveCategory] = useState<string>('All');

  useEffect(() => {
    const fetchToppings = async () => {
      try {
        const toppingsQuery = query(collection(db, 'toppings'), orderBy('name'));
        const snapshot = await getDocs(toppingsQuery);
        const toppingsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Topping));
        setToppings(toppingsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching toppings:', error);
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchToppings();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (existingSelections?.toppings) {
        const { wholePizza = [], leftSide = [], rightSide = [] } = existingSelections.toppings;
        setSelectedToppings({
          wholePizza: new Map(wholePizza.map((t: Topping) => [t.id, t])),
          leftSide: new Map(leftSide.map((t: Topping) => [t.id, t])),
          rightSide: new Map(rightSide.map((t: Topping) => [t.id, t]))
        });
        setActiveSelection(leftSide.length > 0 || rightSide.length > 0 ? 'left' : 'whole');
      } else {
        setSelectedToppings({
          wholePizza: new Map(),
          leftSide: new Map(),
          rightSide: new Map()
        });
        setActiveSelection('whole');
      }
      setActiveCategory('All');
    }
  }, [isOpen, existingSelections]);

  // Add effect for handling side changes
  useEffect(() => {
    // When switching sides, preserve all selections but only show active side
    setSelectedToppings(prev => {
      return {
        // Keep all selections in state
        wholePizza: prev.wholePizza,
        leftSide: prev.leftSide,
        rightSide: prev.rightSide
      };
    });
  }, [activeSelection]);

  // Helper function to get visible toppings based on active selection
  const getVisibleToppings = (toppingId: string) => {
    if (activeSelection === 'whole') {
      return selectedToppings.wholePizza.has(toppingId);
    } else if (activeSelection === 'left') {
      return selectedToppings.leftSide.has(toppingId);
    } else {
      return selectedToppings.rightSide.has(toppingId);
    }
  };

  const handleToppingToggle = (topping: Topping) => {
    setSelectedToppings(prev => {
      const newSelections = { ...prev };
      
      if (activeSelection === 'whole') {
        const wholeMap = new Map(newSelections.wholePizza);
        if (wholeMap.has(topping.id)) {
          wholeMap.delete(topping.id);
        } else {
          // When adding to whole pizza, remove from both sides if present
          const leftMap = new Map(newSelections.leftSide);
          const rightMap = new Map(newSelections.rightSide);
          leftMap.delete(topping.id);
          rightMap.delete(topping.id);
          newSelections.leftSide = leftMap;
          newSelections.rightSide = rightMap;
          
          // Allow adding regardless of limit (will be charged as extra)
          wholeMap.set(topping.id, topping);
        }
        newSelections.wholePizza = wholeMap;
      } else if (activeSelection === 'left') {
        const leftMap = new Map(newSelections.leftSide);
        if (leftMap.has(topping.id)) {
          leftMap.delete(topping.id);
        } else {
          // Remove from whole pizza if present
          const wholeMap = new Map(newSelections.wholePizza);
          if (wholeMap.has(topping.id)) {
            wholeMap.delete(topping.id);
            newSelections.wholePizza = wholeMap;
          }

          // Allow adding regardless of limit (will be charged as extra)
          leftMap.set(topping.id, topping);
          
          // Smart conversion: if this topping is now on both sides, convert to whole pizza
          if (newSelections.rightSide.has(topping.id)) {
            // Remove from both sides
            leftMap.delete(topping.id);
            const rightMap = new Map(newSelections.rightSide);
            rightMap.delete(topping.id);
            newSelections.rightSide = rightMap;
            
            // Add to whole pizza
            const wholeMap = new Map(newSelections.wholePizza);
            wholeMap.set(topping.id, topping);
            newSelections.wholePizza = wholeMap;
          }
        }
        newSelections.leftSide = leftMap;
      } else if (activeSelection === 'right') {
        const rightMap = new Map(newSelections.rightSide);
        if (rightMap.has(topping.id)) {
          rightMap.delete(topping.id);
        } else {
          // Remove from whole pizza if present
          const wholeMap = new Map(newSelections.wholePizza);
          if (wholeMap.has(topping.id)) {
            wholeMap.delete(topping.id);
            newSelections.wholePizza = wholeMap;
          }

          // Allow adding regardless of limit (will be charged as extra)
          rightMap.set(topping.id, topping);
          
          // Smart conversion: if this topping is now on both sides, convert to whole pizza
          if (newSelections.leftSide.has(topping.id)) {
            // Remove from both sides
            rightMap.delete(topping.id);
            const leftMap = new Map(newSelections.leftSide);
            leftMap.delete(topping.id);
            newSelections.leftSide = leftMap;
            
            // Add to whole pizza
            const wholeMap = new Map(newSelections.wholePizza);
            wholeMap.set(topping.id, topping);
            newSelections.wholePizza = wholeMap;
          }
        }
        newSelections.rightSide = rightMap;
      }
      
      return newSelections;
    });
  };

  const getTotalSelectedCount = () => {
    const wholePizzaCount = selectedToppings.wholePizza.size;
    const halfSideCount = selectedToppings.leftSide.size + selectedToppings.rightSide.size;
    const halfSideEquivalents = Math.ceil(halfSideCount / 2);
    return wholePizzaCount + halfSideEquivalents;
  };

  const getExtraCharge = () => {
    const totalCount = getTotalSelectedCount();
    const extraToppings = Math.max(0, totalCount - toppingLimit);
    return extraToppings * 1.5; // $1.50 per extra topping
  };

  const handleSubmit = () => {
    const result = {
      toppings: {
        wholePizza: Array.from(selectedToppings.wholePizza.values()),
        leftSide: Array.from(selectedToppings.leftSide.values()),
        rightSide: Array.from(selectedToppings.rightSide.values())
      },
      extraCharge: getExtraCharge(),
      isHalfAndHalf: selectedToppings.leftSide.size > 0 || selectedToppings.rightSide.size > 0
    };
    onSubmit(result);
  };

  if (!isOpen) return null;

  const filteredToppings = toppings.filter(topping => {
    if (activeCategory !== 'All' && topping.category !== activeCategory) return false;
    return true;
  });

  const categories = ['All', ...new Set(toppings.map(t => t.category || '').filter(cat => cat !== ''))];

  const content = (
    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[95vh] flex flex-col">
      {!contentOnly && (
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold">Customize {pizzaName}</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {sharedToppingInfo && sharedToppingInfo.totalPizzas > 1 && (
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg text-sm">
              <p className="text-blue-800">
                <span className="font-semibold">Shared Topping Pool:</span> {sharedToppingInfo.totalLimit} for {sharedToppingInfo.totalPizzas} pizzas •
                <span className="font-medium"> Used:</span> {sharedToppingInfo.usedToppings} •
                <span className="font-medium"> Left:</span> {sharedToppingInfo.remainingToppings} •
                <span className="font-medium"> Pizza:</span> {sharedToppingInfo.pizzaNumber}/{sharedToppingInfo.totalPizzas}
              </p>
            </div>
          )}

          <div className="flex justify-center gap-2">
            <button
              onClick={() => setActiveSelection('whole')}
              className={cn(
                "p-2 rounded-lg border-2 transition-all duration-200",
                activeSelection === 'whole'
                  ? "bg-blue-100 border-blue-500 shadow-sm"
                  : "bg-white hover:bg-gray-50 border-gray-200"
              )}
            >
              <img src={fullPizza} alt="Full Pizza" className="w-12 h-12" />
              <span className="block mt-1 text-xs font-medium">Whole</span>
            </button>
            <button
              onClick={() => setActiveSelection('left')}
              className={cn(
                "p-2 rounded-lg border-2 transition-all duration-200",
                activeSelection === 'left'
                  ? "bg-blue-100 border-blue-500 shadow-sm"
                  : "bg-white hover:bg-gray-50 border-gray-200"
              )}
            >
              <img src={leftHalfPizza} alt="Left Half" className="w-12 h-12" />
              <span className="block mt-1 text-xs font-medium">Left</span>
            </button>
            <button
              onClick={() => setActiveSelection('right')}
              className={cn(
                "p-2 rounded-lg border-2 transition-all duration-200",
                activeSelection === 'right'
                  ? "bg-blue-100 border-blue-500 shadow-sm"
                  : "bg-white hover:bg-gray-50 border-gray-200"
              )}
            >
              <img src={rightHalfPizza} alt="Right Half" className="w-12 h-12" />
              <span className="block mt-1 text-xs font-medium">Right</span>
            </button>
          </div>

          <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg text-sm">
            <p className="text-green-800 font-medium">
              {toppingLimit} included • {getTotalSelectedCount()} selected
              {getExtraCharge() > 0 && (
                <span className="text-orange-600 font-bold"> • Extra (+${getExtraCharge().toFixed(2)})</span>
              )}
            </p>
          </div>

          {/* Category Selection */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            <button
              onClick={() => setActiveCategory('All')}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm whitespace-nowrap",
                activeCategory === 'All'
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-800"
              )}
            >
              All
            </button>
            <button
              onClick={() => setActiveCategory('Meats')}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm whitespace-nowrap",
                activeCategory === 'Meats'
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-800"
              )}
            >
              Meats
            </button>
            <button
              onClick={() => setActiveCategory('Vegetables')}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm whitespace-nowrap",
                activeCategory === 'Vegetables'
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-800"
              )}
            >
              Vegetables
            </button>
          </div>

          {/* Toppings Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {loading ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                Loading toppings...
              </div>
            ) : (
              toppings
                .filter(topping => 
                  activeCategory === 'All' || 
                  (activeCategory === 'Meats' && !topping.isVegetarian) ||
                  (activeCategory === 'Vegetables' && topping.isVegetarian)
                )
                .map(topping => {
                  const isSelected = getVisibleToppings(topping.id);
                  return (
                    <button
                      key={topping.id}
                      onClick={() => handleToppingToggle(topping)}
                      className={cn(
                        "p-2 rounded-lg border text-left transition-all duration-200 flex flex-col justify-between min-h-[72px]",
                        isSelected
                          ? "bg-green-100 border-green-500 shadow-sm"
                          : "bg-white hover:bg-gray-50 border-gray-200"
                      )}
                    >
                      <span className="font-medium text-sm">{topping.name}</span>
                      <span className="text-xs text-gray-600">
                        {topping.price > 0 && `+$${topping.price.toFixed(2)}`}
                      </span>
                    </button>
                  );
                })
            )}
          </div>
        </div>

        <div className="p-3 border-t bg-gray-50 flex justify-between items-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
          >
            {getExtraCharge() > 0 
              ? `Add Toppings (+$${getExtraCharge().toFixed(2)})` 
              : 'Add Toppings'
            }
          </button>
        </div>
      </div>
    );

  if (contentOnly) {
    return content;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
      {content}
    </div>
  );
} 