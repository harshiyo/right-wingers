import React, { useState, useEffect } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '../services/firebase';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';
import { getToppingImage } from '../utils/toppingImageMap';

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

interface InstructionTile {
  id: string;
  label: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

interface PizzaToppingDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (result: { type: string; toppings: ToppingSide; extraCharge: number; toppingLimit: number; isHalfAndHalf: boolean; instructions?: string[] }) => void;
  toppingLimit: number;
  pizzaName: string;
  pizzaItem?: any; // The full pizza menu item with pricing data
  sharedToppingInfo?: {
    totalLimit: number;
    usedToppings: number;
    remainingToppings: number;
    pizzaNumber: number;
    totalPizzas: number;
  };
  navigationProps?: {
    currentStep: number;
    totalSteps: number;
    canGoBack: boolean;
    canGoNext: boolean;
    onGoBack: () => void;
    onGoNext: () => void;
  };
  existingSelections?: any;
  comboSummaryPanel?: React.ReactNode;
}

export const PizzaToppingDialog = ({ open, onClose, onSubmit, toppingLimit, pizzaName, pizzaItem, sharedToppingInfo, navigationProps, existingSelections, comboSummaryPanel }: PizzaToppingDialogProps) => {
  const [toppingsSnapshot, loadingToppings] = useCollection(
    query(collection(db, 'toppings'), orderBy('name'))
  );
  const [instructionTilesSnapshot, loadingInstructions] = useCollection(
    query(collection(db, 'pizzaInstructions'), orderBy('sortOrder'))
  );
  const toppings = toppingsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topping)) || [];
  const instructionTiles = instructionTilesSnapshot?.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as InstructionTile))
    .filter(tile => tile.isActive) || [];
  
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
  const [selectedInstructions, setSelectedInstructions] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeDietaryFilter, setActiveDietaryFilter] = useState<string>('All');

  useEffect(() => {
    if (open) {
      if (existingSelections && existingSelections.toppings) {
        // Pre-populate existing selections
        const newSelections = {
          wholePizza: new Map(),
          leftSide: new Map(),
          rightSide: new Map()
        };
        
        // Handle existing selections for all sides
        if (existingSelections.toppings.wholePizza) {
          existingSelections.toppings.wholePizza.forEach((topping: Topping) => {
            newSelections.wholePizza.set(topping.id, topping);
          });
        }
        if (existingSelections.toppings.leftSide) {
          existingSelections.toppings.leftSide.forEach((topping: Topping) => {
            newSelections.leftSide.set(topping.id, topping);
          });
        }
        if (existingSelections.toppings.rightSide) {
          existingSelections.toppings.rightSide.forEach((topping: Topping) => {
            newSelections.rightSide.set(topping.id, topping);
          });
        }
        
        // Set active selection based on existing data
        if (existingSelections.toppings.leftSide?.length > 0 || existingSelections.toppings.rightSide?.length > 0) {
          setActiveSelection(existingSelections.toppings.leftSide?.length > 0 ? 'left' : 'right');
        }
        setSelectedToppings(newSelections);
        
        // Handle existing instructions
        if (existingSelections.instructions) {
          setSelectedInstructions(new Set(existingSelections.instructions));
        } else {
          setSelectedInstructions(new Set());
        }
      } else {
        setSelectedToppings({
          wholePizza: new Map(),
          leftSide: new Map(),
          rightSide: new Map()
        });
        setActiveSelection('whole');
        setSelectedInstructions(new Set());
      }
    }
  }, [open, existingSelections, pizzaName]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setActiveSelection(prev => prev === 'right' ? 'left' : prev === 'left' ? 'whole' : 'whole');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setActiveSelection(prev => prev === 'whole' ? 'left' : prev === 'left' ? 'right' : 'right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleToppingToggle = (topping: Topping) => {
    setSelectedToppings(prev => {
      const newSelections = { ...prev };
      
      // Calculate current total across all sides
      const currentWholePizzaCount = newSelections.wholePizza.size;
      const currentHalfSideCount = newSelections.leftSide.size + newSelections.rightSide.size;
      const currentHalfSideEquivalents = Math.ceil(currentHalfSideCount / 2);
      const currentTotalEquivalents = currentWholePizzaCount + currentHalfSideEquivalents;
      
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
          
          // Check if we can add this topping without exceeding the limit
          const newTotalEquivalents = currentTotalEquivalents + 1; // Adding 1 whole pizza topping
          if (newTotalEquivalents <= toppingLimit) {
            wholeMap.set(topping.id, topping);
          }
          // If we're over limit, still allow it but it will be charged as extra
          else {
            wholeMap.set(topping.id, topping);
          }
        }
        newSelections.wholePizza = wholeMap;
      } else if (activeSelection === 'left') {
        const leftMap = new Map(newSelections.leftSide);
        if (leftMap.has(topping.id)) {
          leftMap.delete(topping.id);
        } else {
          // When adding to left side, remove from whole pizza if present
          const wholeMap = new Map(newSelections.wholePizza);
          if (wholeMap.has(topping.id)) {
            wholeMap.delete(topping.id);
            newSelections.wholePizza = wholeMap;
          }
          
          // Calculate what the new equivalent count would be
          const newLeftCount = newSelections.leftSide.size + 1;
          const newRightCount = newSelections.rightSide.size;
          const newHalfSideEquivalents = Math.ceil((newLeftCount + newRightCount) / 2);
          const newTotalEquivalents = currentWholePizzaCount + newHalfSideEquivalents;
          // Allow addition regardless of limit (will be charged as extra if over)
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
          // When adding to right side, remove from whole pizza if present
          const wholeMap = new Map(newSelections.wholePizza);
          if (wholeMap.has(topping.id)) {
            wholeMap.delete(topping.id);
            newSelections.wholePizza = wholeMap;
          }
          
          // Calculate what the new equivalent count would be
          const newLeftCount = newSelections.leftSide.size;
          const newRightCount = newSelections.rightSide.size + 1;
          const newHalfSideEquivalents = Math.ceil((newLeftCount + newRightCount) / 2);
          const newTotalEquivalents = currentWholePizzaCount + newHalfSideEquivalents;
          // Allow addition regardless of limit (will be charged as extra if over)
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

  const handleInstructionToggle = (instructionId: string) => {
    setSelectedInstructions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(instructionId)) {
        newSet.delete(instructionId);
      } else {
        newSet.add(instructionId);
      }
      return newSet;
    });
  };

  // Calculate totals based on mode - includes ALL selections
  const getTotalSelectedCount = () => {
    const wholePizzaCount = selectedToppings.wholePizza.size;
    const halfSideCount = selectedToppings.leftSide.size + selectedToppings.rightSide.size;
    // Every 2 half-side toppings counts as 1 full topping equivalent
    const halfSideEquivalents = Math.ceil(halfSideCount / 2);
    return wholePizzaCount + halfSideEquivalents;
  };

  const getTotalExtraCharge = () => {
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

  const totalSelected = getTotalSelectedCount();
  const includedToppings = Math.min(totalSelected, toppingLimit);
  const extraToppings = Math.max(0, totalSelected - toppingLimit);
  const extraCharge = getTotalExtraCharge();

  // Calculate real-time used toppings including current selections
  const currentUsedToppings = sharedToppingInfo ? 
    sharedToppingInfo.usedToppings + includedToppings : 
    includedToppings;

  const handleSubmit = () => {
    const toppingSide: ToppingSide = {
      wholePizza: Array.from(selectedToppings.wholePizza.values()),
      leftSide: Array.from(selectedToppings.leftSide.values()),
      rightSide: Array.from(selectedToppings.rightSide.values())
    };

    onSubmit({ 
      type: 'pizza',
      toppings: toppingSide,
      extraCharge,
      toppingLimit,
      isHalfAndHalf: selectedToppings.leftSide.size > 0 || selectedToppings.rightSide.size > 0,
      instructions: Array.from(selectedInstructions)
    });
  };

  // Get current active selection for display
  const getCurrentSelection = () => {
    if (activeSelection === 'whole') {
      return selectedToppings.wholePizza;
    } else if (activeSelection === 'left') {
      return selectedToppings.leftSide;
    } else {
      return selectedToppings.rightSide;
    }
  };

  const getCurrentLimit = () => {
    // For display purposes, show the full limit for the current selection mode
    // The extra charge calculation will handle the overall limit properly
    return toppingLimit;
  };

  // Helper function to get exact list of extra toppings 
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

  const currentSelection = getCurrentSelection();
  const currentLimit = getCurrentLimit();

  // Get unique categories and dietary filters
  const categories = ['All', ...Array.from(new Set(toppings.map(t => t.category).filter((cat): cat is string => Boolean(cat))))];
  const dietaryFilters = ['All', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Keto'];

  // Filter toppings based on active category and dietary filter
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

  if (!open) return null;

  const content = (
    <div className="flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden h-full">
      {comboSummaryPanel}
      
      {/* Header */}
      <div className="bg-red-600 text-white p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{pizzaName}</h2>
            <p className="text-red-100 text-sm">Customize your toppings</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-red-500 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content - Responsive Layout */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left Sidebar - Responsive */}
        <div className="w-full lg:w-80 bg-gray-50 lg:border-r flex flex-col max-h-[40vh] lg:max-h-none">
          {/* Selection Summary */}
          <div className="p-3 lg:p-4 border-b bg-white">
            <h3 className="font-semibold text-gray-800 mb-2 lg:mb-3 text-sm lg:text-base">Current Selection</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 lg:p-3">
              <div className="text-xs lg:text-sm text-blue-800">
                <div className="font-medium mb-1">
                  {activeSelection === 'whole' ? 'Whole Pizza' : activeSelection === 'left' ? 'Left Side' : 'Right Side'}
                </div>
                <div className="text-blue-600">
                  {currentSelection.size} of {getCurrentLimit()} toppings selected
                </div>
              </div>
            </div>
          </div>

          {/* Shared Topping Info */}
          {sharedToppingInfo && (
            <div className="p-3 lg:p-4 border-b bg-white">
              <h3 className="font-semibold text-gray-800 mb-2 lg:mb-3 text-sm lg:text-base">Shared Pool</h3>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 lg:p-3">
                <div className="text-xs lg:text-sm text-indigo-800">
                  <div className="font-medium mb-1">
                    {sharedToppingInfo.totalLimit} toppings for {sharedToppingInfo.totalPizzas} pizzas
                  </div>
                  <div className="text-indigo-600 space-y-0.5 lg:space-y-1">
                    <div>Used: {currentUsedToppings}</div>
                    <div>Remaining: {Math.max(0, sharedToppingInfo.totalLimit - currentUsedToppings)}</div>
                    <div>Pizza {sharedToppingInfo.pizzaNumber}/{sharedToppingInfo.totalPizzas}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pizza Summary - Consolidated */}
          {(selectedToppings.wholePizza.size > 0 || selectedToppings.leftSide.size > 0 || selectedToppings.rightSide.size > 0 || selectedInstructions.size > 0) && (
            <div className="p-3 lg:p-4 border-b bg-white">
              <h3 className="font-semibold text-gray-800 mb-2 lg:mb-3 text-sm lg:text-base">Your Pizza</h3>
              <div className="bg-gray-50 rounded-lg p-2 lg:p-3">
                <div className="text-xs lg:text-sm text-gray-700 space-y-0.5 lg:space-y-1">
                  {selectedToppings.wholePizza.size > 0 && (
                    <div><span className="font-medium text-gray-800">Whole:</span> {Array.from(selectedToppings.wholePizza.values()).map(t => t.name).join(', ')}</div>
                  )}
                  {selectedToppings.leftSide.size > 0 && (
                    <div><span className="font-medium text-gray-800">Left:</span> {Array.from(selectedToppings.leftSide.values()).map(t => t.name).join(', ')}</div>
                  )}
                  {selectedToppings.rightSide.size > 0 && (
                    <div><span className="font-medium text-gray-800">Right:</span> {Array.from(selectedToppings.rightSide.values()).map(t => t.name).join(', ')}</div>
                  )}
                  {selectedInstructions.size > 0 && (
                    <div><span className="font-medium text-gray-800">Instructions:</span> {Array.from(selectedInstructions).map(id => instructionTiles.find(t => t.id === id)?.label).filter(Boolean).join(', ')}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Extra Charges */}
          {extraCharge > 0 && (
            <div className="p-3 lg:p-4 border-b bg-white">
              <h3 className="font-semibold text-gray-800 mb-2 lg:mb-3 text-sm lg:text-base">Extra Charges</h3>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 lg:p-3">
                <div className="text-orange-800">
                  <div className="font-semibold text-base lg:text-lg">+${extraCharge.toFixed(2)}</div>
                  <div className="text-xs lg:text-sm">{extraToppings} additional topping{extraToppings !== 1 ? 's' : ''}</div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons - Always Visible */}
          <div className="p-3 lg:p-4 mt-auto bg-white border-t">
            <div className="space-y-2 lg:space-y-3">
              {navigationProps?.canGoBack && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full text-xs lg:text-sm" 
                  onClick={navigationProps.onGoBack}
                >
                  ← Back
                </Button>
              )}
              <Button 
                size="sm"
                className="w-full bg-red-600 hover:bg-red-700 font-semibold text-xs lg:text-sm" 
                onClick={handleSubmit}
              >
                {navigationProps
                  ? (navigationProps.currentStep === navigationProps.totalSteps ? 'Complete Order' : 'Continue →')
                  : 'Add to Cart'}
                {extraCharge > 0 && <span className="ml-2 text-red-100">+${extraCharge.toFixed(2)}</span>}
              </Button>
              {navigationProps && (
                <div className="bg-gray-100 p-2 lg:p-3 rounded-lg text-center">
                  <div className="text-xs lg:text-sm text-gray-600">Step</div>
                  <div className="font-bold text-gray-800 text-sm lg:text-base">{navigationProps.currentStep}/{navigationProps.totalSteps}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Content - Toppings */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* All Filters on One Line */}
          <div className="p-3 lg:p-4 border-b bg-white">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Side Selection Filter */}
              <div className="flex-1">
                <label className="block text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">Side</label>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  {[
                    { key: 'whole', label: 'Whole', count: selectedToppings.wholePizza.size },
                    { key: 'left', label: 'Left', count: selectedToppings.leftSide.size },
                    { key: 'right', label: 'Right', count: selectedToppings.rightSide.size }
                  ].map(side => (
                    <button
                      key={side.key}
                      onClick={() => setActiveSelection(side.key as 'whole' | 'left' | 'right')}
                      className={cn(
                        "flex-1 px-2 py-1.5 rounded-md text-xs lg:text-sm font-medium transition-all",
                        activeSelection === side.key
                          ? "bg-red-600 text-white shadow-sm" 
                          : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
                      )}
                    >
                      {side.label} ({side.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex-1">
                <label className="block text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">Category</label>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  {['All', 'Meats', 'Vegetables'].map(category => (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={cn(
                        "flex-1 px-2 py-1.5 rounded-md text-xs lg:text-sm font-medium transition-all",
                        activeCategory === category
                          ? "bg-blue-600 text-white shadow-sm" 
                          : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
                      )}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dietary Filter */}
              <div className="flex-1">
                <label className="block text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">Dietary</label>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  {[
                    { key: 'All', label: 'All' },
                    { key: 'Vegetarian', label: 'Veg 🌱' },
                    { key: 'Vegan', label: 'Vegan 🌿' },
                    { key: 'Gluten-Free', label: 'GF 🌾' },
                    { key: 'Keto', label: 'Keto ❤️' }
                  ].map(filter => (
                    <button
                      key={filter.key}
                      onClick={() => setActiveDietaryFilter(filter.key)}
                      className={cn(
                        "flex-1 px-1 py-1.5 rounded-md text-xs lg:text-sm font-medium transition-all",
                        activeDietaryFilter === filter.key
                          ? "bg-green-600 text-white shadow-sm" 
                          : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Toppings Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loadingToppings ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading toppings...</p>
                </div>
              </div>
            ) : filteredToppings.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
                  </svg>
                </div>
                <p className="text-lg text-gray-600 mb-2">No toppings found</p>
                <p className="text-sm text-gray-400">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {filteredToppings.map((topping) => {
                  const isSelected = currentSelection.has(topping.id);
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
                        "group relative p-3 rounded-xl border-2 transition-all duration-200 hover:shadow-lg text-center box-border min-h-[140px] flex flex-col",
                        isSelected 
                          ? isExtra 
                            ? "border-orange-400 bg-orange-50 shadow-md" 
                            : "border-green-400 bg-green-50 shadow-md"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      {/* Selection Indicator */}
                      <div className="absolute -top-1 -right-1">
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                          isSelected 
                            ? isExtra 
                              ? "border-orange-500 bg-orange-500" 
                              : "border-green-500 bg-green-500"
                            : "border-gray-300 bg-white opacity-0 group-hover:opacity-100"
                        )}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Topping Content */}
                      <div className="flex flex-col items-center h-full">
                        {/* Topping Image */}
                        {(() => {
                          const imagePath = getToppingImage(topping.name);
                          return imagePath ? (
                            <div className="w-12 h-12 mb-2 flex items-center justify-center">
                              <img 
                                src={imagePath} 
                                alt={topping.name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  // Fallback to text if image fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              <div className="hidden text-xs text-gray-500 font-medium text-center">
                                {topping.name}
                              </div>
                            </div>
                          ) : (
                            <div className="w-12 h-12 mb-2 flex items-center justify-center bg-gray-100 rounded-lg">
                              <span className="text-xs text-gray-500 font-medium text-center">
                                {topping.name}
                              </span>
                            </div>
                          );
                        })()}

                        {/* Dietary Icons */}
                        <div className="flex justify-center gap-1 mb-1">
                          {topping.isVegetarian && <span className="text-xs">🌱</span>}
                          {topping.isVegan && <span className="text-xs">🌿</span>}
                          {topping.isGlutenFree && <span className="text-xs">🌾</span>}
                          {topping.isKeto && <span className="text-xs">❤️</span>}
                        </div>

                        {/* Topping Name */}
                        <p className={cn(
                          "text-xs font-bold leading-tight mb-1 text-center",
                          isSelected ? "text-gray-800" : "text-gray-700"
                        )}>
                          {topping.name}
                        </p>

                        {/* Status Indicator */}
                        <div className="flex flex-col items-center mt-auto">
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full h-5 flex items-center justify-center",
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

            {/* Special Instructions */}
            {instructionTiles.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Special Instructions
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {instructionTiles.map((instruction) => {
                    const isSelected = selectedInstructions.has(instruction.id);
                    return (
                      <button
                        key={instruction.id}
                        onClick={() => handleInstructionToggle(instruction.id)}
                        className={cn(
                          "p-3 rounded-xl border-2 transition-all duration-200 text-center hover:shadow-md",
                          isSelected 
                            ? "border-gray-800 bg-gray-800 text-white shadow-lg" 
                            : "border-gray-200 bg-white hover:border-gray-300"
                        )}
                      >
                        <p className="text-sm font-medium">
                          {instruction.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-center items-center p-2 sm:p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
    >
      <div
        className="w-full max-w-[95vw] h-[95vh] bg-red rounded-lg shadow-xl flex flex-col overflow-hidden"
        style={{
          margin: '0 auto',
          padding: '0',
        }}
      >
        <div className="flex-1 overflow-hidden">
          {content}
        </div>
      </div>
    </div>
  );
}; 