import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { X, ChevronLeft, ChevronRight, Check, Edit2, Pizza, Drumstick, Coffee, Utensils } from 'lucide-react';
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

interface UnifiedComboSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  combo: ComboDefinition;
  onSubmit: (customizedCombo: any) => void;
}

export default function UnifiedComboSelector({ isOpen, onClose, combo, onSubmit }: UnifiedComboSelectorProps) {
  if (!isOpen || !combo) return null;

  // Generate steps from combo items
  const steps = combo.isEditing && combo.items.length > 0
    ? combo.items.map((item, index) => ({
        type: item.type,
        stepIndex: index,
        toppingLimit: item.toppingLimit,
        sauceLimit: item.sauceLimit,
        size: item.size,
        itemName: item.itemName,
        quantity: 1,
        availableSizes: item.availableSizes,
        defaultSize: item.defaultSize,
        isSpecialty: item.isSpecialty
      }))
    : (() => {
        let globalStepIndex = 0;
        return combo.items.flatMap((item) =>
          Array(item.quantity).fill(null).map(() => ({
            type: item.type,
            stepIndex: globalStepIndex++,
            toppingLimit: item.toppingLimit,
            sauceLimit: item.sauceLimit,
            size: item.size,
            itemName: item.itemName,
            availableSizes: item.availableSizes,
            defaultSize: item.defaultSize,
            isSpecialty: item.isSpecialty
          }))
        );
      })();

  const [currentStep, setCurrentStep] = useState(0);
  const [draft, setDraft] = useState<any[]>([]);
  const [totalExtraCharges, setTotalExtraCharges] = useState(0);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [loading, setLoading] = useState(true);

  // Pizza customization state
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

  // Wing customization state
  const [selectedSauces, setSelectedSauces] = useState<Topping[]>([]);
  const [spicyFilter, setSpicyFilter] = useState<'all' | 'spicy' | 'not-spicy'>('all');

  // Size selection state
  const [selectedSize, setSelectedSize] = useState<string>('');

  // Initialize draft with existing data when editing
  useEffect(() => {
    if (combo?.isEditing && combo.items && combo.items.length > 0) {
      setDraft([...combo.items]);
      const existingExtraCharges = combo.items.reduce((sum: number, item: any) => {
        return sum + (item.extraCharge || 0);
      }, 0);
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

    if (isOpen) {
      fetchToppings();
    }
  }, [isOpen]);

  // Initialize current step data
  useEffect(() => {
    if (isOpen && draft[currentStep]) {
      const currentItem = draft[currentStep];
      
      if (currentItem.type === 'pizza' && currentItem.toppings) {
        const { wholePizza = [], leftSide = [], rightSide = [] } = currentItem.toppings;
        setSelectedToppings({
          wholePizza: new Map(wholePizza.map((t: Topping) => [t.id, t])),
          leftSide: new Map(leftSide.map((t: Topping) => [t.id, t])),
          rightSide: new Map(rightSide.map((t: Topping) => [t.id, t]))
        });
        setActiveSelection(leftSide.length > 0 || rightSide.length > 0 ? 'left' : 'whole');
      }
      
      if (currentItem.type === 'wings' && currentItem.sauces) {
        setSelectedSauces(currentItem.sauces);
      }
      
      if (currentItem.size) {
        setSelectedSize(currentItem.size);
      }
    } else {
      // Reset state for new step
      setSelectedToppings({
        wholePizza: new Map(),
        leftSide: new Map(),
        rightSide: new Map()
      });
      setSelectedSauces([]);
      setSelectedSize('');
      setActiveSelection('whole');
      setActiveCategory('All');
      setSpicyFilter('all');
    }
  }, [isOpen, currentStep, draft]);

  const step = steps[currentStep];
  
  // Calculate item numbers for naming
  const pizzaNumber = steps.slice(0, currentStep + 1).filter(s => s.type === 'pizza').length;
  const wingNumber = steps.slice(0, currentStep + 1).filter(s => s.type === 'wings').length;
  
  // Calculate shared topping pool for pizzas
  const pizzaSteps = steps.filter(s => s.type === 'pizza');
  const totalToppingLimit = pizzaSteps.reduce((sum, s) => sum + (s.toppingLimit || 0), 0);
  const usedToppings = draft.filter((item, idx) => item?.type === 'pizza' && idx !== currentStep)
    .reduce((sum, pizza) => {
      if (!pizza.toppings) return sum;
      const toppingsCount = Array.isArray(pizza.toppings) 
        ? pizza.toppings.length 
        : (pizza.toppings.wholePizza || []).length;
      return sum + Math.min(toppingsCount, totalToppingLimit - sum);
    }, 0);
  const remainingToppings = Math.max(0, totalToppingLimit - usedToppings);

  // Calculate shared sauce pool for wings
  const wingSteps = steps.filter(s => s.type === 'wings');
  const totalSauceLimit = wingSteps.reduce((sum, s) => sum + (s.sauceLimit || 0), 0);
  const usedSauces = draft.filter((item, idx) => item?.type === 'wings' && idx !== currentStep)
    .reduce((sum, wing) => {
      const sauceCount = wing.sauces?.length || 0;
      return sum + Math.min(sauceCount, totalSauceLimit - sum);
    }, 0);
  const remainingSauces = Math.max(0, totalSauceLimit - usedSauces);

  // Item names
  const pizzaName = step.type === 'pizza' ? `${combo.name} - Pizza ${pizzaNumber}` : '';
  const wingName = step.type === 'wings' ? `${combo.name} - Wings ${wingNumber}` : '';
  const itemName = step.itemName || step.type.charAt(0).toUpperCase() + step.type.slice(1);

  // Pizza customization handlers
  const handleToppingToggle = (topping: Topping) => {
    setSelectedToppings(prev => {
      const newSelections = { ...prev };
      
      if (activeSelection === 'whole') {
        const wholeMap = new Map(newSelections.wholePizza);
        if (wholeMap.has(topping.id)) {
          wholeMap.delete(topping.id);
        } else {
          wholeMap.set(topping.id, topping);
        }
        newSelections.wholePizza = wholeMap;
      } else if (activeSelection === 'left') {
        const leftMap = new Map(newSelections.leftSide);
        if (leftMap.has(topping.id)) {
          leftMap.delete(topping.id);
        } else {
          leftMap.set(topping.id, topping);
        }
        newSelections.leftSide = leftMap;
      } else if (activeSelection === 'right') {
        const rightMap = new Map(newSelections.rightSide);
        if (rightMap.has(topping.id)) {
          rightMap.delete(topping.id);
        } else {
          rightMap.set(topping.id, topping);
        }
        newSelections.rightSide = rightMap;
      }
      
      return newSelections;
    });
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

  // Size selection handlers
  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
  };

  // Navigation handlers
  const handleStepComplete = () => {
    const newDraft = [...draft];
    let extraCharge = 0;

    if (step.type === 'pizza' && !step.isSpecialty) {
      const toppingsData = {
        wholePizza: Array.from(selectedToppings.wholePizza.values()),
        leftSide: Array.from(selectedToppings.leftSide.values()),
        rightSide: Array.from(selectedToppings.rightSide.values())
      };
      
      const totalToppings = toppingsData.wholePizza.length + 
                           toppingsData.leftSide.length + 
                           toppingsData.rightSide.length;
      
      if (totalToppings > (step.toppingLimit || 4)) {
        extraCharge = (totalToppings - (step.toppingLimit || 4)) * 1.50;
      }

      newDraft[currentStep] = {
        type: step.type,
        toppings: toppingsData,
        extraCharge
      };
    } else if (step.type === 'wings') {
      if (selectedSauces.length > (step.sauceLimit || 1)) {
        extraCharge = (selectedSauces.length - (step.sauceLimit || 1)) * 0.50;
      }

      newDraft[currentStep] = {
        type: step.type,
        sauces: selectedSauces,
        extraCharge
      };
    } else if (step.type === 'drink' || step.type === 'side' || (step.type === 'pizza' && step.isSpecialty)) {
      newDraft[currentStep] = {
        type: step.type,
        size: selectedSize,
        extraCharge: 0
      };
    }

    setDraft(newDraft);
    setTotalExtraCharges(prev => prev + extraCharge);
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      const finalExtraCharges = totalExtraCharges + extraCharge;
      
      const assembled = {
        comboId: combo.comboId,
        name: combo.name,
        imageUrl: combo.imageUrl,
        items: newDraft,
        price: parseFloat((Number(combo.isEditing 
          ? (combo.price - (combo.extraCharges || 0))
          : combo.price
        )).toFixed(2)),
        extraCharges: parseFloat(finalExtraCharges.toFixed(2)),
        isEditing: combo.isEditing,
        editingItemId: combo.editingItemId,
      };
      onSubmit(assembled);
      
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
  const filteredSauces = toppings.filter(topping => {
    if (spicyFilter === 'spicy' && !topping.name.toLowerCase().includes('spicy')) return false;
    if (spicyFilter === 'not-spicy' && topping.name.toLowerCase().includes('spicy')) return false;
    return true;
  });

  // Get categories for filter
  const categories = ['All', ...Array.from(new Set(toppings.map(t => t.category).filter(Boolean)))];

  // Calculate current step extra charges
  const getCurrentStepExtraCharge = () => {
    if (step.type === 'pizza' && !step.isSpecialty) {
      const totalToppings = selectedToppings.wholePizza.size + 
                           selectedToppings.leftSide.size + 
                           selectedToppings.rightSide.size;
      if (totalToppings > (step.toppingLimit || 4)) {
        return (totalToppings - (step.toppingLimit || 4)) * 1.50;
      }
    } else if (step.type === 'wings') {
      if (selectedSauces.length > (step.sauceLimit || 1)) {
        return (selectedSauces.length - (step.sauceLimit || 1)) * 0.50;
      }
    }
    return 0;
  };

  const currentStepExtraCharge = getCurrentStepExtraCharge();

  // Render current step content
  const renderCurrentStepContent = () => {
    if (step.type === 'pizza' && !step.isSpecialty) {
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
                <img src={fullPizza} alt="Whole Pizza" className="w-6 h-6" />
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
                <img src={leftHalfPizza} alt="Left Half" className="w-6 h-6" />
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
                <img src={rightHalfPizza} alt="Right Half" className="w-6 h-6" />
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
                ? selectedToppings.wholePizza.has(topping.id)
                : activeSelection === 'left'
                ? selectedToppings.leftSide.has(topping.id)
                : selectedToppings.rightSide.has(topping.id);

              return (
                <button
                  key={topping.id}
                  onClick={() => handleToppingToggle(topping)}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all hover:shadow-md",
                    isSelected
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="text-center">
                    <div className="font-medium text-sm mb-1">{topping.name}</div>
                    <div className="text-xs text-gray-600">
                      {topping.price > 0 ? `+$${topping.price.toFixed(2)}` : 'Included'}
                    </div>
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

              return (
                <button
                  key={sauce.id}
                  onClick={() => handleSauceToggle(sauce)}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all hover:shadow-md",
                    isSelected
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="text-center">
                    <div className="font-medium text-sm mb-1">{sauce.name}</div>
                    <div className="text-xs text-gray-600">
                      {sauce.price > 0 ? `+$${sauce.price.toFixed(2)}` : 'Included'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    } else if (step.type === 'drink' || step.type === 'side' || (step.type === 'pizza' && step.isSpecialty)) {
      return (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {step.availableSizes?.map(size => (
              <button
                key={size}
                onClick={() => handleSizeSelect(size)}
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
        case 'pizza':
          if (stepData.toppings) {
            const totalToppings = stepData.toppings.wholePizza?.length || 0;
            return `${totalToppings} toppings selected`;
          }
          return 'No toppings';
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

    return (
      <div className="w-80 bg-gray-50 border-l border-gray-200 p-6 overflow-y-auto">
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Combo Summary</h3>
          <div className="space-y-3">
            {steps.map((step, index) => {
              const status = getStepStatus(index);
              const summary = getStepSummary(index);
              const isClickable = index <= currentStep;

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
                        {step.type.charAt(0).toUpperCase() + step.type.slice(1)} {index + 1}
                      </div>
                      <div className="text-xs text-gray-600">{summary}</div>
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
              if (item?.extraCharge && item.extraCharge > 0) {
                return (
                  <div key={index} className="flex justify-between">
                    <span>{item.type.charAt(0).toUpperCase() + item.type.slice(1)} {index + 1}</span>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl h-[90vh] flex">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentStep > 0 && (
                <button
                  onClick={handleGoBack}
                  className="p-1.5 hover:bg-gray-100 rounded-full"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <div>
                <h2 className="text-xl font-bold">Customize {combo.name}</h2>
                <p className="text-sm text-gray-600">
                  Step {currentStep + 1} of {steps.length}: {step.type.charAt(0).toUpperCase() + step.type.slice(1)}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Step Content */}
          {renderCurrentStepContent()}

          {/* Footer */}
          <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {currentStep < steps.length - 1 ? 'Click Next to continue' : 'Review your selections'}
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleStepComplete}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
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
} 