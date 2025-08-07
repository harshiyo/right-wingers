import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { X, ChevronLeft, Check, Edit2, Pizza, Drumstick, Coffee, Utensils } from 'lucide-react';
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
  addedOrder?: number;
}

interface ToppingSide {
  wholePizza: (Topping & { addedOrder?: number })[];
  leftSide: (Topping & { addedOrder?: number })[];
  rightSide: (Topping & { addedOrder?: number })[];
}

interface ComboItem {
  type: 'pizza' | 'wings' | 'drink' | 'side' | 'dipping';
  quantity: number;
  toppingLimit?: number;
  sauceLimit?: number;
  maxDipping?: number;
  size?: string;
  itemName?: string;
  itemId?: string; // Add itemId field for pizza pricing lookups
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

interface UnifiedComboSelectorProps {
  open: boolean;
  onClose: () => void;
  combo: ComboDefinition;
  onComplete: (customizedCombo: any) => void;
}

export const UnifiedComboSelector = ({ open, onClose, combo, onComplete }: UnifiedComboSelectorProps) => {
  if (!open || !combo) return null;

  // Generate steps from combo items
  // Use combo.components if combo.items is not available or empty
  const comboItems = combo.items && combo.items.length > 0 ? combo.items : combo.components || [];
  

  
  const steps = combo.isEditing && comboItems.length > 0 
    ? comboItems.map((item, index) => ({
        type: item.type,
        stepIndex: index,
        toppingLimit: item.toppingLimit || item.maxToppings,
        sauceLimit: item.sauceLimit || item.maxSauces,
        maxDipping: item.maxDipping,
        size: item.size,
        itemName: item.itemName,
        quantity: 1,
        availableSizes: item.availableSizes,
        defaultSize: item.defaultSize,
        itemId: item.itemId // Preserve itemId for editing
      }))
    : (() => {
        let globalStepIndex = 0;
        const generatedSteps = comboItems.flatMap((item) =>
          Array(item.quantity).fill(null).map(() => ({ 
            ...item, 
            stepIndex: globalStepIndex++,
            itemId: item.itemId // Preserve itemId for pizza pricing lookups
          }))
        );
        


        return generatedSteps;
      })();

  const [currentStep, setCurrentStep] = useState(0);
  const [draft, setDraft] = useState<any[]>([]);
  const [totalExtraCharges, setTotalExtraCharges] = useState(0);
  // State for toppings and sauces
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [sauces, setSauces] = useState<Topping[]>([]);
  const [loading, setLoading] = useState(true);

  // Pizza customization state
  const [activeSelection, setActiveSelection] = useState<'whole' | 'left' | 'right'>('whole');
  const [selectedToppings, setSelectedToppings] = useState<{
    wholePizza: (Topping & { addedOrder: number })[];
    leftSide: (Topping & { addedOrder: number })[];
    rightSide: (Topping & { addedOrder: number })[];
  }>({
    wholePizza: [],
    leftSide: [],
    rightSide: []
  });
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [toppingOrderCounter, setToppingOrderCounter] = useState(0);

  // Wing customization state
  const [selectedSauces, setSelectedSauces] = useState<Topping[]>([]);
  const [spicyFilter, setSpicyFilter] = useState<'all' | 'spicy' | 'not-spicy'>('all');

  // Dipping sauce customization state
  const [dippingSauces, setDippingSauces] = useState<Topping[]>([]);
  const [selectedDippingSauces, setSelectedDippingSauces] = useState<{[sauceId: string]: number}>({});

  // Size selection state
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [currentStepExtraCharge, setCurrentStepExtraCharge] = useState(0);

  // Function to fetch pizza menu item for pricing
  const fetchPizzaMenuItem = async (itemId: string) => {
    try {
      const docRef = doc(db, 'menuItems', itemId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching pizza menu item:', error);
      return null;
    }
  };

  // Initialize draft with existing data when editing
  useEffect(() => {
    if (combo?.isEditing && combo.items && combo.items.length > 0) {
      const mappedDraft = steps.map((step, idx) => {
        // For editing mode, we need to match items more carefully
        // Find the corresponding item in combo.items based on step index and type
        let match = null;
        
        if (combo.items[idx]) {
          // Direct index matching for editing mode
          match = combo.items[idx];
        } else {
          // Fallback to type matching if direct index doesn't work
          match = combo.items.find((item, i) => {
            if (item.type !== step.type) return false;
            if (item.type === 'pizza' && step.size && item.size) {
              return item.size === step.size && item.itemName === step.itemName;
            }
            if (item.type === 'wings' && step.itemName && item.itemName) {
              return item.itemName === step.itemName;
            }
            if ((item.type === 'drink' || item.type === 'side') && step.itemName && item.itemName) {
              return item.itemName === step.itemName && item.size === step.size;
            }
            return true;
          });
        }
        
        return match ? { ...step, ...match, extraCharge: match.extraCharge || 0 } : { ...step, extraCharge: 0 };
      });
      setDraft(mappedDraft);
      const existingExtraCharges = mappedDraft.reduce((sum, item) => sum + (item.extraCharge || 0), 0);
      setTotalExtraCharges(existingExtraCharges);
    } else {
      setDraft([]);
      setTotalExtraCharges(0);
      setCurrentStep(0);
    }
  }, [combo?.isEditing, combo?.items]);

  // Fetch toppings
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

    if (open) {
      fetchToppings();
    }
  }, [open]);

