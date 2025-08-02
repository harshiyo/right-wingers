import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { X, ChevronLeft, ChevronRight, Check, Star, Zap, Leaf, Flame } from 'lucide-react';
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
  onSubmit: (result: { toppings: ToppingSide; extraCharge: number; isHalfAndHalf: boolean; type: string; size?: string }) => void;
  pizzaName: string;
  pizzaItem?: any; // The full pizza menu item with pricing data
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
  pizzaItem,
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
    // Calculate total equivalent toppings
    const wholePizzaCount = selectedToppings.wholePizza.size;
    const halfSideCount = selectedToppings.leftSide.size + selectedToppings.rightSide.size;
    const halfSideEquivalents = Math.ceil(halfSideCount / 2);
    const totalEquivalents = wholePizzaCount + halfSideEquivalents;
    
    // If we're within the limit, no extra charge
    if (totalEquivalents <= toppingLimit) {
      return 0;
    }
    
    // Calculate how many equivalents are extra
    const extraEquivalents = totalEquivalents - toppingLimit;
    
    // Check if this pizza uses flat rate pricing
    if (pizzaItem?.pricingMode === 'flat' && pizzaItem?.flatRatePrice) {
      const flatRate = pizzaItem.flatRatePrice;
      const halfMultiplier = pizzaItem.halfPizzaMultiplier || 0.5;
      
      // For flat rate, we charge the cheapest extra toppings first
      // Half-side toppings are cheaper (flatRate * halfMultiplier) than whole pizza toppings (flatRate)
      let extraCharge = 0;
      let remainingExtras = extraEquivalents;
      
      // Count actual individual toppings (not equivalents)
      const actualHalfSideToppings = halfSideCount;
      const actualWholePizzaToppings = wholePizzaCount;
      
      // Strategy: Use included toppings optimally, then charge for extras starting with cheapest
      // If we have half-side toppings and they go over the limit, charge them first (cheaper)
      if (actualHalfSideToppings > 0 && remainingExtras > 0) {
        // Calculate how many half-side toppings should be charged
        // Each 2 half-side toppings = 1 equivalent, but we charge per individual topping
        const halfSideEquivalentsUsed = Math.min(halfSideEquivalents, Math.max(0, toppingLimit - wholePizzaCount));
        const halfSideIncluded = halfSideEquivalentsUsed * 2; // Convert back to individual toppings
        const halfSideExtras = Math.max(0, actualHalfSideToppings - halfSideIncluded);
        
        if (halfSideExtras > 0) {
          const halfSideExtrasToCharge = Math.min(halfSideExtras, remainingExtras * 2);
          extraCharge += halfSideExtrasToCharge * flatRate * halfMultiplier;
          remainingExtras -= Math.ceil(halfSideExtrasToCharge / 2); // Convert back to equivalents
        }
      }
      
      // Then charge any remaining extras as whole pizza toppings (more expensive)
      if (remainingExtras > 0) {
        const wholePizzaIncluded = Math.min(wholePizzaCount, Math.max(0, toppingLimit - halfSideEquivalents));
        const wholePizzaExtras = Math.max(0, wholePizzaCount - wholePizzaIncluded);
        
        if (wholePizzaExtras > 0) {
          const wholePizzaExtrasToCharge = Math.min(wholePizzaExtras, remainingExtras);
          extraCharge += wholePizzaExtrasToCharge * flatRate;
        }
      }
      
      return extraCharge;
    }
    
    // Individual topping pricing logic - FIXED VERSION
    let extraCharge = 0;
    
    // Calculate how many toppings are included vs extra
    const totalIncluded = Math.min(totalEquivalents, toppingLimit);
    const totalExtra = totalEquivalents - totalIncluded;
    
    if (totalExtra <= 0) {
      return 0;
    }
    
    // For individual pricing, we need to charge the actual topping prices
    // Half-side toppings should be charged at half price
    let remainingExtraEquivalents = totalExtra;
    
    // First, charge for extra whole pizza toppings (full price)
    const wholePizzaIncluded = Math.min(wholePizzaCount, totalIncluded);
    const wholePizzaExtra = wholePizzaCount - wholePizzaIncluded;
    
    if (wholePizzaExtra > 0 && remainingExtraEquivalents > 0) {
      const wholePizzaToppings = Array.from(selectedToppings.wholePizza.values());
      const toppingsToCharge = Math.min(wholePizzaExtra, remainingExtraEquivalents);
      
      // Charge the most recently added whole pizza toppings as extra
      const extraWholeToppings = wholePizzaToppings.slice(-toppingsToCharge);
      extraCharge += extraWholeToppings.reduce((sum, topping) => sum + (topping.price || 0), 0);
      remainingExtraEquivalents -= toppingsToCharge;
    }
    
    // Then, charge for extra half-side toppings (half price)
    if (remainingExtraEquivalents > 0) {
      const halfSideIncludedEquivalents = Math.min(halfSideEquivalents, totalIncluded - wholePizzaIncluded);
      const halfSideIncludedToppings = halfSideIncludedEquivalents * 2;
      const halfSideExtraToppings = halfSideCount - halfSideIncludedToppings;
      
      if (halfSideExtraToppings > 0) {
        const leftSideToppings = Array.from(selectedToppings.leftSide.values());
        const rightSideToppings = Array.from(selectedToppings.rightSide.values());
        
        // Calculate how many half-side toppings to charge as extra
        const halfSideEquivalentsToCharge = Math.min(remainingExtraEquivalents, halfSideEquivalents - halfSideIncludedEquivalents);
        const halfSideToppingsToCharge = halfSideEquivalentsToCharge * 2;
        
        // Distribute extra charges between left and right proportionally
        const leftSideExtra = Math.min(leftSideToppings.length, Math.ceil(halfSideToppingsToCharge * (leftSideToppings.length / halfSideCount)));
        const rightSideExtra = Math.min(rightSideToppings.length, halfSideToppingsToCharge - leftSideExtra);
        
        // Charge left side extras at half price
        if (leftSideExtra > 0) {
          const leftSideExtraToppings = leftSideToppings.slice(-leftSideExtra);
          extraCharge += leftSideExtraToppings.reduce((sum, topping) => sum + ((topping.price || 0) / 2), 0);
        }
        
        // Charge right side extras at half price
        if (rightSideExtra > 0) {
          const rightSideExtraToppings = rightSideToppings.slice(-rightSideExtra);
          extraCharge += rightSideExtraToppings.reduce((sum, topping) => sum + ((topping.price || 0) / 2), 0);
        }
      }
    }
    
    return extraCharge;
  };

  // Helper function to get exact list of extra toppings - matches POS client logic
  const getExtraToppings = () => {
    const wholePizzaCount = selectedToppings.wholePizza.size;
    const halfSideCount = selectedToppings.leftSide.size + selectedToppings.rightSide.size;
    const halfSideEquivalents = Math.ceil(halfSideCount / 2);
    const totalEquivalents = wholePizzaCount + halfSideEquivalents;
    
    if (totalEquivalents <= toppingLimit) {
      return new Set(); // No extras
    }
    
    const extraToppings = new Set();
    
    // When over limit, prioritize marking half-side toppings as extra (they're cheaper)
    // This matches the pricing calculation logic
    
    // Step 1: Calculate how many half-side toppings can be included
    const maxHalfSideEquivalents = Math.max(0, toppingLimit - wholePizzaCount);
    const halfSideIncluded = Math.min(halfSideEquivalents, maxHalfSideEquivalents);
    const actualHalfSideIncluded = halfSideIncluded * 2; // Convert back to individual toppings
    
    // Step 2: Mark extra half-side toppings
    if (halfSideCount > actualHalfSideIncluded) {
      const leftToppings = Array.from(selectedToppings.leftSide.values());
      const rightToppings = Array.from(selectedToppings.rightSide.values());
      
      const halfSideExtras = halfSideCount - actualHalfSideIncluded;
      let extrasMarked = 0;
      
      // Calculate how many extras to mark from each side
      const leftSideExtras = Math.min(leftToppings.length, Math.ceil(halfSideExtras / 2));
      const rightSideExtras = Math.min(rightToppings.length, halfSideExtras - leftSideExtras);
      
      // Mark extras from left side
      for (let i = Math.max(0, leftToppings.length - leftSideExtras); i < leftToppings.length && extrasMarked < halfSideExtras; i++) {
        extraToppings.add(leftToppings[i].id);
        extrasMarked++;
      }
      
      // Mark extras from right side
      for (let i = Math.max(0, rightToppings.length - rightSideExtras); i < rightToppings.length && extrasMarked < halfSideExtras; i++) {
        extraToppings.add(rightToppings[i].id);
        extrasMarked++;
      }
    }
    
    // Step 3: Only mark whole pizza toppings as extra if they alone exceed the limit
    // (Don't penalize whole pizza toppings for half-side selections)
    if (wholePizzaCount > toppingLimit) {
      const wholeToppings = Array.from(selectedToppings.wholePizza.values());
      const wholePizzaExtras = wholePizzaCount - toppingLimit;
      
      // Mark the last selected whole pizza toppings as extra
      for (let i = wholeToppings.length - wholePizzaExtras; i < wholeToppings.length; i++) {
        extraToppings.add(wholeToppings[i].id);
      }
    }
    
    return extraToppings;
  };

  const handleSubmit = () => {
    const result = {
      toppings: {
        wholePizza: Array.from(selectedToppings.wholePizza.values()),
        leftSide: Array.from(selectedToppings.leftSide.values()),
        rightSide: Array.from(selectedToppings.rightSide.values())
      },
      extraCharge: getExtraCharge(),
      isHalfAndHalf: selectedToppings.leftSide.size > 0 || selectedToppings.rightSide.size > 0,
      type: 'pizza'
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
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
      {/* Header */}
      {!contentOnly && (
        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-red-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Customize {pizzaName}</h2>
              <p className="text-sm text-gray-600">Choose your perfect toppings</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <div className="p-4 space-y-4 h-full flex flex-col">
          {/* Shared Topping Info - Compact */}
          {sharedToppingInfo && sharedToppingInfo.totalPizzas > 1 && (
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-blue-800">Shared Pool: {sharedToppingInfo.totalLimit} toppings</span>
                <span className="text-blue-600">Used: {sharedToppingInfo.usedToppings} | Left: {sharedToppingInfo.remainingToppings}</span>
              </div>
            </div>
          )}

          {/* Pizza Selection and Categories - Same Row */}
          <div className="flex gap-4 items-start">
            {/* Pizza Selection */}
            <div className="flex-1 bg-gray-50 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-gray-700 mb-2">Pizza Area</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveSelection('whole')}
                  className={cn(
                    "flex flex-col items-center p-2 rounded-lg border-2 transition-all duration-200 min-w-[60px]",
                    activeSelection === 'whole'
                      ? "bg-red-100 border-red-500 shadow-sm"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  )}
                >
                  <img src={fullPizza} alt="Full Pizza" className="w-8 h-8" />
                  <span className="block mt-1 text-xs font-medium">Whole</span>
                </button>
                <button
                  onClick={() => setActiveSelection('left')}
                  className={cn(
                    "flex flex-col items-center p-2 rounded-lg border-2 transition-all duration-200 min-w-[60px]",
                    activeSelection === 'left'
                      ? "bg-red-100 border-red-500 shadow-sm"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  )}
                >
                  <img src={leftHalfPizza} alt="Left Half" className="w-8 h-8" />
                  <span className="block mt-1 text-xs font-medium">Left</span>
                </button>
                <button
                  onClick={() => setActiveSelection('right')}
                  className={cn(
                    "flex flex-col items-center p-2 rounded-lg border-2 transition-all duration-200 min-w-[60px]",
                    activeSelection === 'right'
                      ? "bg-red-100 border-red-500 shadow-sm"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  )}
                >
                  <img src={rightHalfPizza} alt="Right Half" className="w-8 h-8" />
                  <span className="block mt-1 text-xs font-medium">Right</span>
                </button>
              </div>
            </div>

            {/* Categories */}
            <div className="flex-1 bg-gray-50 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-gray-700 mb-2">Categories</h3>
              <div className="flex gap-1 flex-wrap">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={cn(
                      "px-2 py-1 rounded-full text-xs whitespace-nowrap transition-all duration-200 flex items-center gap-1",
                      activeCategory === category
                        ? "bg-red-600 text-white"
                        : "bg-white hover:bg-gray-100 text-gray-800 border border-gray-200"
                    )}
                  >
                    {category === 'Meats' && <Flame className="w-2.5 h-2.5" />}
                    {category === 'Vegetables' && <Leaf className="w-2.5 h-2.5" />}
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Topping Summary - Compact */}
          <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-green-800">
                  {toppingLimit} included • {getTotalSelectedCount()} selected
                </span>
              </div>
              {getExtraCharge() > 0 && (
                <span className="text-sm font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                  +${getExtraCharge().toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Toppings Grid - 5 per row */}
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Available Toppings</h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                <p className="mt-2 text-gray-500 text-sm">Loading toppings...</p>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {toppings
                  .filter(topping => 
                    activeCategory === 'All' || 
                    (activeCategory === 'Meats' && !topping.isVegetarian) ||
                    (activeCategory === 'Vegetables' && topping.isVegetarian)
                  )
                  .map(topping => {
                    const isSelected = getVisibleToppings(topping.id);
                    const extraToppingsSet = getExtraToppings();
                    let isExtra = false;
                    
                    if (isSelected) {
                      isExtra = extraToppingsSet.has(topping.id);
                    }

                    return (
                      <button
                        key={topping.id}
                        onClick={() => handleToppingToggle(topping)}
                        className={cn(
                          "p-2 rounded-lg border-2 transition-all duration-200 flex flex-col justify-between min-h-[60px] group relative overflow-hidden",
                          isSelected 
                            ? isExtra 
                              ? "bg-orange-50 border-orange-400 shadow-sm" 
                              : "bg-green-50 border-green-400 shadow-sm"
                            : "bg-white hover:bg-gray-50 border-gray-200"
                        )}
                      >
                        {/* Selection indicator */}
                        {isSelected && (
                          <div className="absolute top-1 right-1">
                            <div className={cn(
                              "text-white rounded-full p-0.5",
                              isExtra ? "bg-orange-500" : "bg-green-500"
                            )}>
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          </div>
                        )}
                        
                        <div className="text-center">
                          <span className="font-bold text-xs text-gray-900 leading-tight">{topping.name}</span>
                          
                          {/* Status Indicator */}
                          <div className="mt-1">
                            <span className={cn(
                              "text-xs px-1.5 py-0.5 rounded-full",
                              isSelected 
                                ? isExtra 
                                  ? "bg-orange-100 text-orange-700" 
                                  : "bg-green-100 text-green-700"
                                : getTotalSelectedCount() >= toppingLimit
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-gray-100 text-gray-500"
                            )}>
                              {isSelected 
                                ? (isExtra ? "Extra" : "Included") 
                                : getTotalSelectedCount() >= toppingLimit 
                                  ? "Extra" 
                                  : "Included"
                              }
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 text-sm font-semibold transition-all duration-200 shadow-lg"
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      {content}
    </div>
  );
} 