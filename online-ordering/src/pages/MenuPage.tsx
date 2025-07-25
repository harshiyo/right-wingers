import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Package, Truck, Clock, Calendar, ShoppingCart, ChevronLeft, User, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import PizzaToppingDialog from '../components/PizzaToppingDialog';
import { cn } from '../utils/cn';
import ComboSelector from '../components/ComboSelector';
import { SizeSelectDialog } from '../components/SizeSelectDialog';
import { WingSauceDialog } from '../components/WingSauceDialog';

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

interface Sauce {
  id: string;
  name: string;
  price?: number;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  toppings?: ToppingSide;
  extraCharges?: number;
  isHalfAndHalf?: boolean;
  isCombo?: boolean;
  comboItems?: ComboItem[];
  size?: 'small' | 'medium' | 'large';
  sauces?: Sauce[];
  instructions?: string[];
}

interface ComboItem {
  id: string;
  name: string;
  quantity: number;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl: string;
  position: number;
  tileColor?: string;
  isCustomizable?: boolean;
  isSpecialtyPizza?: boolean;
  maxToppings?: number;
  maxSauces?: number;
  sizePricing?: {
    small: number;
    medium: number;
    large: number;
  };
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface ComboComponent {
  itemId: string;
  itemName: string;
  type: 'pizza' | 'wings' | 'side' | 'drink';
  quantity: number;
  maxToppings?: number;
  maxSauces?: number;
}

interface Combo {
  id: string;
  name: string;
  basePrice: number;
  description?: string;
  imageUrl?: string;
  position: number;
  components: ComboComponent[];
}

export default function MenuPage() {
  const navigate = useNavigate();
  const { customerInfo } = useCustomer();
  const { addToCart, getCartItemCount } = useCart();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPizza, setSelectedPizza] = useState<MenuItem | null>(null);
  const [selectedWing, setSelectedWing] = useState<MenuItem | null>(null);
  const [selectedSizeItem, setSelectedSizeItem] = useState<MenuItem | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<any>(null);
  const [isToppingDialogOpen, setIsToppingDialogOpen] = useState(false);
  const [isSizeDialogOpen, setIsSizeDialogOpen] = useState(false);
  const [isWingSauceDialogOpen, setIsWingSauceDialogOpen] = useState(false);
  const [showComboSelector, setShowComboSelector] = useState(false);
  const [orderDetails, setOrderDetails] = useState<{
    type: 'pickup' | 'delivery';
    pickupTime?: 'asap' | 'scheduled';
    scheduledDateTime?: string;
    deliveryAddress?: {
      street: string;
      city: string;
      postalCode: string;
    };
    customerInfo?: {
      fullName: string;
      phone: string;
    };
  } | null>(null);

  const handleBack = () => {
    navigate('/');
  };

  // Helper function to determine item type from name and category
  const getItemType = (item: MenuItem): 'pizza' | 'wings' | 'other' => {
    const name = item.name.toLowerCase();
    const category = item.category.toLowerCase();
    
    // Check both name and category for pizza
    if (name.includes('pizza') || category.includes('pizza')) return 'pizza';
    
    // Check both name and category for wings
    if (name.includes('wing') || category.includes('wing')) return 'wings';
    
    return 'other';
  };

  useEffect(() => {
    // Get order details from sessionStorage
    const orderType = sessionStorage.getItem('orderType');
    if (!orderType) {
      navigate('/');
      return;
    }

    const details: any = { type: orderType };
    if (orderType === 'pickup') {
      details.pickupTime = sessionStorage.getItem('pickupTime') || 'asap';
      details.scheduledDateTime = sessionStorage.getItem('scheduledDateTime');
    } else {
      const deliveryAddress = sessionStorage.getItem('deliveryAddress');
      if (deliveryAddress) {
        details.deliveryAddress = JSON.parse(deliveryAddress);
      }
    }

    // Get customer info
    const customerInfo = sessionStorage.getItem('customerInfo');
    if (customerInfo) {
      details.customerInfo = JSON.parse(customerInfo);
    }

    setOrderDetails(details);

    // Fetch menu data
    const fetchData = async () => {
      try {
        // Fetch categories
        const categoriesQuery = query(collection(db, 'categories'), orderBy('name'));
        const categoriesSnapshot = await getDocs(categoriesQuery);
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Category));

        // Add Combos category
        const combosCategory = {
          id: 'combos',
          name: 'Combos',
          icon: '🎁'
        };
        setCategories([combosCategory, ...categoriesData]);

        // Fetch menu items
        const menuItemsRef = collection(db, 'menuItems');
        const menuItemsQuery = query(menuItemsRef, orderBy('position'));
        const menuItemsSnapshot = await getDocs(menuItemsQuery);
        const menuItemsData = menuItemsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            isCustomizable: data.isCustomizable || false,
            isSpecialtyPizza: data.isSpecialtyPizza || false
          } as MenuItem;
        });
        setMenuItems(menuItemsData);

        // Fetch combos
        const combosRef = collection(db, 'combos');
        const combosQuery = query(combosRef);
        const combosSnapshot = await getDocs(combosQuery);
        
        const combosData = combosSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            basePrice: data.basePrice,
            description: data.description,
            imageUrl: data.imageUrl,
            position: data.position || 0,
            components: data.components || []
          } as Combo;
        });
        setCombos(combosData);

        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Update filtered items
  const filteredItems = (() => {
    if (selectedCategory === 'combos') {
      return combos;
    } else if (selectedCategory) {
      // Find the category name by ID
      const category = categories.find(cat => cat.id === selectedCategory);
      if (!category) return [];
      
      const filtered = menuItems.filter(item => item.category === category.name);
      return filtered;
    } else {
      const allItems = [...menuItems, ...combos];
      return allItems;
    }
  })();

  const renderMenuItem = (item: MenuItem) => (
    <div
      key={item.id}
      onClick={() => handleAddToCart(item)}
      className="card-ux p-5 mb-6 overflow-hidden transition-all duration-200 hover:shadow-xl hover:scale-[1.02] cursor-pointer"
    >
      <div className="relative">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-40 sm:h-48 object-cover"
          />
        ) : (
          <div className="w-full h-40 sm:h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <span className="text-4xl">🍕</span>
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {item.isCustomizable && (
            <span className="bg-gradient-to-r from-red-600 to-red-700 text-white text-xs px-3 py-1 rounded-full font-medium shadow-lg">
              Customizable
            </span>
          )}
          {item.sizePricing && (
            <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs px-3 py-1 rounded-full font-medium shadow-lg">
              Multiple Sizes
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-gray-900 mb-1 text-sm sm:text-base line-clamp-2">{item.name}</h3>
        
        {item.description && (
          <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-red-600">
              {item.sizePricing ? (
                `$${Math.min(...Object.values(item.sizePricing)).toFixed(2)}+`
              ) : (
                `$${item.price.toFixed(2)}`
              )}
            </span>
            {item.sizePricing && (
              <span className="text-xs text-gray-500">starting</span>
            )}
          </div>

          {/* Category indicator */}
          <div className={cn(
            "w-3 h-3 rounded-full",
            item.category === "Pizza" ? "bg-red-500" :
            item.category === "Wings" ? "bg-orange-500" :
            item.category === "Sides" ? "bg-yellow-500" :
            item.category === "Drinks" ? "bg-blue-500" :
            "bg-gray-500"
          )}></div>
        </div>
      </div>
    </div>
  );

  const handleAddToCart = (item: MenuItem | Combo) => {
    // Handle combos separately
    if ('components' in item) {
      setSelectedCombo({
        comboId: item.id,
        name: item.name,
        imageUrl: item.imageUrl,
        items: item.components.map(comp => ({
          type: comp.type,
          stepIndex: 0,
          quantity: comp.quantity,
          toppingLimit: comp.maxToppings,
          sauceLimit: comp.maxSauces,
          itemName: comp.itemName
        })),
        price: item.basePrice,
        isEditing: false
      });
      setShowComboSelector(true);
      return;
    }

    // Cast item to MenuItem to access properties
    const menuItem = item as MenuItem;
    const itemType = getItemType(menuItem);

    // Handle different item types
    if (itemType === 'pizza') {
      // For pizzas, check if it's specialty or customizable
      if (menuItem.isSpecialtyPizza && !menuItem.isCustomizable) {
        // Specialty pizza: show size selection only
        setSelectedPizza(menuItem);
        setIsSizeDialogOpen(true);
      } else if (menuItem.isCustomizable) {
        // Customizable pizza: go to topping selection
        setSelectedPizza(menuItem);
        setIsToppingDialogOpen(true);
      } else {
        // Regular pizza: show size selection
        setSelectedPizza(menuItem);
        setIsSizeDialogOpen(true);
      }
    } else if (itemType === 'wings' && menuItem.isCustomizable) {
      // Customizable wings: show wing customization dialog
      setSelectedWing(menuItem);
      setIsWingSauceDialogOpen(true);
    } else if (menuItem.sizePricing) {
      // Items with size pricing (sides, drinks, etc.): show size selection
      setSelectedSizeItem(menuItem);
      setIsSizeDialogOpen(true);
    } else {
      // Regular items: add directly to cart
      addToCart({
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 1,
        imageUrl: menuItem.imageUrl
      });
    }
  };

  const handleToppingSelection = (result: { toppings: any; extraCharge: number; isHalfAndHalf: boolean }) => {
    if (!selectedPizza) return;

    addToCart({
      id: selectedPizza.id,
      name: selectedPizza.name,
      price: selectedPizza.price,
      quantity: 1,
      imageUrl: selectedPizza.imageUrl,
      toppings: result.toppings,
      extraCharges: result.extraCharge,
      isHalfAndHalf: result.isHalfAndHalf
    });

    setIsToppingDialogOpen(false);
    setSelectedPizza(null);
  };

  const handleSizeSelection = (size: string) => {
    const item = selectedPizza || selectedSizeItem;
    if (!item?.sizePricing) return;
    
    const sizeKey = size.toLowerCase();
    const sizePrice = item.sizePricing[sizeKey as keyof typeof item.sizePricing];
    if (sizePrice === undefined) return;

    // For pizzas that need topping customization
    if (item.category === 'Pizza' && item.isCustomizable) {
      setIsSizeDialogOpen(false);
      setIsToppingDialogOpen(true);
      return;
    }

    const cartItem: CartItem = {
      id: item.id,
      name: item.name,
      price: sizePrice,
      quantity: 1,
      imageUrl: item.imageUrl,
      size: sizeKey as 'small' | 'medium' | 'large'
    };

    addToCart(cartItem);
    setIsSizeDialogOpen(false);
    setSelectedPizza(null);
    setSelectedSizeItem(null);
  };

  const handleComboSubmit = (customizedCombo: any) => {
    const comboItem = {
      id: customizedCombo.isEditing ? customizedCombo.editingItemId : customizedCombo.comboId + '-' + Date.now(),
      name: customizedCombo.name,
      price: parseFloat(customizedCombo.price.toFixed(2)),
      quantity: 1,
      imageUrl: customizedCombo.imageUrl || '',
      isCombo: true,
      comboItems: customizedCombo.items.map((item: any) => ({
        id: item.id || item.type,
        name: item.itemName || item.type,
        quantity: 1,
        size: item.size,
        sauces: item.sauces,
        toppings: item.toppings,
        isHalfAndHalf: item.isHalfAndHalf,
        instructions: item.instructions,
        extraCharges: parseFloat((item.extraCharge || 0).toFixed(2))
      })),
      extraCharges: parseFloat((customizedCombo.extraCharges || 0).toFixed(2))
    };

    addToCart(comboItem);
    setShowComboSelector(false);
    setSelectedCombo(null);
  };

  const handleWingSauceSelection = (result: { type: string; sauces: Sauce[]; size: string; extraCharge: number; sauceLimit: number; instructions?: string[] }) => {
    if (!selectedWing) return;
    
    const cartItem: CartItem = {
      id: selectedWing.id,
      name: selectedWing.name,
      price: selectedWing.price,
      quantity: 1,
      imageUrl: selectedWing.imageUrl,
      extraCharges: result.extraCharge,
      sauces: result.sauces,
      instructions: result.instructions
    };

    addToCart(cartItem);
    setIsWingSauceDialogOpen(false);
    setSelectedWing(null);
  };

  const renderComboItem = (combo: Combo) => (
    <div
      key={combo.id}
      onClick={() => handleAddToCart(combo)}
      className="card-ux p-5 mb-6 overflow-hidden transition-all duration-200 hover:shadow-xl hover:scale-[1.02] cursor-pointer"
    >
      <div className="relative">
        {combo.imageUrl ? (
          <img
            src={combo.imageUrl}
            alt={combo.name}
            className="w-full h-40 sm:h-48 object-cover"
          />
        ) : (
          <div className="w-full h-40 sm:h-48 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
            <span className="text-4xl">🎁</span>
          </div>
        )}
        
        <div className="absolute top-3 right-3">
          <span className="bg-gradient-to-r from-yellow-600 to-amber-600 text-white text-xs px-3 py-1 rounded-full font-medium shadow-lg">
            Combo Deal
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-gray-900 mb-2 text-sm sm:text-base">{combo.name}</h3>
        
        <div className="space-y-1 mb-3">
          {combo.components.slice(0, 3).map((comp, idx) => (
            <div key={idx} className="text-xs text-gray-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
              {comp.quantity}x {comp.itemName}
            </div>
          ))}
          {combo.components.length > 3 && (
            <div className="text-xs text-gray-500">
              +{combo.components.length - 3} more items
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-red-600">
            ${combo.basePrice.toFixed(2)}
          </span>
          <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading delicious menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Categories */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all duration-200",
                !selectedCategory
                  ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg"
                  : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
              )}
            >
              All
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2",
                  selectedCategory === category.id
                    ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg"
                    : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
                )}
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          {loading ? (
            <div>Loading...</div>
          ) : (
            <>
              {filteredItems.map(item => 
                'components' in item ? renderComboItem(item) : renderMenuItem(item)
              )}
            </>
          )}
        </div>
      </div>

      {/* Add debug display in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-xs overflow-auto max-h-48">
          <p>Selected Category: {selectedCategory || 'All'}</p>
          <p>Combos Count: {combos.length}</p>
          <p>Menu Items Count: {menuItems.length}</p>
          <p>Current Category: {selectedCategory}</p>
        </div>
      )}

      {/* Dialogs */}
      {selectedPizza && isToppingDialogOpen && (
        <PizzaToppingDialog
          isOpen={true}
          onClose={() => {
            setIsToppingDialogOpen(false);
            setSelectedPizza(null);
          }}
          onSubmit={handleToppingSelection}
          pizzaName={selectedPizza.name}
          toppingLimit={selectedPizza.maxToppings || 4}
        />
      )}

      {(selectedPizza || selectedSizeItem) && isSizeDialogOpen && (
        <SizeSelectDialog
          open={true}
          onClose={() => {
            setIsSizeDialogOpen(false);
            setSelectedPizza(null);
            setSelectedSizeItem(null);
          }}
          onSubmit={handleSizeSelection}
          itemName={(selectedPizza || selectedSizeItem)!.name}
          availableSizes={Object.keys((selectedPizza || selectedSizeItem)!.sizePricing!).map(size => 
            size.charAt(0).toUpperCase() + size.slice(1)
          )}
          defaultSize="medium"
          sizePricing={(selectedPizza || selectedSizeItem)!.sizePricing!}
        />
      )}

      {selectedWing && isWingSauceDialogOpen && (
        <WingSauceDialog
          open={true}
          onClose={() => {
            setIsWingSauceDialogOpen(false);
            setSelectedWing(null);
          }}
          onSubmit={handleWingSauceSelection}
          wingName={selectedWing.name}
          sauceLimit={selectedWing.maxSauces || 1}
        />
      )}

      {selectedCombo && showComboSelector && (
        <ComboSelector
          isOpen={true}
          combo={selectedCombo}
          onClose={() => {
            setShowComboSelector(false);
            setSelectedCombo(null);
          }}
          onSubmit={handleComboSubmit}
        />
      )}
    </div>
  );
} 