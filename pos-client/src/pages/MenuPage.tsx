import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCollection, useDocument } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';
import { TopBar } from '../components/layout/TopBar';
import { ShoppingCart, Trash2, Search } from 'lucide-react';
import { ItemCustomizationDialog } from '../components/ItemCustomizationDialog';
import { ComboSelector } from '../components/ComboSelector';
import { PizzaToppingDialog } from '../components/PizzaToppingDialog';
import { WingSauceDialog } from '../components/WingSauceDialog';
import { SizeSelectDialog } from '../components/SizeSelectDialog';
import { useCart } from '../context/CartContext';
import { Customer } from '../data/customers';

interface Category {
  id: string;
  name: string;
  icon: string; // Emoji
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl: string;
  position: number;
  tileColor?: string;
  isCustomizable?: boolean;
  maxToppings?: number;
  maxSauces?: number;
  isSpecialtyPizza?: boolean;
  sizePricing?: {
    small: number;
    medium: number;
    large: number;
  };
}

interface Combo {
  id: string;
  name: string;
  basePrice: number;
  description?: string;
  imageUrl?: string;
  components: ComboComponent[];
}

interface ComboComponent {
  type: 'pizza' | 'wings' | 'side' | 'drink' | 'dipping';
  itemId: string;
  itemName: string;
  quantity: number;
  maxToppings?: number;
  maxSauces?: number;
  maxDipping?: number;
}

interface CartItem {
  id: string;
  baseId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  customizations?: any;
  extraCharges?: number;
  isCombo?: boolean;
}

interface InstructionTile {
  id: string;
  label: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
}

const CategorySidebar = ({
  categories,
  selectedCategory,
  onSelectCategory,
  loading,
}: {
  categories: Category[];
  selectedCategory: Category | null;
  onSelectCategory: (category: Category) => void;
  loading: boolean;
}) => (
        <aside className="w-[240px] bg-white/90 backdrop-blur-sm p-4 flex flex-col shadow-lg border-r border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 px-4 mb-4">Menu Categories</h2>
    <div className="flex flex-col space-y-2">
      {loading ? (
        <p className="px-4">Loading...</p>
      ) : (
        categories.map(category => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category)}
            className={cn(
              "flex items-center p-3 rounded-xl font-semibold transition-colors duration-200",
              {
                "bg-brand-primary text-brand-primary-text": selectedCategory?.id === category.id,
                "hover:bg-brand-secondary/50": selectedCategory?.id !== category.id,
              }
            )}
          >
            <span className="mr-4 text-2xl">{category.icon}</span>
            <span className="text-base">{category.name}</span>
          </button>
        ))
      )}
    </div>
  </aside>
);

const MenuItemGrid = ({
  items,
  onAddToCart,
  loading,
  gridColumns = 4,
}: {
  items: (MenuItem | Combo)[];
  onAddToCart: (item: MenuItem | Combo) => void;
  loading: boolean;
  gridColumns?: number;
}) => {
  const gridClasses: { [key: number]: string } = {
    2: 'sm:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
  };

  const gridClass = `grid-cols-1 ${gridClasses[gridColumns] || 'lg:grid-cols-4'}`;

  return (
    <main className={cn("flex-1 p-6 grid gap-6 overflow-y-auto self-start", gridClass)}>
      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p>No items in this category.</p>
      ) : (
        items.map(item =>
          'basePrice' in item ? (
            // Combo card
            <div
              key={item.id}
              onClick={() => onAddToCart(item)}
              className="group rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden cursor-pointer border-2 border-yellow-200 hover:border-yellow-300"
            >
              <div className="relative p-6 pb-4 flex flex-col items-center">
                {/* Circular Image or Combo Icon */}
                <div className="relative mb-4">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-yellow-200 group-hover:border-yellow-300 transition-colors duration-300 bg-white">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-yellow-100 to-orange-100">
                        🎁
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Content */}
                <div className="text-center flex-1 w-full">
                  <h3 className="font-semibold text-lg text-gray-800 mb-1 line-clamp-2">{item.name}</h3>
                  {item.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-1">{item.description}</p>
                  )}
                  <p className="text-2xl font-bold text-orange-600 mb-2">${item.basePrice.toFixed(2)}</p>
                  
                  {/* Components preview */}
                  <div className="text-xs text-gray-500 space-y-1">
                    {item.components.slice(0, 2).map((comp, idx) => (
                      <div key={idx} className="flex items-center justify-center gap-1">
                        <span>{comp.quantity}x {comp.itemName}</span>
                      </div>
                    ))}
                    {item.components.length > 2 && (
                      <div className="text-gray-400">+{item.components.length - 2} more items</div>
                    )}
                  </div>
                </div>

                {/* Hover effect overlay */}
                <div className="absolute inset-0 bg-orange-50 opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-xl"></div>
                
                {/* Combo badge */}
                <div className="absolute top-3 left-3 bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                  Combo Deal
                </div>
              </div>
            </div>
          ) : (
            // Regular menu item card
            <div
              key={item.id}
              onClick={() => onAddToCart(item)}
              className="group rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
              style={{
                backgroundColor: item.tileColor || '#ffffff',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div className="relative p-6 flex flex-col items-center h-full">
                {/* Circular Image */}
                <div className="relative mb-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white border-opacity-80 shadow-lg">
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                    />
                  </div>
                </div>
                
                {/* Content */}
                <div className="text-center flex-1 w-full flex flex-col">
                  {/* Title - fixed height */}
                  <div className="h-12 flex items-center justify-center mb-2">
                    <h3 className="font-bold text-lg text-white line-clamp-2 drop-shadow-md">{item.name}</h3>
                  </div>
                  
                  {/* Price */}
                  <p className="text-2xl font-bold text-white mb-4 drop-shadow-md">
                    {(item.isSpecialtyPizza && item.sizePricing) || (item.sizePricing && !item.isSpecialtyPizza) ? 
                      `Starting from $${item.sizePricing.small.toFixed(2)}` : 
                      `$${item.price.toFixed(2)}`
                    }
                  </p>
                  
                  {/* Spacer to push badge to bottom */}
                  <div className="flex-1"></div>
                  
                  {/* Customizable badge - fixed position at bottom */}
                  <div className="h-8 flex items-center justify-center">
                    {(item.isCustomizable || (item.sizePricing && !item.isSpecialtyPizza)) && (
                      <div className="inline-flex items-center justify-center bg-gray-900 bg-opacity-80 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-md">
                        {item.sizePricing && !item.isSpecialtyPizza ? 'Size Options' : 'Customizable'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Hover effect overlay */}
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-xl"></div>
              </div>
            </div>
          )
        )
      )}
    </main>
  );
};

