import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../services/firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Plus, X } from 'lucide-react';

interface MenuItem {
    id: string;
    name: string;
    price: number;
    category: string;
    imageUrl?: string;
}

interface AddMenuItemDialogProps {
  open: boolean;
  onClose: () => void;
  categories: { id: string; name: string }[];
  menuItems: MenuItem[];
}

export const AddMenuItemDialog = ({ open, onClose, categories, menuItems }: AddMenuItemDialogProps) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [tileColor, setTileColor] = useState('#FFFFFF');
  const [isCustomizable, setIsCustomizable] = useState(false);
  const [maxToppings, setMaxToppings] = useState('');
  const [maxSauces, setMaxSauces] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Item type and customization fields
  const [itemType, setItemType] = useState('regular');
  const [smallPrice, setSmallPrice] = useState('12.00');
  const [mediumPrice, setMediumPrice] = useState('15.00');
  const [largePrice, setLargePrice] = useState('17.50');
  
  // Side-specific fields
  const [sideSmallPrice, setSideSmallPrice] = useState('4.00');
  const [sideLargePrice, setSideLargePrice] = useState('6.00');
  
  // Drink-specific fields
  const [drinkSmallPrice, setDrinkSmallPrice] = useState('2.00');
  const [drinkMediumPrice, setDrinkMediumPrice] = useState('2.50');
  const [drinkLargePrice, setDrinkLargePrice] = useState('3.00');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !category || !imageFile) {
      alert('Please fill out all fields and select an image.');
      return;
    }
    
    setIsUploading(true);
    let imageUrl = '';
    
    try {
      const storageRef = ref(storage, `menuItems/${Date.now()}_${imageFile.name}`);
      const snapshot = await uploadBytes(storageRef, imageFile);
      imageUrl = await getDownloadURL(snapshot.ref);

      const position = menuItems.filter(item => item.category === category).length;

      const menuItemData: any = {
        name,
        price: parseFloat(price),
        category,
        imageUrl,
        position,
        tileColor,
        isCustomizable,
        createdAt: serverTimestamp(),
      };

      // Only add maxToppings if it has a value
      if (maxToppings && parseInt(maxToppings) > 0) {
        menuItemData.maxToppings = parseInt(maxToppings);
      }

      // Only add maxSauces if it has a value
      if (maxSauces && parseInt(maxSauces) > 0) {
        menuItemData.maxSauces = parseInt(maxSauces);
      }

      // Add item type specific data
      if (itemType === 'specialtyPizza') {
        menuItemData.isSpecialtyPizza = true;
        menuItemData.isCustomizable = false;
        menuItemData.sizePricing = {
          small: parseFloat(smallPrice),
          medium: parseFloat(mediumPrice),
          large: parseFloat(largePrice)
        };
      } else if (itemType === 'customizablePizza') {
        menuItemData.isCustomizable = true;
        menuItemData.isSpecialtyPizza = false;
      } else if (itemType === 'customizableWings') {
        menuItemData.isCustomizable = true;
      } else if (itemType === 'sideWithSizes') {
        menuItemData.sizePricing = {
          small: parseFloat(sideSmallPrice),
          large: parseFloat(sideLargePrice)
        };
      } else if (itemType === 'drinkWithSizes') {
        menuItemData.sizePricing = {
          small: parseFloat(drinkSmallPrice),
          medium: parseFloat(drinkMediumPrice),
          large: parseFloat(drinkLargePrice)
        };
      }

      await addDoc(collection(db, 'menuItems'), menuItemData);
      
      onClose();
      setName('');
      setPrice('');
      setCategory('');
      setImageFile(null);
      setTileColor('#FFFFFF');
      setItemType('regular');
      setMaxToppings('');
      setMaxSauces('');
      setSmallPrice('12.00');
      setMediumPrice('15.00');
      setLargePrice('17.50');
      setSideSmallPrice('4.00');
      setSideLargePrice('6.00');
      setDrinkSmallPrice('2.00');
      setDrinkMediumPrice('2.50');
      setDrinkLargePrice('3.00');
    } catch (error) {
      console.error("Error adding document: ", error);
      alert('Failed to add menu item.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!open) return null;

  return (
            <div 
          className="fixed inset-0 z-50 flex justify-center items-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
        >
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Add New Menu Item</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
            <X className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="itemName" className="block text-sm font-medium text-gray-700">Name</label>
                <input type="text" id="itemName" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full border-gray-300 rounded-md shadow-sm" />
            </div>
            <div>
                <label htmlFor="itemPrice" className="block text-sm font-medium text-gray-700">Price</label>
                <input type="number" id="itemPrice" value={price} onChange={(e) => setPrice(e.target.value)} required className="mt-1 w-full border-gray-300 rounded-md shadow-sm" />
            </div>
            <div>
                <label htmlFor="itemCategory" className="block text-sm font-medium text-gray-700">Category</label>
                <select id="itemCategory" value={category} onChange={(e) => setCategory(e.target.value)} required className="mt-1 w-full border-gray-300 rounded-md shadow-sm">
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="itemImage" className="block text-sm font-medium text-gray-700">Image</label>
                <input type="file" id="itemImage" onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)} required className="mt-1 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
            </div>
            <div>
              <label htmlFor="tileColor" className="block text-sm font-medium text-gray-700">Tile Color</label>
              <div className="flex items-center mt-1">
                <input
                  id="tileColor"
                  type="color"
                  value={tileColor}
                  onChange={(e) => setTileColor(e.target.value)}
                  className="h-10 w-10 p-1 border-gray-300 rounded-md"
                />
                <input
                  type="text"
                  value={tileColor}
                  onChange={(e) => setTileColor(e.target.value)}
                  className="w-full ml-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
              </div>
            </div>
            {/* Category-Based Item Type Selection */}
            {category && (
              <div className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <h3 className="text-sm font-medium text-blue-800">🏷️ {category} Options</h3>
                
                <div>
                  <label htmlFor="itemType" className="block text-sm font-medium text-gray-700 mb-2">Item Type</label>
                  <select
                    id="itemType"
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="regular">Regular {category} (No special options)</option>
                    
                    {/* Pizza-specific options */}
                    {category.toLowerCase().includes('pizza') && [
                      <option key="specialtyPizza" value="specialtyPizza">🍕 Specialty Pizza (Fixed recipe, size pricing)</option>,
                      <option key="customizablePizza" value="customizablePizza">🍕 Customizable Pizza (Build your own)</option>
                    ]}
                    
                    {/* Wings-specific options */}
                    {category.toLowerCase().includes('wing') && (
                      <option value="customizableWings">🍗 Customizable Wings (Sauce selection)</option>
                    )}
                    
                    {/* Sides-specific options */}
                    {(category.toLowerCase().includes('side') || category.toLowerCase().includes('appetizer')) && (
                      <option value="sideWithSizes">🍟 Side with Size Options (Small/Large pricing)</option>
                    )}
                    
                    {/* Drinks-specific options */}
                    {(category.toLowerCase().includes('drink') || category.toLowerCase().includes('beverage')) && (
                      <option value="drinkWithSizes">🥤 Drink with Size Options (Small/Medium/Large pricing)</option>
                    )}
                    
                    {/* Generic customizable option for any category */}
                    <option value="customizableOther">⚙️ Other Customizable Item</option>
                  </select>
                </div>

              {/* Customization Limits - show for customizable items */}
              {(itemType === 'customizablePizza' || itemType === 'customizableWings' || itemType === 'customizableOther') && (
                <div className="mt-4 p-3 bg-white rounded-lg border">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Customization Limits</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {(itemType === 'customizablePizza' || itemType === 'customizableOther') && (
                      <div>
                        <label htmlFor="maxToppings" className="block text-sm font-medium text-gray-700">Max Toppings</label>
                        <input
                          id="maxToppings"
                          type="number"
                          min="0"
                          value={maxToppings}
                          onChange={(e) => setMaxToppings(e.target.value)}
                          placeholder="e.g., 3"
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
                      </div>
                    )}
                    {(itemType === 'customizableWings' || itemType === 'customizableOther') && (
                      <div>
                        <label htmlFor="maxSauces" className="block text-sm font-medium text-gray-700">Max Sauces</label>
                        <input
                          id="maxSauces"
                          type="number"
                          min="0"
                          value={maxSauces}
                          onChange={(e) => setMaxSauces(e.target.value)}
                          placeholder="e.g., 1"
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Size Pricing - show for specialty pizzas */}
              {itemType === 'specialtyPizza' && (
                <div className="mt-4 p-3 bg-white rounded-lg border">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">🍕 Size Pricing</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="smallPrice" className="block text-sm font-medium text-gray-700">Small</label>
                      <input
                        id="smallPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={smallPrice}
                        onChange={(e) => setSmallPrice(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="mediumPrice" className="block text-sm font-medium text-gray-700">Medium</label>
                      <input
                        id="mediumPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={mediumPrice}
                        onChange={(e) => setMediumPrice(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="largePrice" className="block text-sm font-medium text-gray-700">Large</label>
                      <input
                        id="largePrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={largePrice}
                        onChange={(e) => setLargePrice(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 The base price above will be ignored. Size pricing will be used instead.
                  </p>
                </div>
              )}

              {/* Side Size Pricing */}
              {itemType === 'sideWithSizes' && (
                <div className="mt-4 p-3 bg-white rounded-lg border">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">🍟 Side Size Pricing</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="sideSmallPrice" className="block text-sm font-medium text-gray-700">Small</label>
                      <input
                        id="sideSmallPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={sideSmallPrice}
                        onChange={(e) => setSideSmallPrice(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="sideLargePrice" className="block text-sm font-medium text-gray-700">Large</label>
                      <input
                        id="sideLargePrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={sideLargePrice}
                        onChange={(e) => setSideLargePrice(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 The base price above will be ignored. Size pricing will be used instead.
                  </p>
                </div>
              )}

              {/* Drink Size Pricing */}
              {itemType === 'drinkWithSizes' && (
                <div className="mt-4 p-3 bg-white rounded-lg border">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">🥤 Drink Size Pricing</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="drinkSmallPrice" className="block text-sm font-medium text-gray-700">Small</label>
                      <input
                        id="drinkSmallPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={drinkSmallPrice}
                        onChange={(e) => setDrinkSmallPrice(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="drinkMediumPrice" className="block text-sm font-medium text-gray-700">Medium</label>
                      <input
                        id="drinkMediumPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={drinkMediumPrice}
                        onChange={(e) => setDrinkMediumPrice(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="drinkLargePrice" className="block text-sm font-medium text-gray-700">Large</label>
                      <input
                        id="drinkLargePrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={drinkLargePrice}
                        onChange={(e) => setDrinkLargePrice(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 The base price above will be ignored. Size pricing will be used instead.
                  </p>
                </div>
              )}
            </div>
            )}
            <div className="flex justify-end pt-4">
                <button type="button" onClick={onClose} className="mr-2 px-4 py-2 rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300">Cancel</button>
                <button type="submit" disabled={isUploading} className="px-4 py-2 rounded-md text-white bg-[#800000] hover:bg-red-800 flex items-center disabled:bg-gray-400">
                    <Plus className="h-5 w-5 mr-2" />
                    {isUploading ? 'Adding...' : 'Add Item'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};