  // Fetch sauces
  useEffect(() => {
    const fetchSauces = async () => {
      try {
        const saucesQuery = query(collection(db, 'sauces'), orderBy('name'));
        const snapshot = await getDocs(saucesQuery);
        const saucesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Topping));
        setSauces(saucesData);
      } catch (error) {
        console.error('Error fetching sauces:', error);
      }
    };

    if (open) {
      fetchSauces();
    }
  }, [open]);

  // Fetch dipping sauces from menu items with category 'Dipping'
  useEffect(() => {
    const fetchDippingSauces = async () => {
      try {
        const menuItemsQuery = query(collection(db, 'menuItems'), orderBy('name'));
        const snapshot = await getDocs(menuItemsQuery);
        const dippingData = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter((item: any) => item.category === 'Dipping')
          .map((item: any) => ({
            id: item.id,
            name: item.name,
            price: item.price || 0,
            category: item.category
          } as Topping));
        setDippingSauces(dippingData);
      } catch (error) {
        console.error('Error fetching dipping sauces:', error);
      }
    };

    if (open) {
      fetchDippingSauces();
    }
  }, [open]);

  // Initialize current step data
  useEffect(() => {
    if (open && draft[currentStep]) {
      const currentItem = draft[currentStep];
      
      if (currentItem.type === 'pizza' && currentItem.toppings) {
        const { wholePizza = [], leftSide = [], rightSide = [] } = currentItem.toppings;
        setSelectedToppings({
          wholePizza: wholePizza.map((t: Topping & { addedOrder?: number }) => ({ ...t, addedOrder: t.addedOrder || 0 })),
          leftSide: leftSide.map((t: Topping & { addedOrder?: number }) => ({ ...t, addedOrder: t.addedOrder || 0 })),
          rightSide: rightSide.map((t: Topping & { addedOrder?: number }) => ({ ...t, addedOrder: t.addedOrder || 0 }))
        });
        setActiveSelection(leftSide.length > 0 || rightSide.length > 0 ? 'left' : 'whole');
        
        // Set the toppingOrderCounter to the next available number
        const allToppings = [...wholePizza, ...leftSide, ...rightSide];
        const maxAddedOrder = Math.max(...allToppings.map((t: Topping & { addedOrder?: number }) => t.addedOrder || 0), -1);
        setToppingOrderCounter(maxAddedOrder + 1);
      }
      
      if (currentItem.type === 'wings' && currentItem.sauces) {
        setSelectedSauces(currentItem.sauces);
      }
      
      if (currentItem.type === 'dipping' && currentItem.selectedDippingSauces) {
        // Handle both old array format and new quantity object format
        if (Array.isArray(currentItem.selectedDippingSauces)) {
          // Convert old array format to quantity object
          const quantityObj: {[sauceId: string]: number} = {};
          currentItem.selectedDippingSauces.forEach((sauce: any) => {
            quantityObj[sauce.id] = (quantityObj[sauce.id] || 0) + 1;
          });
          setSelectedDippingSauces(quantityObj);
        } else {
          // New quantity object format
          setSelectedDippingSauces(currentItem.selectedDippingSauces);
        }
      }
      
      if (currentItem.size) {
        setSelectedSize(currentItem.size);
      }
    } else {
      // Reset state for new step
      setSelectedToppings({
        wholePizza: [],
        leftSide: [],
        rightSide: []
      });
      setSelectedSauces([]);
      setSelectedDippingSauces({});
      setSelectedSize('');
      setActiveSelection('whole');
      setActiveCategory('All');
      setSpicyFilter('all');
      setToppingOrderCounter(0);
    }
  }, [open, currentStep, draft]);

  const step = steps[currentStep];
  
  // Calculate item numbers for naming
  const pizzaNumber = steps.slice(0, currentStep + 1).filter(s => s.type === 'pizza').length;
  const wingNumber = steps.slice(0, currentStep + 1).filter(s => s.type === 'wings').length;
  
  // Helper function to calculate total topping limit across all pizzas in the combo
  const getTotalToppingLimit = () => {
    return steps
      .filter(step => step.type === 'pizza')
      .reduce((total, step) => total + (step.toppingLimit || 4), 0);
  };

  // Helper function to calculate total used toppings across all completed pizza steps
  const getTotalUsedToppings = () => {
    return draft
      .filter((item, index) => item?.type === 'pizza' && index !== currentStep)
      .reduce((total, pizza) => {
        if (!pizza.toppings) return total;
        return total + calculateToppingCount(pizza.toppings);
      }, 0);
  };

  // Helper function to calculate remaining toppings in the shared pool
  const getRemainingToppings = () => {
    const totalLimit = getTotalToppingLimit();
    const usedToppings = getTotalUsedToppings();
    const currentStepToppings = step.type === 'pizza' ? 
      calculateToppingCount({
        wholePizza: selectedToppings.wholePizza,
        leftSide: selectedToppings.leftSide,
        rightSide: selectedToppings.rightSide
      }) : 0;
    
    return Math.max(0, totalLimit - usedToppings - currentStepToppings);
  };

  // Helper function to calculate topping count (half-side toppings count as 0.5)
  const calculateToppingCount = (toppings: ToppingSide) => {
    if (!toppings) return 0;
    
    const wholePizzaCount = toppings.wholePizza?.filter(t => t).length || 0;
    const leftSideCount = toppings.leftSide?.filter(t => t).length || 0;
    const rightSideCount = toppings.rightSide?.filter(t => t).length || 0;
    
    // Half-side toppings count as 0.5 each
    const halfSideCount = (leftSideCount + rightSideCount) * 0.5;
    
    return wholePizzaCount + halfSideCount;
  };

  // Helper function to calculate extra charge for toppings using shared pool
  const calculateToppingExtraCharge = async (toppings: ToppingSide, stepIndex: number) => {
    const totalCount = calculateToppingCount(toppings);
    const totalLimit = getTotalToppingLimit();
    
    // Calculate used toppings only from steps BEFORE this step
    let usedToppings = 0;
    draft.forEach((stepData, draftStepIndex) => {
      if (draftStepIndex < stepIndex && stepData.type === 'pizza' && stepData.toppings) {
        usedToppings += calculateToppingCount(stepData.toppings);
      }
    });
    
    const availableToppings = totalLimit - usedToppings;
    const extraToppings = Math.max(0, totalCount - availableToppings);
    
    if (extraToppings === 0) return 0;
    
    // Check if this pizza uses flat rate pricing
    const currentStepData = steps[stepIndex];
    if (currentStepData?.type === 'pizza' && currentStepData?.itemId) {
      const pizzaItem = await fetchPizzaMenuItem(currentStepData.itemId);
      
      if (pizzaItem?.pricingMode === 'flat' && pizzaItem?.flatRatePrice) {
        const flatRate = pizzaItem.flatRatePrice;
        const halfMultiplier = pizzaItem.halfPizzaMultiplier || 0.5;
        
        // For flat rate, we charge the cheapest extra toppings first
        let extraCharge = 0;
        let remainingExtras = extraToppings;
        
        // Count actual individual toppings (not equivalents)
        const wholePizzaCount = (toppings.wholePizza || []).length;
        const halfSideCount = (toppings.leftSide || []).length + (toppings.rightSide || []).length;
        const halfSideEquivalents = Math.ceil(halfSideCount / 2);
        
        // Strategy: Use included toppings optimally, then charge for extras starting with cheapest
        // If we have half-side toppings and they go over the limit, charge them first (cheaper)
        if (halfSideCount > 0 && remainingExtras > 0) {
          // Calculate how many half-side toppings should be charged
          const halfSideEquivalentsUsed = Math.min(halfSideEquivalents, Math.max(0, availableToppings - wholePizzaCount));
          const halfSideIncluded = halfSideEquivalentsUsed * 2; // Convert back to individual toppings
          const halfSideExtras = Math.max(0, halfSideCount - halfSideIncluded);
          
          if (halfSideExtras > 0) {
            const halfSideExtrasToCharge = Math.min(halfSideExtras, remainingExtras * 2);
            extraCharge += halfSideExtrasToCharge * flatRate * halfMultiplier;
            remainingExtras -= Math.ceil(halfSideExtrasToCharge / 2); // Convert back to equivalents
          }
        }
        
        // Then charge any remaining extras as whole pizza toppings (more expensive)
        if (remainingExtras > 0) {
          const wholePizzaIncluded = Math.min(wholePizzaCount, Math.max(0, availableToppings - halfSideEquivalents));
          const wholePizzaExtras = Math.max(0, wholePizzaCount - wholePizzaIncluded);
          
          if (wholePizzaExtras > 0) {
            const wholePizzaExtrasToCharge = Math.min(wholePizzaExtras, remainingExtras);
            extraCharge += wholePizzaExtrasToCharge * flatRate;
          }
        }
        
        return extraCharge;
      }
    }
    
    // Original individual topping pricing logic
    // Combine all toppings from all sections and sort by addedOrder
    const allToppings: (Topping & { addedOrder?: number, section: string })[] = [];
    
    const wholePizzaToppings = toppings.wholePizza || [];
    const leftSideToppings = toppings.leftSide || [];
    const rightSideToppings = toppings.rightSide || [];
    
    // Add all toppings with their section info
    wholePizzaToppings.forEach(topping => {
      allToppings.push({ ...topping, section: 'whole' });
    });
    leftSideToppings.forEach(topping => {
      allToppings.push({ ...topping, section: 'left' });
    });
    rightSideToppings.forEach(topping => {
      allToppings.push({ ...topping, section: 'right' });
    });
    
    // Sort by addedOrder to get the correct order they were added
    allToppings.sort((a, b) => (a.addedOrder || 0) - (b.addedOrder || 0));
    
    // Calculate charge based on the toppings that actually exceed the shared pool
    let charge = 0;
    let remainingExtra = extraToppings;
    let currentToppingCount = 0;
    
    // Process toppings in the order they were added
    for (const topping of allToppings) {
      if (remainingExtra <= 0) break;
      
      // Calculate the topping count up to this point
      if (topping.section === 'whole') {
        currentToppingCount += 1;
      } else {
        currentToppingCount += 0.5;
      }
      
      // If this topping would exceed the available slots, it's extra
      if (currentToppingCount > availableToppings) {
        // This topping is extra, charge for it
        if (topping.section === 'whole') {
          charge += topping.price;
          remainingExtra -= 1;
        } else {
          // Half-side toppings are charged at half price
          const toppingCharge = topping.price * 0.5;
          charge += toppingCharge;
          remainingExtra -= 0.5;
        }
      }
    }
    
    return charge;
  };

  // Helper function to calculate extra charge for sauces using actual prices
  const calculateSauceExtraCharge = (sauces: Topping[], limit: number) => {
    if (sauces.length <= limit) return 0;
    
    // Get sauces that exceed the limit and sum their prices
    const extraSauces = sauces.slice(limit);
    return extraSauces.reduce((sum, sauce) => sum + sauce.price, 0);
  };

  // Item names
  const pizzaName = step.type === 'pizza' ? `${combo.name} - Pizza ${pizzaNumber}` : '';
  const wingName = step.type === 'wings' ? `${combo.name} - Wings ${wingNumber}` : '';
  const itemName = step.itemName || step.type.charAt(0).toUpperCase() + step.type.slice(1);

  // Pizza customization handlers
  const handleToppingToggle = (topping: Topping) => {
    setSelectedToppings(prev => {
      const newSelections = { ...prev };
      
      if (activeSelection === 'whole') {
        const wholeIndex = newSelections.wholePizza.findIndex(t => t.id === topping.id);
        if (wholeIndex !== -1) {
          newSelections.wholePizza.splice(wholeIndex, 1);
        } else {
          newSelections.wholePizza.push({ ...topping, addedOrder: toppingOrderCounter });
        }
      } else if (activeSelection === 'left') {
        const leftIndex = newSelections.leftSide.findIndex(t => t.id === topping.id);
        if (leftIndex !== -1) {
          newSelections.leftSide.splice(leftIndex, 1);
        } else {
          newSelections.leftSide.push({ ...topping, addedOrder: toppingOrderCounter });
        }
      } else if (activeSelection === 'right') {
        const rightIndex = newSelections.rightSide.findIndex(t => t.id === topping.id);
        if (rightIndex !== -1) {
          newSelections.rightSide.splice(rightIndex, 1);
        } else {
          newSelections.rightSide.push({ ...topping, addedOrder: toppingOrderCounter });
        }
      }
      
      return newSelections;
    });
    setToppingOrderCounter(prev => prev + 1);
  };

  // Wing customization handlers
  const handleSauceToggle = (sauce: Topping) => {
    setSelectedSauces(prev => {
      const isSelected = prev.find(s => s.id === sauce.id);
      if (isSelected) {
        return prev.filter(s => s.id !== sauce.id);
      } else {
        return [...prev, sauce];
      }
    });
  };

  // Dipping sauce customization handlers
  const handleDippingSauceQuantityChange = (sauce: Topping, delta: number) => {
    setSelectedDippingSauces(prev => {
      const currentQuantity = prev[sauce.id] || 0;
      const newQuantity = Math.max(0, currentQuantity + delta);
      
      if (newQuantity === 0) {
        const { [sauce.id]: removed, ...rest } = prev;
        return rest;
      } else {
        return { ...prev, [sauce.id]: newQuantity };
      }
    });
  };

  // Size selection handlers
  const handleSizeSelect = (size: string) => {
    setSelectedSize(size || '');
  };

  // Navigation handlers
  const handleStepComplete = async () => {
    const newDraft = [...draft];
    let extraCharge = 0;

    if (step.type === 'pizza') {
      const toppingsData = {
        wholePizza: selectedToppings.wholePizza,
        leftSide: selectedToppings.leftSide,
        rightSide: selectedToppings.rightSide
      };
      
      extraCharge = await calculateToppingExtraCharge(toppingsData, currentStep);

      newDraft[currentStep] = {
        ...step,
        toppings: toppingsData,
        extraCharge
      };
    } else if (step.type === 'wings') {
      extraCharge = calculateSauceExtraCharge(selectedSauces, step.sauceLimit || 1);

      newDraft[currentStep] = {
        ...step,
        sauces: selectedSauces,
        extraCharge
      };
    } else if (step.type === 'drink' || step.type === 'side') {
      newDraft[currentStep] = {
        ...step,
        size: selectedSize,
        extraCharge: 0
      };
    } else if (step.type === 'dipping') {
      // Use the configured maxDipping value, fallback to 0 if not set
      const dippingLimit = step.maxDipping || 0;

      // Convert quantity object to array for charging calculation
      const dippingSauceArray = Object.entries(selectedDippingSauces).flatMap(([sauceId, quantity]) => {
        const sauce = dippingSauces.find(s => s.id === sauceId);
        return sauce ? Array(quantity).fill(sauce) : [];
      });

      // Only charge for sauces beyond the limit
      const extraCharge = dippingSauceArray
        .slice(dippingLimit)
        .reduce((acc, sauce) => acc + (sauce.price || 0), 0);
      
      // Create sauce data lookup for display purposes
      const sauceData = Object.keys(selectedDippingSauces).reduce((acc, sauceId) => {
        const sauce = dippingSauces.find(s => s.id === sauceId);
        if (sauce) {
          acc[sauceId] = { name: sauce.name, price: sauce.price };
        }
        return acc;
      }, {} as {[sauceId: string]: {name: string, price: number}});

      newDraft[currentStep] = {
        ...step,
        selectedDippingSauces: selectedDippingSauces,
        sauceData: sauceData,
        extraCharge
      };
    }

    setDraft(newDraft);
    
    // Fix: Replace the current step's extra charge instead of adding to it
    const oldExtraCharge = draft[currentStep]?.extraCharge || 0;
    const newTotalExtraCharges = totalExtraCharges - oldExtraCharge + extraCharge;
    setTotalExtraCharges(newTotalExtraCharges);
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // For final completion, calculate total from all saved step extra charges
      const finalExtraCharges = newDraft.reduce((sum, step) => sum + (step.extraCharge || 0), 0);
      
      const assembled = {
        comboId: combo.comboId,
        name: combo.name,
        imageUrl: combo.imageUrl,
        items: newDraft,
        price: parseFloat(Number(combo.price).toFixed(2)),
        extraCharges: parseFloat(finalExtraCharges.toFixed(2)),
        isEditing: combo.isEditing,
        editingItemId: combo.editingItemId,
      };
      
      onComplete(assembled);
      
      // Reset states
      setDraft([]);
      setCurrentStep(0);
      setTotalExtraCharges(0);
      onClose();
    }
  };

  const handleGoBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex <= currentStep) {
      setCurrentStep(stepIndex);
    }
  };

  const handleClose = () => {
    setDraft([]);
    setCurrentStep(0);
    setTotalExtraCharges(0);
    onClose();
  };

  // Filter toppings by category and dietary preferences
  const filteredToppings = toppings.filter(topping => {
    if (activeCategory !== 'All' && topping.category !== activeCategory) return false;
    return true;
  });

  // Filter sauces by spicy preference
  const filteredSauces = sauces.filter(sauce => {
    if (spicyFilter === 'spicy' && !sauce.name.toLowerCase().includes('spicy')) return false;
    if (spicyFilter === 'not-spicy' && sauce.name.toLowerCase().includes('spicy')) return false;
    return true;
  });

  // Get categories for filter
  const categories = ['All', ...Array.from(new Set(toppings.map(t => t.category).filter(Boolean)))].filter((category): category is string => typeof category === 'string');

  // Calculate current step extra charges
  const getCurrentStepExtraCharge = async () => {
    const step = steps[currentStep];
    if (!step) return 0;

    if (step.type === 'pizza') {
      const toppingsData = {
        wholePizza: selectedToppings.wholePizza || [],
        leftSide: selectedToppings.leftSide || [],
        rightSide: selectedToppings.rightSide || []
      };
      
      return await calculateToppingExtraCharge(toppingsData, currentStep);
    } else if (step.type === 'wings') {
      return calculateSauceExtraCharge(selectedSauces, step.sauceLimit || 1);
    } else if (step.type === 'dipping') {
      const dippingLimit = step.maxDipping || 0;
      
      // Convert quantity object to array for charging calculation
      const dippingSauceArray = Object.entries(selectedDippingSauces).flatMap(([sauceId, quantity]) => {
        const sauce = dippingSauces.find(s => s.id === sauceId);
        return sauce ? Array(quantity).fill(sauce) : [];
      });

      const extraCharge = dippingSauceArray
        .slice(dippingLimit)
        .reduce((acc, sauce) => acc + (sauce.price || 0), 0);
        
      return extraCharge;
    }
    return 0;
  };

  // Update current step extra charge when needed
  useEffect(() => {
    const updateExtraCharge = async () => {
      const extraCharge = await getCurrentStepExtraCharge();
      setCurrentStepExtraCharge(extraCharge);
    };
    updateExtraCharge();
  }, [currentStep, selectedToppings, selectedSauces, selectedDippingSauces]);

  // Render current step content
  const renderCurrentStepContent = () => {
    if (step.type === 'pizza') {
      return (
        <div className="flex-1 overflow-y-auto p-6">
          {/* Pizza Section Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Pizza Section</h3>
            <div className="flex gap-4">
              <button
                onClick={() => setActiveSelection('whole')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors",
                  activeSelection === 'whole'
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <Pizza className="w-6 h-6" />
                <span>Whole Pizza</span>
              </button>
              <button
                onClick={() => setActiveSelection('left')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors",
                  activeSelection === 'left'
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <Pizza className="w-6 h-6" />
                <span>Left Half</span>
              </button>
              <button
                onClick={() => setActiveSelection('right')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors",
                  activeSelection === 'right'
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <Pizza className="w-6 h-6" />
                <span>Right Half</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <div className="flex gap-4 items-center">
              <div className="flex gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={cn(
                      "px-3 py-1 rounded-full text-sm transition-colors",
                      activeCategory === category
                        ? "bg-red-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Toppings Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {filteredToppings.map(topping => {
              const isSelected = activeSelection === 'whole' 
                ? selectedToppings.wholePizza.some(t => t.id === topping.id)
                : activeSelection === 'left'
                ? selectedToppings.leftSide.some(t => t.id === topping.id)
                : selectedToppings.rightSide.some(t => t.id === topping.id);

              // Determine if this topping would be included or extra based on shared pool
              const isIncluded = (() => {
                // Get the total topping limit for the combo
                const totalToppingLimit = getTotalToppingLimit();
                
                // Calculate how many toppings are already used from previous steps
                let usedToppings = 0;
                draft.forEach((stepData, stepIndex) => {
                  if (stepIndex < currentStep && stepData.type === 'pizza' && stepData.toppings) {
                    usedToppings += calculateToppingCount(stepData.toppings);
                  }
                });
                
                // Calculate how many toppings are available for this step
                const availableToppings = Math.max(0, totalToppingLimit - usedToppings);
                
                // If this topping is already selected, check if it was within the available slots when added
                if (isSelected) {
                  // Get all current step toppings and sort by addedOrder
                  const allCurrentToppings: (Topping & { addedOrder?: number, section: string })[] = [];
                  
                  selectedToppings.wholePizza.forEach(t => {
                    allCurrentToppings.push({ ...t, section: 'whole' });
                  });
                  selectedToppings.leftSide.forEach(t => {
                    allCurrentToppings.push({ ...t, section: 'left' });
                  });
                  selectedToppings.rightSide.forEach(t => {
                    allCurrentToppings.push({ ...t, section: 'right' });
                  });
                  
                  // Sort by addedOrder
                  allCurrentToppings.sort((a, b) => (a.addedOrder || 0) - (b.addedOrder || 0));
                  
                  // Find this topping and calculate if it's included
                  let currentToppingCount = 0;
                  for (const t of allCurrentToppings) {
                    if (t.id === topping.id) {
                      // Check if this topping would exceed the available slots
                      const wouldExceed = currentToppingCount >= availableToppings;
                      return !wouldExceed;
                    }
                    
                    // Add this topping's count
                    if (t.section === 'whole') {
                      currentToppingCount += 1;
                    } else {
                      currentToppingCount += 0.5;
                    }
                  }
                  
                  return false; // Topping not found
                } else {
                  // If this topping is not selected, check if adding it would exceed the available slots
                  // Calculate current step's topping count properly
                  const currentStepToppingsData = {
                    wholePizza: selectedToppings.wholePizza,
                    leftSide: selectedToppings.leftSide,
                    rightSide: selectedToppings.rightSide
                  };
                  const currentStepCount = calculateToppingCount(currentStepToppingsData);
                  return currentStepCount < availableToppings;
                }
              })();

              return (
                <button
                  key={topping.id}
                  onClick={() => handleToppingToggle(topping)}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all hover:shadow-md flex flex-col items-center min-h-[100px]",
                    isSelected
                      ? isIncluded
                        ? "border-green-500 bg-green-50"
                        : "border-red-500 bg-red-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  {/* Topping Image */}
                  {(() => {
                    const imagePath = getToppingImage(topping.name);
                    return imagePath ? (
                      <div className="w-10 h-10 mb-2 flex items-center justify-center">
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
                      <div className="w-10 h-10 mb-2 flex items-center justify-center bg-gray-100 rounded-lg">
                        <span className="text-xs text-gray-500 font-medium text-center">
                          {topping.name}
                        </span>
                      </div>
                    );
                  })()}
                  
                  <div className="text-center">
                    <div className="font-bold text-xs">{topping.name}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    } else if (step.type === 'wings') {
      return (
        <div className="flex-1 overflow-y-auto p-6">
          {/* Spicy Filter */}
          <div className="mb-6">
            <div className="flex gap-2">
              {['all', 'spicy', 'not-spicy'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setSpicyFilter(filter as any)}
                  className={cn(
                    "px-3 py-1 rounded-full text-sm transition-colors",
                    spicyFilter === filter
                      ? "bg-red-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  {filter === 'all' ? 'All' : filter === 'spicy' ? 'Spicy' : 'Not Spicy'}
                </button>
              ))}
            </div>
          </div>

          {/* Sauces Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {filteredSauces.map(sauce => {
              const isSelected = selectedSauces.find(s => s.id === sauce.id);

              // Determine if this sauce would be included or extra
              const isIncluded = (() => {
                const sauceLimit = step.sauceLimit || 0;
                const sauceIndex = selectedSauces.findIndex(s => s.id === sauce.id);
                return sauceIndex < sauceLimit;
              })();

              return (
                <button
                  key={sauce.id}
                  onClick={() => handleSauceToggle(sauce)}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all hover:shadow-md",
                    isSelected
                      ? isIncluded
                        ? "border-green-500 bg-green-50"
                        : "border-red-500 bg-red-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="text-center">
                    <div className="font-bold text-sm">{sauce.name}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    } else if (step.type === 'drink' || step.type === 'side') {
      return (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {step.availableSizes?.map(size => (
              <button
                key={size}
                onClick={() => size && handleSizeSelect(size)}
                className={cn(
                  "p-4 rounded-lg border-2 transition-all hover:shadow-md text-center",
                  selectedSize === size
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="font-medium text-lg">{size}</div>
                <div className="text-sm text-gray-600">Size</div>
              </button>
            ))}
          </div>
        </div>
      );
    } else if (step.type === 'dipping') {
      // Use the configured maxDipping value, fallback to 0 if not set
      const dippingLimit = step.maxDipping || 0;
      
      return (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Dipping Sauces</h3>
            <p className="text-sm text-gray-600">
              Choose your preferred dipping sauces for this combo.
              {dippingLimit > 0 && ` (${dippingLimit} included, additional sauces extra)`}
            </p>
          </div>

          {/* Dipping Sauces Grid - Individual items with quantity controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dippingSauces.map((sauce, sauceIndex) => {
              const currentQuantity = selectedDippingSauces[sauce.id] || 0;
              
              // Create a flat array of all selected sauces in order for proper included/extra calculation
              const allSelectedSauces = Object.entries(selectedDippingSauces).flatMap(([sauceId, quantity]) => {
                const sauceData = dippingSauces.find(s => s.id === sauceId);
                return sauceData ? Array(quantity).fill(sauceData) : [];
              });
              
              // Count how many of this specific sauce are included vs extra
              let includedForThisSauce = 0;
              let chargedForThisSauce = 0;
              
              allSelectedSauces.forEach((selectedSauce, index) => {
                if (selectedSauce.id === sauce.id) {
                  if (index < dippingLimit) {
                    includedForThisSauce++;
                  } else {
                    chargedForThisSauce++;
                  }
                }
              });

              return (
                <div
                  key={sauce.id}
                  className="p-4 rounded-lg border-2 border-gray-200 bg-white"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{sauce.name}</h4>
                      <div className="text-xs text-gray-600 mt-1">
                        {sauce.price > 0 ? `$${sauce.price.toFixed(2)} each` : 'Free'}
                        {currentQuantity > 0 && (
                          <div className="mt-1">
                            {includedForThisSauce > 0 && (
                              <span className="text-green-600">
                                {includedForThisSauce} included
                              </span>
                            )}
                            {chargedForThisSauce > 0 && (
                              <span className={includedForThisSauce > 0 ? "text-red-600 ml-2" : "text-red-600"}>
                                {chargedForThisSauce} extra (+${(chargedForThisSauce * sauce.price).toFixed(2)})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <button
                        onClick={() => handleDippingSauceQuantityChange(sauce, -1)}
                        disabled={currentQuantity === 0}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium">{currentQuantity}</span>
                      <button
                        onClick={() => handleDippingSauceQuantityChange(sauce, 1)}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {dippingSauces.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-sm">No dipping sauces available</div>
              <div className="text-xs mt-1">Create items in the "Dipping" category to show them here</div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Render sidebar summary
  const renderSidebar = () => {
    const getStepIcon = (stepType: string) => {
      switch (stepType) {
        case 'pizza': return <Pizza className="w-4 h-4" />;
        case 'wings': return <Drumstick className="w-4 h-4" />;
        case 'drink': return <Coffee className="w-4 h-4" />;
        case 'side': return <Utensils className="w-4 h-4" />;
        case 'dipping': return <span className="text-sm">🥄</span>;
        default: return <div className="w-4 h-4" />;
      }
    };

    const getStepStatus = (stepIndex: number) => {
      if (stepIndex < currentStep) return 'completed';
      if (stepIndex === currentStep) return 'current';
      return 'pending';
    };

    const getStepSummary = (stepIndex: number) => {
      const stepData = draft[stepIndex];
      if (!stepData) return 'Not started';

      switch (stepData.type) {
        case 'pizza': {
          if (stepData.toppings) {
            const totalToppings = calculateToppingCount(stepData.toppings);
            return `${totalToppings.toFixed(1)} toppings selected`;
          }
          return 'No toppings';
        }
        case 'wings':
          if (stepData.sauces) {
            return `${stepData.sauces.length} sauces selected`;
          }
          return 'No sauces';
        case 'drink':
        case 'side':
          return stepData.size || 'No size selected';
        default:
          return 'Customized';
      }
    };

    // Get item type name (capitalized, no numbers)
    const getItemTypeName = (stepType: string) => {
      switch (stepType) {
        case 'pizza': return 'Pizza';
        case 'wings': return 'Wings';
        case 'drink': return 'Drink';
        case 'side': return 'Side';
        default: return stepType.charAt(0).toUpperCase() + stepType.slice(1);
      }
    };

    // Helper function to determine if a topping is included or extra
    const isToppingIncluded = (topping: Topping, stepData: any, stepIndex: number) => {
      if (!stepData || stepData.type !== 'pizza' || !stepData.toppings) return false;
      
      // Get the total topping limit for the combo
      const totalToppingLimit = getTotalToppingLimit();
      
      // Calculate how many toppings are already used from previous steps
      let usedToppings = 0;
      draft.forEach((draftStep, draftStepIndex) => {
        if (draftStepIndex < stepIndex && draftStep.type === 'pizza' && draftStep.toppings) {
          usedToppings += calculateToppingCount(draftStep.toppings);
        }
      });
      
      // Calculate how many toppings are available for this step
      const availableToppings = Math.max(0, totalToppingLimit - usedToppings);
      
      // Get all toppings from the current step and sort by addedOrder
      const { wholePizza = [], leftSide = [], rightSide = [] } = stepData.toppings;
      const allStepToppings: (Topping & { addedOrder?: number, section: string })[] = [];
      
      wholePizza.forEach((t: Topping & { addedOrder?: number }) => {
        allStepToppings.push({ ...t, section: 'whole' });
      });
      leftSide.forEach((t: Topping & { addedOrder?: number }) => {
        allStepToppings.push({ ...t, section: 'left' });
      });
      rightSide.forEach((t: Topping & { addedOrder?: number }) => {
        allStepToppings.push({ ...t, section: 'right' });
      });
      
      // Sort by addedOrder
      allStepToppings.sort((a, b) => (a.addedOrder || 0) - (b.addedOrder || 0));
      
      // Find this topping and calculate if it's included
      let currentToppingCount = 0;
      for (const t of allStepToppings) {
        if (t.id === topping.id) {
          // Check if this topping would exceed the available slots
          const wouldExceed = currentToppingCount >= availableToppings;
          return !wouldExceed;
        }
        
        // Add this topping's count
        if (t.section === 'whole') {
          currentToppingCount += 1;
        } else {
          currentToppingCount += 0.5;
        }
      }
      
      return false; // Topping not found
    };

    // Helper function to determine if a sauce is included or extra
    const isSauceIncluded = (sauce: Topping, stepData: any) => {
      if (!stepData || stepData.type !== 'wings' || !stepData.sauces) return false;
      
      const sauceLimit = stepData.sauceLimit || 0;
      const sauceIndex = stepData.sauces.findIndex((s: Topping) => s.id === sauce.id);
      
      return sauceIndex < sauceLimit;
    };

    return (
      <div className="w-80 bg-gray-50 border-l border-gray-200 p-6 overflow-y-auto">
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 text-red-700 bg-gradient-to-r from-red-50 to-red-100 px-4 py-2 rounded-lg border border-red-200">Combo Summary</h3>
          <div className="space-y-3">
            {steps.map((step, index) => {
              const status = getStepStatus(index);
              const summary = getStepSummary(index);
              const isClickable = index <= currentStep;
              const stepData = draft[index];
              
              // Get item type name (capitalized, no numbers)
              const getItemTypeName = (stepType: string) => {
                switch (stepType) {
                  case 'pizza': return 'Pizza';
                  case 'wings': return 'Wings';
                  case 'drink': return 'Drink';
                  case 'side': return 'Side';
                  default: return stepType.charAt(0).toUpperCase() + stepType.slice(1);
                }
              };

              // Render topping/sauce details with color coding
              let details: React.ReactNode = null;
              if (stepData) {
                if (stepData.type === 'pizza' && stepData.toppings) {
                  const { wholePizza = [], leftSide = [], rightSide = [] } = stepData.toppings;
                  const detailLines = [];
                  
                  if (wholePizza.length > 0) {
                    const wholeToppings = wholePizza.map((t: Topping) => ({
                      ...t,
                      isIncluded: isToppingIncluded(t, stepData, index)
                    }));
                    detailLines.push(
                      <div key="whole" className="mb-1">
                        <span className="text-xs font-medium text-gray-700">Whole:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {wholeToppings.map((t: Topping & { isIncluded: boolean }) => (
                            <span
                              key={t.id}
                              className={cn(
                                "text-xs px-2 py-1 rounded-full",
                                t.isIncluded
                                  ? "bg-green-100 text-green-800 border border-green-200"
                                  : "bg-red-100 text-red-800 border border-red-200"
                              )}
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  
                  if (leftSide.length > 0) {
                    const leftToppings = leftSide.map((t: Topping) => ({
                      ...t,
                      isIncluded: isToppingIncluded(t, stepData, index)
                    }));
                    detailLines.push(
                      <div key="left" className="mb-1">
                        <span className="text-xs font-medium text-gray-700">Left:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {leftToppings.map((t: Topping & { isIncluded: boolean }) => (
                            <span
                              key={t.id}
                              className={cn(
                                "text-xs px-2 py-1 rounded-full",
                                t.isIncluded
                                  ? "bg-green-100 text-green-800 border border-green-200"
                                  : "bg-red-100 text-red-800 border border-red-200"
                              )}
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  
                  if (rightSide.length > 0) {
                    const rightToppings = rightSide.map((t: Topping) => ({
                      ...t,
                      isIncluded: isToppingIncluded(t, stepData, index)
                    }));
                    detailLines.push(
                      <div key="right" className="mb-1">
                        <span className="text-xs font-medium text-gray-700">Right:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {rightToppings.map((t: Topping & { isIncluded: boolean }) => (
                            <span
                              key={t.id}
                              className={cn(
                                "text-xs px-2 py-1 rounded-full",
                                t.isIncluded
                                  ? "bg-green-100 text-green-800 border border-green-200"
                                  : "bg-red-100 text-red-800 border border-red-200"
                              )}
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  
                  if (detailLines.length > 0) {
                    details = (
                      <div className="text-xs text-gray-500 mt-2">
                        {detailLines}
                      </div>
                    );
                  }
                } else if (stepData.type === 'wings' && stepData.sauces && stepData.sauces.length > 0) {
                  const sauces = stepData.sauces.map((s: Topping) => ({
                    ...s,
                    isIncluded: isSauceIncluded(s, stepData)
                  }));
                  
                  details = (
                    <div className="text-xs text-gray-500 mt-2">
                      <div className="flex flex-wrap gap-1">
                        {sauces.map((s: Topping & { isIncluded: boolean }) => (
                          <span
                            key={s.id}
                            className={cn(
                              "text-xs px-2 py-1 rounded-full",
                              s.isIncluded
                                ? "bg-green-100 text-green-800 border border-green-200"
                                : "bg-red-100 text-red-800 border border-red-200"
                            )}
                          >
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                }
              }

              return (
                <div
                  key={index}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all cursor-pointer",
                    status === 'completed'
                      ? "border-green-500 bg-green-50"
                      : status === 'current'
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 bg-white",
                    isClickable && "hover:shadow-md"
                  )}
                  onClick={() => isClickable && handleStepClick(index)}
                >
                  <div className="flex items-center gap-3">
                    {getStepIcon(step.type)}
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {getItemTypeName(step.type)}
                      </div>
                      <div className="text-xs text-gray-600">{summary}</div>
                      {details}
                    </div>
                    {status === 'completed' && (
                      <Check className="w-4 h-4 text-green-600" />
                    )}
                    {status === 'current' && (
                      <Edit2 className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Extra Charges Summary */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Extra Charges</h4>
          <div className="space-y-2 text-sm">
            {draft.map((item, index) => {
              if (item && typeof item.extraCharge === 'number' && item.extraCharge > 0) {
                return (
                  <div key={index} className="flex justify-between">
                    <span>{getItemTypeName(item.type)}</span>
                    <span className="text-red-600">+${item.extraCharge.toFixed(2)}</span>
                  </div>
                );
              }
              return null;
            })}
            {currentStepExtraCharge > 0 && (
              <div className="flex justify-between border-t pt-2">
                <span>Current Step</span>
                <span className="text-red-600">+${currentStepExtraCharge.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium border-t pt-2">
              <span>Total Extra</span>
              <span className="text-red-600">
                ${(totalExtraCharges + currentStepExtraCharge).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{currentStep + 1} of {steps.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-red-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl h-[90vh] flex">
        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-50 to-white">
          {/* Header */}
          <div className="p-6 border-b flex items-center justify-between bg-gradient-to-r from-red-600 to-red-700 text-white">
            <div className="flex items-center gap-3">
              {currentStep > 0 && (
                <button
                  onClick={handleGoBack}
                  className="p-1.5 hover:bg-red-500 rounded-full transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <div>
                <h2 className="text-xl font-bold">Customize {combo.name}</h2>
                <p className="text-sm text-red-100">
                  Step {currentStep + 1} of {steps.length}: {step.type.charAt(0).toUpperCase() + step.type.slice(1)}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-red-500 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Step Content */}
          {renderCurrentStepContent()}

          {/* Footer */}
          <div className="p-6 border-t bg-gradient-to-r from-gray-50 to-gray-100 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {currentStep < steps.length - 1 ? 'Click Next to continue' : 'Review your selections'}
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStepComplete}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
              >
                {currentStep < steps.length - 1 ? 'Next' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        {renderSidebar()}
      </div>
    </div>
  );
}; 