const CartPanel = ({
  cartItems,
  onRemoveItem,
  onEditItem,
  onCheckout,
}: {
  cartItems: CartItem[];
  onRemoveItem: (itemId: string) => void;
  onEditItem: (item: CartItem) => void;
  onCheckout: () => void;
}) => {
  // Fetch instruction tiles for converting IDs to labels
  const [pizzaInstructionTiles] = useCollection(
    query(collection(db, 'pizzaInstructions'), orderBy('sortOrder'))
  );
  const [wingInstructionTiles] = useCollection(
    query(collection(db, 'wingInstructions'), orderBy('sortOrder'))
  );

  const getPizzaInstructionLabels = (instructionIds: string[]): string[] => {
    if (!pizzaInstructionTiles) return instructionIds;
    const tiles = pizzaInstructionTiles.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as InstructionTile))
      .filter(tile => tile.isActive);
    return instructionIds.map(id => {
      const tile = tiles.find(t => t.id === id);
      return tile ? tile.label : id;
    });
  };

  const getWingInstructionLabels = (instructionIds: string[]): string[] => {
    if (!wingInstructionTiles) return instructionIds;
    const tiles = wingInstructionTiles.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as InstructionTile))
      .filter(tile => tile.isActive);
    return instructionIds.map(id => {
      const tile = tiles.find(t => t.id === id);
      return tile ? tile.label : id;
    });
  };

  const subtotal = cartItems.reduce((sum, item) => {
    const itemTotal = (item.price + (item.extraCharges || 0)) * item.quantity;
    //console.log(`🛒 CART SUBTOTAL DEBUG: ${item.name} - Price: $${item.price}, Extra: $${item.extraCharges || 0}, Qty: ${item.quantity}, Total: $${itemTotal}`);
    return sum + itemTotal;
  }, 0);
  const tax = subtotal * 0.13;
  const total = subtotal + tax;

  return (
            <aside className="w-[400px] bg-white/90 backdrop-blur-sm p-4 flex flex-col shadow-lg border-l border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingCart className="h-6 w-6" />
        <h2 className="text-xl font-bold">Current Order</h2>
      </div>
                <div className="flex-1 flex flex-col text-center text-gray-500 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
        {cartItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p>Your cart is empty.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cartItems.map(item => (
              <div key={item.id} className="flex items-start gap-4 text-left p-3 bg-white rounded-lg shadow-sm border-2 border-red-700">
                <img src={item.imageUrl} alt={item.name} className="w-20 h-20 object-cover rounded-md" />
                <div className="flex-1">
                                  <h4 className="font-bold text-gray-900">{item.name}</h4>
                <p className="font-semibold text-sm text-gray-900 mt-2">
                    ${Number(item.extraCharges) > 0 
                      ? (Number(item.price) + Number(item.extraCharges)).toFixed(2)
                      : parseFloat(Number(item.price).toString()).toFixed(2)}
                    {Number(item.extraCharges) > 0 && (
                      <span className="text-xs text-gray-500 ml-1">
                        (${Number(item.price).toFixed(2)} + ${Number(item.extraCharges).toFixed(2)})
                      </span>
                    )}
                  </p>
                  
                  {/* Show extra charges only if > 0 */}
                  {Number(item.extraCharges) > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <span className="text-orange-600 font-medium text-xs">
                        Total extras: +${Number(item.extraCharges).toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  {/* Individual Item Customizations */}
                  {!item.isCombo && item.customizations && (
                    <div className="mt-2 text-xs text-gray-700 space-y-1">
                      {/* Pizza customizations */}
                      {(item.customizations.type === 'pizza' || item.customizations.size) && (
                        <div>
                          {/* Size display */}
                          {item.customizations.size && (
                            <div className="mb-1">
                              <span className="text-xs font-medium text-green-600">Size: {item.customizations.size}</span>
                            </div>
                          )}
                          {item.customizations.toppings && (
                            <div className="space-y-1">
                              {/* Whole pizza toppings */}
                              {item.customizations.toppings.wholePizza && item.customizations.toppings.wholePizza.length > 0 && (
                                <div>
                                  <span className="text-xs font-medium text-gray-600">Toppings</span>
                                  <div className="text-xs text-gray-700">
                                    {item.customizations.toppings.wholePizza.map((t: any) => t.name).join(', ')}
                                  </div>
                                </div>
                              )}
                              {/* Left side */}
                              {item.customizations.toppings.leftSide && item.customizations.toppings.leftSide.length > 0 && (
                                <div>
                                  <span className="text-xs font-medium text-blue-600">Left Side</span>
                                  <div className="text-xs text-gray-700">
                                    {item.customizations.toppings.leftSide.map((t: any) => t.name).join(', ')}
                                  </div>
                                </div>
                              )}
                              {/* Right side */}
                              {item.customizations.toppings.rightSide && item.customizations.toppings.rightSide.length > 0 && (
                                <div>
                                  <span className="text-xs font-medium text-blue-600">Right Side</span>
                                  <div className="text-xs text-gray-700">
                                    {item.customizations.toppings.rightSide.map((t: any) => t.name).join(', ')}
                                  </div>
                                </div>
                              )}
                              {/* Half and half indicator */}
                              {item.customizations.isHalfAndHalf && (
                                <div className="text-blue-600 text-xs font-medium">Half & Half Pizza</div>
                              )}
                            </div>
                          )}
                          {/* Pizza instructions */}
                          {item.customizations.instructions && item.customizations.instructions.length > 0 && (
                            <div className="mt-1">
                              <span className="text-xs font-medium text-purple-600">Instructions</span>
                              <div className="text-xs text-gray-700">
                                {getPizzaInstructionLabels(item.customizations.instructions).join(', ')}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Wing customizations */}
                      {item.customizations.type === 'wings' && (
                        <div>
                          {item.customizations.sauces && item.customizations.sauces.length > 0 && (
                            <div>
                              <span className="text-xs font-medium text-gray-600">Sauces</span>
                              <div className="text-xs text-gray-700">
                                {item.customizations.sauces.map((s: any) => s.name).join(', ')}
                              </div>
                            </div>
                          )}
                          {/* Wing instructions */}
                          {item.customizations.instructions && item.customizations.instructions.length > 0 && (
                            <div className="mt-1">
                              <span className="text-xs font-medium text-purple-600">Instructions</span>
                              <div className="text-xs text-gray-700">
                                {getWingInstructionLabels(item.customizations.instructions).join(', ')}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Extra charges display */}
                      {Number(item.extraCharges) > 0 && (
                        <div className="mt-1">
                          <span className="text-xs font-medium text-orange-600">Extra Charges: +${Number(item.extraCharges).toFixed(2)}</span>
                        </div>
                      )}
                      
                      {/* Reordered item customizations */}
                      {item.customizations.isReorder && item.customizations.displayCustomizations && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-blue-600">Reordered Item</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.customizations.displayCustomizations
                              .filter((customization: any) => typeof customization === 'string' && customization.trim())
                              .slice(0, 6)
                              .map((customization: string, idx: number) => (
                              <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                {customization}
                              </span>
                            ))}
                            {item.customizations.displayCustomizations.length > 6 && (
                              <span className="text-blue-600 text-xs">
                                +{item.customizations.displayCustomizations.length - 6} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Combo details */}
                  {item.isCombo && Array.isArray(item.customizations) && item.customizations.length > 0 && (
                    <div className="mt-2 text-xs text-gray-700 space-y-1">
                      {(() => {
                        const customizationsArr = item.customizations;
                        const typeOrder = { pizza: 1, wings: 2, side: 3, drink: 4, dipping: 5 };
                        const sortedCustomizations = [...customizationsArr].sort((a, b) => 
                          (typeOrder[a.type as keyof typeof typeOrder] || 5) - (typeOrder[b.type as keyof typeof typeOrder] || 5)
                        );
                        if (!sortedCustomizations.length) {
                          return <div className="text-xs italic text-gray-400">No combo customizations found.</div>;
                        }
                        let pizzaCount = 0;
                        return sortedCustomizations.map((step, idx) => (
                          <div key={idx} className="mb-2">
                            <div className="font-semibold text-gray-800 mb-1">
                              {step.type === 'pizza' && (
                                <>
                                  Pizza {++pizzaCount}
                                  {step.isHalfAndHalf && <span className="text-blue-600 text-xs ml-1">(Half & Half)</span>}
                                  {step.size && <span className="text-green-600 text-xs ml-1">({step.size})</span>}
                                </>
                              )}
                              {step.type === 'wings' && (
                                <>
                                  Wings {step.size && <span className="text-green-600 text-xs ml-1">({step.size})</span>}
                                </>
                              )}
                              {step.type === 'side' && (
                                <>{step.itemName || 'Side'} {step.size && <span className="text-green-600 text-xs ml-1">({step.size})</span>}</>
                              )}
                              {step.type === 'drink' && (
                                <>{step.itemName || 'Drink'} {step.size && <span className="text-green-600 text-xs ml-1">({step.size})</span>}</>
                              )}
                              {step.type === 'dipping' && (
                                <>
                                  {Object.entries(step.selectedDippingSauces).map(([sauceId, quantity]: [string, any]) => (
                                    <div key={sauceId}>
                                      {quantity}x {sauceId === 'unknown' ? 'Dipping Sauce' : 
                                        // Find sauce name from the stored data or fallback
                                        (() => {
                                          // If we have sauce data in the step, use it
                                          if (step.sauceData && step.sauceData[sauceId]) {
                                            return step.sauceData[sauceId].name;
                                          }
                                          // Otherwise extract from sauceId if it contains the name
                                          return sauceId.includes('_') ? sauceId.split('_').slice(1).join(' ') : 'Dipping Sauce';
                                        })()
                                      }
                                    </div>
                                  ))}
                                </>
                              )}
                            </div>
                            {/* Toppings */}
                            {step.toppings && step.toppings.wholePizza && step.toppings.wholePizza.length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-gray-600">Whole Pizza</span>
                                <div className="text-xs text-gray-700">{step.toppings.wholePizza.map((t: any) => t.name).join(', ')}</div>
                              </div>
                            )}
                            {step.toppings && step.toppings.leftSide && step.toppings.leftSide.length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-blue-600">Left Side</span>
                                <div className="text-xs text-gray-700">{step.toppings.leftSide.map((t: any) => t.name).join(', ')}</div>
                              </div>
                            )}
                            {step.toppings && step.toppings.rightSide && step.toppings.rightSide.length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-blue-600">Right Side</span>
                                <div className="text-xs text-gray-700">{step.toppings.rightSide.map((t: any) => t.name).join(', ')}</div>
                              </div>
                            )}
                            {/* Sauces */}
                            {step.sauces && step.sauces.length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-gray-600">Sauces</span>
                                <div className="text-xs text-gray-700">{step.sauces.map((s: any) => s.name).join(', ')}</div>
                              </div>
                            )}
                            {/* Instructions for each combo step */}
                            {step.instructions && step.instructions.length > 0 && (
                              <div className="mt-1">
                                <span className="text-xs font-medium text-purple-600">Instructions</span>
                                <div className="text-xs text-gray-700">
                                  {(step.type === 'wings'
                                    ? getWingInstructionLabels(step.instructions)
                                    : getPizzaInstructionLabels(step.instructions)
                                  ).join(', ')}
                                </div>
                              </div>
                            )}
                            {/* Extra charge */}
                            {Number(step.extraCharge) > 0 && (
                              <div className="text-xs font-medium text-orange-600 mt-1">Extra Charge: +${Number(step.extraCharge).toFixed(2)}</div>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center justify-between h-full">
                                      <span className="font-bold text-gray-900 text-lg">x{item.quantity}</span>
                  <div className="flex flex-col gap-2">
                    {/* Edit button - only show for customizable items */}
                    {(item.customizations || item.isCombo) && (
                      <Button variant="ghost" size="icon" className="text-blue-500 hover:text-blue-700" onClick={() => onEditItem(item)}>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => onRemoveItem(item.id)}>
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-4 border-t border-border-default pt-4">
        <div className="flex justify-between font-bold text-lg mb-2">
          <span>Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Tax (13%):</span>
          <span>${tax.toFixed(2)}</span>
        </div>
         <div className="flex justify-between font-bold text-xl mb-4">
          <span>Total:</span>
          <span>${total.toFixed(2)}</span>
        </div>
        <Button 
          className="w-full h-[48px] text-base font-bold" 
          size="lg" 
          disabled={cartItems.length === 0}
          onClick={onCheckout}
          type="button"
        >
          Checkout
        </Button>
      </div>
    </aside>
  )
};

const MenuPage = () => {
  // Get customer data from navigation state
  const location = useLocation();
  const navigate = useNavigate();
  const {
    customer,
    orderType,
    editingOrderId,
    pickupTime,
    scheduledDateTime,
    deliveryTimeType,
    scheduledDeliveryDateTime,
    deliveryAddress
  } = location.state || {};
  


  // Data fetching
  const [categoriesSnapshot, loadingCategories] = useCollection(
    query(collection(db, 'categories'), orderBy('name'))
  );
  const [menuItemsSnapshot, loadingMenuItems] = useCollection(
    query(collection(db, 'menuItems'), orderBy('position'))
  );
  const [combosSnapshot, loadingCombos] = useCollection(
    query(collection(db, 'combos'))
  );
  const [settingsSnapshot, loadingSettings] = useDocument(doc(db, 'settings', 'menuScreen'));
  const [categoryOrderSnapshot, loadingCategoryOrder] = useDocument(doc(db, 'settings', 'posCategoryOrder'));

  // Data mapping
  const categories = categoriesSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)) || [];
  const menuItems = menuItemsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)) || [];
  const combos = combosSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Combo)) || [];
  const menuSettings = {
    gridColumns: settingsSnapshot?.data()?.gridColumns || 4,
  };

  // Apply custom category order from admin settings
  const getCategoriesInOrder = () => {
    const categoryOrderData = categoryOrderSnapshot?.data();
    const combosCategory = { id: 'combos', name: 'Combos', icon: '🎁' };
    
    if (categoryOrderData?.categoryOrder) {
      // Apply saved order to categories
      const allCategoriesWithCombos = [...categories, combosCategory];
      const orderedCategories = [...allCategoriesWithCombos].sort((a, b) => {
        const aIndex = categoryOrderData.categoryOrder.findIndex((item: any) => item.id === a.id);
        const bIndex = categoryOrderData.categoryOrder.findIndex((item: any) => item.id === b.id);
        
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
      return orderedCategories;
    }
    
    // Default order: categories alphabetically + combos at the end
    return [...categories, combosCategory];
  };

  const allCategories = getCategoriesInOrder();

  // Cart context
  const { cartItems, addToCart, removeFromCart, updateCartItem, getCartTotal, getCartItemCount } = useCart();
  
  // State
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null); // State for the dialog
  const [showComboSelector, setShowComboSelector] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showPizzaDialog, setShowPizzaDialog] = useState(false);
  const [showWingDialog, setShowWingDialog] = useState(false);
  const [customizingPizza, setCustomizingPizza] = useState<MenuItem | null>(null);
  const [customizingWing, setCustomizingWing] = useState<MenuItem | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [showSizeDialog, setShowSizeDialog] = useState(false);
  const [sizingPizza, setSizingPizza] = useState<MenuItem | null>(null);
  const [sizingItem, setSizingItem] = useState<MenuItem | null>(null);

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
    if (!selectedCategory && allCategories.length > 0) {
      setSelectedCategory(allCategories[0]);
    }
  }, [allCategories, selectedCategory]);

  // Add keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'F') {
        event.preventDefault();
        setShowQuickAdd(true);
      }
      if (event.key === 'Escape') {
        setShowQuickAdd(false);
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isComboTab = selectedCategory?.id === 'combos';
  const filteredItems = isComboTab
    ? combos
    : menuItems.filter(item => item.category === selectedCategory?.name);

  // Combined items for search (both menu items and combos)
  const allItems = [...menuItems, ...combos];

  // Filter items based on search query
  const searchFilteredItems = searchQuery 
    ? filteredItems.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredItems;

  const handleAddToCart = (itemToAdd: MenuItem | Combo) => {
    // If the item is a combo, open the new ComboSelector
    if ('basePrice' in itemToAdd) {


      setSelectedCombo({
        comboId: itemToAdd.id,
        name: itemToAdd.name,
        imageUrl: itemToAdd.imageUrl,
        items: itemToAdd.components.map((comp: any) => ({
          type: comp.type,
          quantity: comp.quantity,
          toppingLimit: comp.maxToppings,
          sauceLimit: comp.maxSauces,
          maxDipping: comp.maxDipping,
          itemName: comp.itemName,
          itemId: comp.itemId, // Preserve itemId for pizza pricing lookups
          availableSizes: comp.availableSizes,
          defaultSize: comp.defaultSize,
          size: comp.itemName || comp.type,
        })),
        price: parseFloat(itemToAdd.basePrice.toFixed(2)),
      });
      setShowComboSelector(true);
      return;
    }
        // Handle different item types
    const itemType = getItemType(itemToAdd);
    
    if (itemType === 'pizza') {
      // For pizzas, check if it's specialty or customizable
      if (itemToAdd.isSpecialtyPizza && !itemToAdd.isCustomizable) {
        // Specialty pizza: show size selection only
        setSizingPizza(itemToAdd);
        setShowSizeDialog(true);
      } else if (itemToAdd.isCustomizable) {
        // Customizable pizza: go directly to pizza customization (includes size selection)
        setCustomizingPizza(itemToAdd);
        setShowPizzaDialog(true);
      } else {
        // Regular pizza (fallback): show size selection
        setSizingPizza(itemToAdd);
        setShowSizeDialog(true);
      }
    } else if (itemType === 'wings' && itemToAdd.isCustomizable) {
      // Customizable wings: show wing customization dialog
      setCustomizingWing(itemToAdd);
      setShowWingDialog(true);
    } else if (itemToAdd.sizePricing && !itemToAdd.isSpecialtyPizza) {
      // Items with size pricing (sides, drinks, etc.): show size selection
      setSizingItem(itemToAdd);
      setShowSizeDialog(true);
    } else if (itemToAdd.isCustomizable) {
      // Other customizable items: show generic customization dialog
      setCustomizingItem(itemToAdd);
    } else {
      // Regular items: add directly to cart
      const existingItem = cartItems.find(item => item.baseId === itemToAdd.id && !item.customizations);
      if (existingItem) {
        updateCartItem(existingItem.id, { ...existingItem, quantity: existingItem.quantity + 1 });
      } else {
        const newItem: CartItem = {
          id: itemToAdd.id,
          baseId: itemToAdd.id,
          name: itemToAdd.name,
          price: itemToAdd.price,
          quantity: 1,
          imageUrl: itemToAdd.imageUrl,
        };
        addToCart(newItem);
      }
    }
    };

  const handleAddCustomizedComboToCart = (customizedCombo: any) => {
    console.log(`📦 ADDING COMBO TO CART:`, customizedCombo);

    const comboItem = {
      id: customizedCombo.isEditing ? customizedCombo.editingItemId : customizedCombo.comboId + '-' + Date.now(),
      baseId: customizedCombo.comboId,
      name: customizedCombo.name,
      price: parseFloat(customizedCombo.price.toFixed(2)),
      quantity: 1,
      imageUrl: customizedCombo.imageUrl || '',
      customizations: customizedCombo.items,
      extraCharges: parseFloat((customizedCombo.extraCharges || 0).toFixed(2)),
      isCombo: true,
    };
    
    console.log(`📦 COMBO ITEM CREATED:`, comboItem);

    if (customizedCombo.isEditing) {
      // Replace the existing combo
      updateCartItem(customizedCombo.editingItemId, comboItem);
      setEditingCartItem(null);
    } else {
      // Add new combo
      addToCart(comboItem);
    }
  };

  const handleRemoveFromCart = (itemId: string) => {
    removeFromCart(itemId);
  };

  const handleEditCartItem = (cartItem: CartItem) => {
    console.log('🔧 Editing cart item:', {
      id: cartItem.id,
      baseId: cartItem.baseId,
      name: cartItem.name,
      isCombo: cartItem.isCombo,
      customizations: cartItem.customizations,
      hasCustomizations: !!cartItem.customizations,
      customizationType: cartItem.customizations?.type
    });
    
    setEditingCartItem(cartItem);
    
    if (cartItem.isCombo) {
      // For combos, we need to reconstruct the combo data and open ComboSelector
      setSelectedCombo({
        comboId: cartItem.baseId,
        name: cartItem.name, // Use original name, do not prepend 'Edit'
        imageUrl: cartItem.imageUrl,
        items: cartItem.customizations || [],
        price: cartItem.price,
        extraCharges: cartItem.extraCharges || 0,
        isEditing: true,
        editingItemId: cartItem.id
      });
      setShowComboSelector(true);
    } else if (cartItem.customizations) {
      // Specialty pizza: open size dialog, not topping dialog
      const originalItem = menuItems.find(item => item.id === cartItem.baseId);
      if (originalItem && originalItem.isSpecialtyPizza && !originalItem.isCustomizable) {
        setSizingPizza(originalItem);
        setShowSizeDialog(true);
        return;
      }
      if (cartItem.customizations.type === 'pizza') {
        // Find the original menu item for pizza customization
        let originalItem = menuItems.find(item => item.id === cartItem.baseId);
        
        // If not found by baseId, try to find by name or category
        if (!originalItem) {
          originalItem = menuItems.find(item => 
            item.category === 'Pizza' && 
            item.isCustomizable && 
            item.name.toLowerCase().includes('pizza')
          );
        }
        
        // If still not found, use first customizable pizza
        if (!originalItem) {
          originalItem = menuItems.find(item => 
            item.category === 'Pizza' && item.isCustomizable
          );
        }
        
        console.log('🍕 Looking for pizza item:', {
          searchingForBaseId: cartItem.baseId,
          foundOriginalItem: !!originalItem,
          originalItemName: originalItem?.name,
          fallbackUsed: cartItem.baseId !== originalItem?.id
        });
        
        if (originalItem) {
          setCustomizingPizza({
            ...originalItem,
            isEditing: true,
            editingItemId: cartItem.id
          } as any);
          setShowPizzaDialog(true);
        } else {
          console.error('❌ Could not find any pizza item for editing');
        }
      } else if (cartItem.customizations.type === 'wings') {
        // Find the original menu item for wing customization
        let originalItem = menuItems.find(item => item.id === cartItem.baseId);
        
        // If not found by baseId, try to find by category
        if (!originalItem) {
          originalItem = menuItems.find(item => 
            item.category === 'Wings' && item.isCustomizable
          );
        }
        
        // If still not found, try to find any wing item
        if (!originalItem) {
          originalItem = menuItems.find(item => 
            item.name.toLowerCase().includes('wing') && item.isCustomizable
          );
        }
        
        console.log('🍗 Looking for wing item:', {
          searchingForBaseId: cartItem.baseId,
          foundOriginalItem: !!originalItem,
          originalItemName: originalItem?.name,
          fallbackUsed: cartItem.baseId !== originalItem?.id
        });
        
        if (originalItem) {
          setCustomizingWing({
            ...originalItem,
            isEditing: true,
            editingItemId: cartItem.id
          } as any);
          setShowWingDialog(true);
        } else {
          console.error('❌ Could not find any wing item for editing');
        }
      } else if (cartItem.customizations.type === 'item' || cartItem.customizations.type === 'side' || cartItem.customizations.type === 'drink') {
        // For sides/drinks, open size select dialog
        let originalItem = menuItems.find(item => item.id === cartItem.baseId);
        
        // If not found by baseId, try to find by category
        if (!originalItem) {
          const category = cartItem.customizations.type === 'side' ? 'Sides' : 
                          cartItem.customizations.type === 'drink' ? 'Drinks' : 
                          cartItem.category;
          originalItem = menuItems.find(item => 
            item.category === category && item.sizePricing
          );
        }
        
        console.log('🥤 Looking for side/drink item:', {
          searchingForBaseId: cartItem.baseId,
          type: cartItem.customizations.type,
          foundOriginalItem: !!originalItem,
          originalItemName: originalItem?.name,
          fallbackUsed: cartItem.baseId !== originalItem?.id
        });
        
        if (originalItem) {
          setSizingItem(originalItem);
          setShowSizeDialog(true);
        } else {
          console.error('❌ Could not find any item for side/drink editing');
        }
      } else {
        // Fallback for other customizable items
        const originalItem = menuItems.find(item => item.id === cartItem.baseId);
        if (originalItem) {
          setCustomizingItem(originalItem);
        }
      }
    }
  };

  const handleAddCustomizedItemToCart = (customizedItem: CartItem) => {
    addToCart(customizedItem);
  };

  const handlePizzaCustomizationComplete = (result: any) => {
    if (!customizingPizza) return;
    
    // Use size price override if available (from size selection)
    const finalPrice = (customizingPizza as any).sizePriceOverride || customizingPizza.price;
    
    const customizedItem: CartItem = {
      id: (customizingPizza as any).isEditing ? (customizingPizza as any).editingItemId : `${customizingPizza.id}-${Date.now()}`,
      baseId: customizingPizza.id,
      name: customizingPizza.name,
      price: finalPrice, // Use size-adjusted price
      quantity: 1,
      imageUrl: customizingPizza.imageUrl,
      customizations: {
        type: result.type,
        size: (customizingPizza as any).selectedSize,
        toppings: result.toppings,
        isHalfAndHalf: result.isHalfAndHalf,
        instructions: result.instructions || []
      },
      extraCharges: result.extraCharge || 0
    };

    if ((customizingPizza as any).isEditing) {
      // Replace the existing item
      updateCartItem((customizingPizza as any).editingItemId, customizedItem);
    } else {
      // Add new item
      handleAddCustomizedItemToCart(customizedItem);
    }
    
    setShowPizzaDialog(false);
    setCustomizingPizza(null);
    setEditingCartItem(null);
  };

  const handleWingCustomizationComplete = (result: any) => {
    if (!customizingWing) return;
    
    const customizedItem: CartItem = {
      id: (customizingWing as any).isEditing ? (customizingWing as any).editingItemId : `${customizingWing.id}-${Date.now()}`,
      baseId: customizingWing.id,
      name: customizingWing.name,
      price: customizingWing.price, // Base price only
      quantity: 1,
      imageUrl: customizingWing.imageUrl,
      customizations: {
        type: result.type,
        sauces: result.sauces,
        instructions: result.instructions || []
      },
      extraCharges: result.extraCharge || 0
    };

    if ((customizingWing as any).isEditing) {
      // Replace the existing item
      updateCartItem((customizingWing as any).editingItemId, customizedItem);
    } else {
      // Add new item
      handleAddCustomizedItemToCart(customizedItem);
    }
    
    setShowWingDialog(false);
    setCustomizingWing(null);
    setEditingCartItem(null);
  };

  // Pizza size selection handler
  const handleSizeSelection = (selected: string | { size: string }) => {
    const selectedSize = typeof selected === 'string' ? selected : selected.size;
    // Handle both pizza and non-pizza items with sizing
    const item = sizingPizza || sizingItem;
    if (!item) return;

    // Determine available sizes and pricing based on item type
    let availableSizes: string[];
    let sizePrice: { [key: string]: number };

    if (sizingPizza) {
      // Pizza sizing (Small, Medium, Large)
      availableSizes = ['Small', 'Medium', 'Large'];
      sizePrice = sizingPizza.sizePricing ? {
        'Small': sizingPizza.sizePricing.small,
        'Medium': sizingPizza.sizePricing.medium,
        'Large': sizingPizza.sizePricing.large
      } : {
        'Small': 12.00,
        'Medium': 15.00,
        'Large': 17.50
      };

      // Check if the pizza is customizable
      if (sizingPizza.isCustomizable) {
        // If customizable, proceed to customization with size already selected
        setCustomizingPizza({
          ...sizingPizza,
          selectedSize,
          sizePriceOverride: sizePrice[selectedSize]
        } as any);
        setShowPizzaDialog(true);
        setShowSizeDialog(false);
        setSizingPizza(null);
        return;
      }
    } else if (sizingItem) {
      // Non-pizza items with sizing
      const category = sizingItem.category.toLowerCase();
      
      if (category.includes('side') || category.includes('appetizer')) {
        // Sides: Small, Large
        availableSizes = ['Small', 'Large'];
        sizePrice = sizingItem.sizePricing ? {
          'Small': sizingItem.sizePricing.small,
          'Large': sizingItem.sizePricing.large
        } : {
          'Small': 4.00,
          'Large': 6.00
        };
      } else if (category.includes('drink') || category.includes('beverage')) {
        // Drinks: Small, Medium, Large
        availableSizes = ['Small', 'Medium', 'Large'];
        sizePrice = sizingItem.sizePricing ? {
          'Small': sizingItem.sizePricing.small,
          'Medium': sizingItem.sizePricing.medium || sizingItem.sizePricing.small,
          'Large': sizingItem.sizePricing.large
        } : {
          'Small': 2.00,
          'Medium': 2.50,
          'Large': 3.00
        };
      } else {
        // Default to small/large for other categories
        availableSizes = ['Small', 'Large'];
        sizePrice = sizingItem.sizePricing ? {
          'Small': sizingItem.sizePricing.small,
          'Large': sizingItem.sizePricing.large
        } : {
          'Small': item.price * 0.8,
          'Large': item.price * 1.2
        };
      }
    } else {
      return;
    }

    // If editing, update the existing cart item
    if (editingCartItem) {
      updateCartItem(editingCartItem.id, {
        ...editingCartItem,
        price: sizePrice[selectedSize] || item.price,
        customizations: {
          ...editingCartItem.customizations,
          size: selectedSize
        }
      });
      setEditingCartItem(null);
    } else {
      // Add item to cart with size selection
      const newItem: CartItem = {
        id: `${item.id}-${selectedSize}-${Date.now()}`,
        baseId: item.id,
        name: item.name,
        price: sizePrice[selectedSize] || item.price,
        quantity: 1,
        imageUrl: item.imageUrl,
        customizations: {
          type: sizingPizza ? 'pizza' : 'item',
          size: selectedSize
        }
      };
      addToCart(newItem);
    }
    setShowSizeDialog(false);
    setSizingPizza(null);
    setSizingItem(null);
  };

  const handlePizzaSizeSelection = (selectedSize: string) => {
    if (!sizingPizza) return;

    // Get pricing from the pizza item or use defaults
    const sizePrice: { [key: string]: number } = sizingPizza.sizePricing ? {
      'Small': sizingPizza.sizePricing.small,
      'Medium': sizingPizza.sizePricing.medium,
      'Large': sizingPizza.sizePricing.large
    } : {
      'Small': 12.00,
      'Medium': 15.00,
      'Large': 17.50
    };

    // Check if the pizza is customizable
    if (sizingPizza.isCustomizable) {
      // If customizable, proceed to customization with size already selected
      setCustomizingPizza({
        ...sizingPizza,
        selectedSize,
        sizePriceOverride: sizePrice[selectedSize]
      } as any);
      setShowPizzaDialog(true);
    } else {
      // If not customizable, add directly to cart with size
      const newItem: CartItem = {
        id: `${sizingPizza.id}-${selectedSize}-${Date.now()}`,
        baseId: sizingPizza.id,
        name: sizingPizza.name,
        price: sizePrice[selectedSize] || sizingPizza.price,
        quantity: 1,
        imageUrl: sizingPizza.imageUrl,
        customizations: {
          type: 'pizza',
          size: selectedSize
        }
      };
      addToCart(newItem);
    }
    
    setShowSizeDialog(false);
    setSizingPizza(null);
  };

  const handleCheckout = () => {
    if (!customer || !customer.phone || cartItems.length === 0) {
      alert('Please ensure customer information is complete before checkout.');
      return;
    }
    
    navigate('/checkout', {
      state: {
        cartItems,
        customer,
        phone: customer.phone,
        orderType,
        editingOrderId,
        pickupTime,
        scheduledDateTime,
        deliveryTimeType,
        scheduledDeliveryDateTime,
        deliveryAddress,
        ...(location.state?.originalOrder ? { originalOrder: location.state.originalOrder } : {}),
        ...(location.state?.orderNumber ? { orderNumber: location.state.orderNumber } : {})
      }
    });
  };

  const subtotal = cartItems.reduce((sum, item) => {
    const itemTotal = (item.price + (item.extraCharges || 0)) * item.quantity;
    //console.log(`🛒 MAIN SUBTOTAL DEBUG: ${item.name} - Price: $${item.price}, Extra: $${item.extraCharges || 0}, Qty: ${item.quantity}, Total: $${itemTotal}`);
    return sum + itemTotal;
  }, 0);
  const totalItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <TopBar 
        cartItemsCount={totalItemsCount}
        cartTotal={subtotal}
        customerInfo={customer}
        orderType={orderType || "Pickup"}
        currentStep="menu"
        onQuickAddClick={() => setShowQuickAdd(true)}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <CategorySidebar
          categories={allCategories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          loading={loadingCategories}
        />
        <MenuItemGrid
          items={searchFilteredItems}
          onAddToCart={handleAddToCart}
          loading={loadingMenuItems || loadingCombos || loadingSettings}
          gridColumns={menuSettings.gridColumns}
        />
        <CartPanel cartItems={cartItems} onRemoveItem={handleRemoveFromCart} onEditItem={handleEditCartItem} onCheckout={handleCheckout} />
      </div>
      <ItemCustomizationDialog
        open={customizingItem !== null}
        onClose={() => setCustomizingItem(null)}
        item={customizingItem}
        onAddToCart={(item) => {
          handleAddCustomizedItemToCart(item);
          setCustomizingItem(null);
        }}
      />
      {/* Specialized Customization Dialogs */}
      <PizzaToppingDialog
        open={showPizzaDialog}
        onClose={() => {
          setShowPizzaDialog(false);
          setCustomizingPizza(null);
          setEditingCartItem(null);
        }}
        onSubmit={handlePizzaCustomizationComplete}
        toppingLimit={customizingPizza?.maxToppings || 3} // Use item-specific limit or default to 3
        pizzaName={(customizingPizza as any)?.isEditing ? `Edit ${customizingPizza?.name || 'Pizza'}` : customizingPizza?.name || 'Pizza'}
        pizzaItem={customizingPizza} // Pass the full pizza item for pricing data
        existingSelections={(customizingPizza as any)?.isEditing ? editingCartItem?.customizations : undefined}
      />
      <WingSauceDialog
        open={showWingDialog}
        onClose={() => {
          setShowWingDialog(false);
          setCustomizingWing(null);
          setEditingCartItem(null);
        }}
        onSubmit={handleWingCustomizationComplete}
        sauceLimit={customizingWing?.maxSauces || 1} // Use item-specific limit or default to 1
        wingName={(customizingWing as any)?.isEditing ? `Edit ${customizingWing?.name || 'Wings'}` : customizingWing?.name || 'Wings'}
        existingSelections={(customizingWing as any)?.isEditing ? editingCartItem?.customizations : undefined}
      />
      <SizeSelectDialog
        open={showSizeDialog}
        onClose={() => {
          setShowSizeDialog(false);
          setSizingPizza(null);
          setSizingItem(null);
        }}
        onSubmit={handleSizeSelection}
        availableSizes={(() => {
          const item = sizingPizza || sizingItem;
          if (!item) return ['Small', 'Medium', 'Large'];
          if (sizingPizza) {
            return ['Small', 'Medium', 'Large'];
          } else {
            const category = item.category.toLowerCase();
            if (category.includes('drink') || category.includes('beverage')) {
              return ['Small', 'Medium', 'Large'];
            } else {
              return ['Small', 'Large'];
            }
          }
        })()}
        defaultSize={(() => {
          const item = sizingPizza || sizingItem;
          if (!item) return 'Medium';
          if (sizingPizza) {
            return 'Medium';
          } else {
            const category = item.category.toLowerCase();
            if (category.includes('drink') || category.includes('beverage')) {
              return 'Medium';
            } else {
              return 'Small';
            }
          }
        })()}
        itemName={(sizingPizza || sizingItem)?.name || 'Item'}
        dialogTitle={(() => {
          const item = sizingPizza || sizingItem;
          if (!item) return '';
          if (editingCartItem) {
            return `Edit ${item.name}`;
          }
          return `Select Size for ${item.name}`;
        })()}
        sizePrices={{
          'Small': (() => {
            const item = sizingPizza || sizingItem;
            if (sizingPizza?.sizePricing) return sizingPizza.sizePricing.small;
            if (sizingItem?.sizePricing) return sizingItem.sizePricing.small;
            if (sizingPizza) return 12.00;
            const category = item?.category.toLowerCase() || '';
            return category.includes('drink') ? 2.00 : 4.00;
          })(),
          'Medium': (() => {
            const item = sizingPizza || sizingItem;
            if (sizingPizza?.sizePricing) return sizingPizza.sizePricing.medium;
            if (sizingItem?.sizePricing) return sizingItem.sizePricing.medium || (sizingItem.sizePricing.small + sizingItem.sizePricing.large) / 2;
            if (sizingPizza) return 15.00;
            return 2.50;
          })(),
          'Large': (() => {
            const item = sizingPizza || sizingItem;
            if (sizingPizza?.sizePricing) return sizingPizza.sizePricing.large;
            if (sizingItem?.sizePricing) return sizingItem.sizePricing.large;
            if (sizingPizza) return 17.50;
            const category = item?.category.toLowerCase() || '';
            return category.includes('drink') ? 3.00 : 6.00;
          })()
        }}
      />
      {/* New ComboSelector flow */}
      <ComboSelector
        open={showComboSelector}
        onClose={() => {
          setShowComboSelector(false);
          setEditingCartItem(null);
        }}
        combo={selectedCombo}
        onComplete={handleAddCustomizedComboToCart}
      />

      {/* Quick Add Search Overlay */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex justify-center items-start pt-20">
          {/* Glassmorphism Background */}
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-md"
            onClick={() => setShowQuickAdd(false)}
          />
          
          {/* Search Dialog */}
          <div className="relative bg-white/95 backdrop-blur-xl border border-white/50 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
            {/* Glass overlay for extra effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            
            {/* Content */}
            <div className="relative">
              <div className="p-6 border-b border-gray-200/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-200/80 rounded-lg backdrop-blur-sm">
                    <Search className="w-5 h-5 text-gray-600" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search menu items to add..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 text-lg border-none outline-none bg-gray-200/80 text-gray-800 placeholder-gray-500 font-medium px-4 py-2 rounded-lg border border-gray-300/50"
                    autoFocus
                  />
                  <button
                    onClick={() => setShowQuickAdd(false)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200/80 rounded-lg transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto p-4 bg-gray-100/40">
                {searchQuery && (
                  <div className="grid grid-cols-1 gap-3">
                    {allItems
                      .filter(item => 
                        item.name.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .slice(0, 10)
                      .map(item => (
                        <button
                          key={item.id}
                          onClick={() => {
                            handleAddToCart(item);
                            setShowQuickAdd(false);
                            setSearchQuery('');
                          }}
                          className="flex items-center gap-3 p-4 hover:bg-white/90 rounded-xl text-left transition-all duration-200 border border-gray-200/50 hover:border-gray-300/70 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md"
                        >
                          {'imageUrl' in item && item.imageUrl && (
                            <div className="relative">
                              <img 
                                src={item.imageUrl} 
                                alt={item.name}
                                className="w-12 h-12 object-cover rounded-lg"
                              />
                              <div className="absolute inset-0 bg-white/10 rounded-lg" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-gray-800">{item.name}</div>
                            <div className="text-sm text-gray-600">
                              {'basePrice' in item ? 
                                `$${item.basePrice.toFixed(2)}` :
                                ((item.isSpecialtyPizza && item.sizePricing) || (item.sizePricing && !item.isSpecialtyPizza) ? 
                                  `Starting from $${item.sizePricing.small.toFixed(2)}` : 
                                  `$${item.price.toFixed(2)}`
                                )
                              }
                            </div>
                          </div>
                          <div className="p-2 bg-gray-200/80 rounded-lg backdrop-blur-sm">
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </div>
                        </button>
                      ))}
                    {searchQuery && allItems.filter(item => 
                      item.name.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 && (
                      <div className="text-center py-8">
                        <div className="p-4 bg-white/80 rounded-xl border border-gray-200/50 backdrop-blur-sm shadow-sm">
                          <div className="text-gray-600 mb-2">No items found</div>
                          <div className="text-gray-800 font-medium">"{searchQuery}"</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {!searchQuery && (
                  <div className="text-center py-8">
                    <div className="p-6 bg-white/80 rounded-xl border border-gray-200/50 backdrop-blur-sm shadow-sm">
                      <div className="p-3 bg-gray-300/80 rounded-full w-fit mx-auto mb-4">
                        <Search className="w-8 h-8 text-gray-600" />
                      </div>
                      <div className="text-gray-600 text-lg">Start typing to search for menu items...</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuPage;