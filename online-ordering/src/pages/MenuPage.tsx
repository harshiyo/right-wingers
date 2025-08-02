import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Package, Truck, Clock, Calendar, ShoppingCart, ChevronLeft, User, X, Star, Flame, Zap, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import PizzaToppingDialog from '../components/PizzaToppingDialog';
import { cn } from '../utils/cn';
import { ComboSelector } from '../components/ComboSelector';
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
  type: 'pizza' | 'wings' | 'side' | 'drink' | 'dipping';
  quantity: number;
  maxToppings?: number;
  maxSauces?: number;
  maxDipping?: number;
  availableSizes?: string[];
  defaultSize?: string;
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
      className="group relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer overflow-hidden border border-gray-100 h-full flex flex-col"
    >
      {/* Image Container */}
      <div className="relative h-32 sm:h-40 overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
            <span className="text-4xl sm:text-5xl opacity-60">🍕</span>
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
        
        {/* Badges - Mobile optimized */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {item.isCustomizable && (
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs px-2 py-1 rounded-full font-semibold shadow-lg flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" />
              <span className="hidden sm:inline">Custom</span>
            </div>
          )}
          {item.sizePricing && (
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white text-xs px-2 py-1 rounded-full font-semibold shadow-lg flex items-center gap-1">
              <Package className="w-2.5 h-2.5" />
              <span className="hidden sm:inline">Sizes</span>
            </div>
          )}
          {item.isSpecialtyPizza && (
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white text-xs px-2 py-1 rounded-full font-semibold shadow-lg flex items-center gap-1">
              <Star className="w-2.5 h-2.5" />
              <span className="hidden sm:inline">Specialty</span>
            </div>
          )}
        </div>

        {/* Category indicator */}
        <div className="absolute bottom-2 left-2">
          <div className={cn(
            "px-2 py-1 rounded-full text-xs font-semibold text-white shadow-lg",
            item.category === "Pizza" ? "bg-gradient-to-r from-red-600 to-red-700" :
            item.category === "Wings" ? "bg-gradient-to-r from-orange-600 to-orange-700" :
            item.category === "Sides" ? "bg-gradient-to-r from-yellow-600 to-yellow-700" :
            item.category === "Drinks" ? "bg-gradient-to-r from-blue-600 to-blue-700" :
            "bg-gradient-to-r from-gray-600 to-gray-700"
          )}>
            {item.category}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base leading-tight line-clamp-2 flex-1">{item.name}</h3>
        
        {item.description && (
          <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 line-clamp-2 leading-relaxed flex-1">{item.description}</p>
        )}
        
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-lg sm:text-xl font-bold text-red-600">
              {item.sizePricing ? (
                `$${Math.min(...Object.values(item.sizePricing)).toFixed(2)}+`
              ) : (
                `$${item.price.toFixed(2)}`
              )}
            </span>
            {item.sizePricing && (
              <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">start</span>
            )}
          </div>

          {/* Add to cart button */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-1.5 sm:p-2 rounded-full shadow-lg group-hover:scale-110 transition-transform duration-200">
            <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
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
        items: item.components.map((comp, index) => ({
          type: comp.type,
          stepIndex: index,
          quantity: comp.quantity,
          toppingLimit: comp.maxToppings,
          sauceLimit: comp.maxSauces,
          maxDipping: comp.maxDipping,
          itemName: comp.itemName,
          itemId: comp.itemId, // Preserve itemId for pizza pricing lookups
          availableSizes: comp.availableSizes,
          pizzaItem: item // Pass the pizza item data for flat rate pricing
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

  const handleToppingSelection = (result: { toppings: any; extraCharge: number; isHalfAndHalf: boolean; type: string; size?: string }) => {
    if (!selectedPizza) return;

    addToCart({
      id: `${selectedPizza.id}-${Date.now()}`,
      baseId: selectedPizza.id,
      name: selectedPizza.name,
      price: selectedPizza.price,
      quantity: 1,
      imageUrl: selectedPizza.imageUrl,
      customizations: {
        type: result.type,
        size: result.size,
        toppings: result.toppings,
        isHalfAndHalf: result.isHalfAndHalf,
        instructions: []
      },
      extraCharges: result.extraCharge
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
      id: `${item.id}-${sizeKey}-${Date.now()}`,
      baseId: item.id,
      name: item.name,
      price: sizePrice,
      quantity: 1,
      imageUrl: item.imageUrl,
      customizations: {
        type: item.category === 'Pizza' ? 'pizza' : 'item',
        size: sizeKey
      }
    };

    addToCart(cartItem);
    setIsSizeDialogOpen(false);
    setSelectedPizza(null);
    setSelectedSizeItem(null);
  };

  const handleComboSubmit = (customizedCombo: any) => {
    const comboItem = {
      id: customizedCombo.isEditing ? customizedCombo.editingItemId : customizedCombo.comboId + '-' + Date.now(),
      baseId: customizedCombo.comboId,
      name: customizedCombo.name,
      price: parseFloat(customizedCombo.price.toFixed(2)),
      quantity: 1,
      imageUrl: customizedCombo.imageUrl || '',
      customizations: customizedCombo.items,  // Use same structure as POS client
      extraCharges: parseFloat((customizedCombo.extraCharges || 0).toFixed(2)),
      isCombo: true,
    };
    
    addToCart(comboItem);
    setShowComboSelector(false);
    setSelectedCombo(null);
  };

  const handleWingSauceSelection = (result: { type: string; sauces: Sauce[]; size: string; extraCharge: number; sauceLimit: number; instructions?: string[] }) => {
    if (!selectedWing) return;
    
    const cartItem: CartItem = {
      id: `${selectedWing.id}-${Date.now()}`,
      baseId: selectedWing.id,
      name: selectedWing.name,
      price: selectedWing.price,
      quantity: 1,
      imageUrl: selectedWing.imageUrl,
      customizations: {
        type: result.type,
        sauces: result.sauces,
        instructions: result.instructions || []
      },
      extraCharges: result.extraCharge
    };

    addToCart(cartItem);
    setIsWingSauceDialogOpen(false);
    setSelectedWing(null);
  };

  const renderComboItem = (combo: Combo) => (
    <div
      key={combo.id}
      onClick={() => handleAddToCart(combo)}
      className="group relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer overflow-hidden border border-gray-100 h-full flex flex-col"
    >
      {/* Image Container */}
      <div className="relative h-32 sm:h-40 overflow-hidden">
        {combo.imageUrl ? (
          <img
            src={combo.imageUrl}
            alt={combo.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
            <span className="text-4xl sm:text-5xl opacity-60">🎁</span>
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
        
        {/* Combo badge */}
        <div className="absolute top-2 right-2">
          <div className="bg-gradient-to-r from-yellow-600 to-amber-600 text-white text-xs px-2 py-1 rounded-full font-semibold shadow-lg flex items-center gap-1">
            <Flame className="w-2.5 h-2.5" />
            <span className="hidden sm:inline">Combo</span>
          </div>
        </div>

        {/* Category indicator */}
        <div className="absolute bottom-2 left-2">
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-2 py-1 rounded-full text-xs font-semibold text-white shadow-lg">
            Combo
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base leading-tight flex-1">{combo.name}</h3>
        
        <div className="space-y-1 sm:space-y-2 mb-2 sm:mb-3 flex-1">
          {combo.components.slice(0, 2).map((comp, idx) => (
            <div key={idx} className="text-xs sm:text-sm text-gray-600 flex items-center gap-1 sm:gap-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-500 rounded-full flex-shrink-0"></div>
              <span className="line-clamp-1">{comp.quantity}x {comp.itemName}</span>
            </div>
          ))}
          {combo.components.length > 2 && (
            <div className="text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded-full inline-block">
              +{combo.components.length - 2} more
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto">
          <span className="text-lg sm:text-xl font-bold text-red-600">
            ${combo.basePrice.toFixed(2)}
          </span>

          {/* Add to cart button */}
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-1.5 sm:p-2 rounded-full shadow-lg group-hover:scale-110 transition-transform duration-200">
            <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-200 border-t-red-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">🍕</span>
            </div>
          </div>
          <p className="mt-6 text-gray-600 font-medium text-lg">Loading delicious menu...</p>
          <p className="mt-2 text-gray-500 text-sm">Preparing your perfect pizza experience</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-amber-50">
      {/* Enhanced Categories Navigation - Mobile Optimized */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-semibold whitespace-nowrap transition-all duration-300 flex items-center gap-1 sm:gap-2 shadow-lg text-sm sm:text-base",
                !selectedCategory
                  ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-red-200"
                  : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:shadow-md"
              )}
            >
              <span className="text-base sm:text-lg">🍽️</span>
              <span className="hidden sm:inline">All Menu</span>
              <span className="sm:hidden">All</span>
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-semibold whitespace-nowrap transition-all duration-300 flex items-center gap-1 sm:gap-2 shadow-lg text-sm sm:text-base",
                  selectedCategory === category.id
                    ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-red-200"
                    : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:shadow-md"
                )}
              >
                <span className="text-base sm:text-lg">{category.icon}</span>
                <span className="hidden sm:inline">{category.name}</span>
                <span className="sm:hidden">{category.name.length > 8 ? category.name.substring(0, 8) + '...' : category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Grid - Mobile Responsive */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🍕</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-600">Try selecting a different category or check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {filteredItems.map(item => 
              'components' in item ? renderComboItem(item) : renderMenuItem(item)
            )}
          </div>
        )}
      </div>

      {/* Floating Cart Button - Mobile Optimized */}
      <div className="fixed bottom-4 right-4 z-30">
        <button
          onClick={() => navigate('/cart')}
          className="bg-gradient-to-r from-red-600 to-red-700 text-white p-3 sm:p-4 rounded-full shadow-2xl hover:shadow-red-200 transition-all duration-300 hover:scale-110"
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
            {getCartItemCount() > 0 && (
              <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-white text-red-600 text-xs w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center font-bold shadow-lg">
                {getCartItemCount()}
              </span>
            )}
          </div>
        </button>
      </div>

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
          pizzaItem={selectedPizza} // Pass the full pizza item for pricing data
          toppingLimit={selectedPizza.maxToppings || 3}
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
          open={true}
          combo={selectedCombo}
          onClose={() => {
            setShowComboSelector(false);
            setSelectedCombo(null);
          }}
          onComplete={handleComboSubmit}
        />
      )}
    </div>
  );
} 