import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../services/firebase';
import { getDownloadURL, ref, uploadBytes, deleteObject } from 'firebase/storage';
import { Save, X } from 'lucide-react';

interface MenuItem {
    id: string;
    name: string;
    price: number;
    category: string;
    imageUrl?: string;
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

interface Category {
    id: string;
    name: string;
}

interface EditMenuItemDialogProps {
  open: boolean;
  onClose: () => void;
  item: MenuItem | null;
  categories: Category[];
}

export const EditMenuItemDialog = ({ open, onClose, item, categories }: EditMenuItemDialogProps) => {
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

  useEffect(() => {
    if (item) {
      setName(item.name);
      setPrice(item.price.toString());
      setCategory(item.category);
      setTileColor(item.tileColor || '#FFFFFF');
      setMaxToppings(item.maxToppings ? item.maxToppings.toString() : '');
      setMaxSauces(item.maxSauces ? item.maxSauces.toString() : '');
      
      // Determine item type from existing data
      if (item.isSpecialtyPizza) {
        setItemType('specialtyPizza');
      } else if (item.isCustomizable && item.maxToppings) {
        setItemType('customizablePizza');
      } else if (item.isCustomizable && item.maxSauces) {
        setItemType('customizableWings');
      } else if (item.isCustomizable) {
        setItemType('customizableOther');
      } else if (item.sizePricing && !item.isSpecialtyPizza) {
        // Check if it's a side or drink with sizing
        const category = item.category.toLowerCase();
        if (category.includes('side') || category.includes('appetizer')) {
          setItemType('sideWithSizes');
        } else if (category.includes('drink') || category.includes('beverage')) {
          setItemType('drinkWithSizes');
        } else {
          setItemType('regular');
        }
      } else {
        setItemType('regular');
      }
      
      if (item.sizePricing) {
        if (item.sizePricing.small) setSmallPrice(item.sizePricing.small.toString());
        if (item.sizePricing.medium) setMediumPrice(item.sizePricing.medium.toString());
        if (item.sizePricing.large) setLargePrice(item.sizePricing.large.toString());
        
        // Handle side pricing (only small and large)
        if (item.sizePricing.small) setSideSmallPrice(item.sizePricing.small.toString());
        if (item.sizePricing.large) setSideLargePrice(item.sizePricing.large.toString());
        
        // Handle drink pricing
        if (item.sizePricing.small) setDrinkSmallPrice(item.sizePricing.small.toString());
        if (item.sizePricing.medium) setDrinkMediumPrice(item.sizePricing.medium.toString());
        if (item.sizePricing.large) setDrinkLargePrice(item.sizePricing.large.toString());
      }
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    setIsUploading(true);
    const itemDocRef = doc(db, 'menuItems', item.id);
    let newImageUrl = item.imageUrl;

    try {
      if (imageFile) {
        const newImageRef = ref(storage, `menuItems/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(newImageRef, imageFile);
        newImageUrl = await getDownloadURL(snapshot.ref);

        if (item.imageUrl) {
          try {
            const oldImageRef = ref(storage, item.imageUrl);
            await deleteObject(oldImageRef);
          } catch (deleteError) {
             console.error("Could not delete old image, continuing update.", deleteError)
          }
        }
      }

      const updateData: any = {
        name,
        price: parseFloat(price),
        category,
        imageUrl: newImageUrl,
        tileColor,
      };

      // Set item type specific data
      if (itemType === 'specialtyPizza') {
        updateData.isSpecialtyPizza = true;
        updateData.isCustomizable = false;
        updateData.sizePricing = {
          small: parseFloat(smallPrice),
          medium: parseFloat(mediumPrice),
          large: parseFloat(largePrice)
        };
      } else if (itemType === 'customizablePizza') {
        updateData.isCustomizable = true;
        updateData.isSpecialtyPizza = false;
        if (maxToppings && parseInt(maxToppings) > 0) {
          updateData.maxToppings = parseInt(maxToppings);
        }
      } else if (itemType === 'customizableWings') {
        updateData.isCustomizable = true;
        updateData.isSpecialtyPizza = false;
        if (maxSauces && parseInt(maxSauces) > 0) {
          updateData.maxSauces = parseInt(maxSauces);
        }
      } else if (itemType === 'customizableOther') {
        updateData.isCustomizable = true;
        updateData.isSpecialtyPizza = false;
        if (maxToppings && parseInt(maxToppings) > 0) {
          updateData.maxToppings = parseInt(maxToppings);
        }
        if (maxSauces && parseInt(maxSauces) > 0) {
          updateData.maxSauces = parseInt(maxSauces);
        }
      } else if (itemType === 'sideWithSizes') {
        updateData.isCustomizable = false;
        updateData.isSpecialtyPizza = false;
        updateData.sizePricing = {
          small: parseFloat(sideSmallPrice),
          large: parseFloat(sideLargePrice)
        };
      } else if (itemType === 'drinkWithSizes') {
        updateData.isCustomizable = false;
        updateData.isSpecialtyPizza = false;
        updateData.sizePricing = {
          small: parseFloat(drinkSmallPrice),
          medium: parseFloat(drinkMediumPrice),
          large: parseFloat(drinkLargePrice)
        };
      } else {
        // Regular item
        updateData.isCustomizable = false;
        updateData.isSpecialtyPizza = false;
      }

      await updateDoc(itemDocRef, updateData);

      onClose();
    } catch (error) {
      console.error("Error updating document: ", error);
      alert('Failed to update menu item.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!open || !item) return null;

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
          <h2 className="text-2xl font-bold text-gray-800">Edit Menu Item</h2>
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
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="itemImage" className="block text-sm font-medium text-gray-700">Replace Image (optional)</label>
                <input type="file" id="itemImage" onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)} className="mt-1 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
            </div>
            <div>
              <label htmlFor="editTileColor" className="block text-sm font-medium text-gray-700">Tile Color</label>
              <div className="flex items-center mt-1">
                <input
                  id="editTileColor"
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
            <div className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-medium text-blue-800">🏷️ {category} Options</h3>
              
              <div>
                <label htmlFor="editItemType" className="block text-sm font-medium text-gray-700 mb-2">Item Type</label>
                <select
                  id="editItemType"
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
                        <label htmlFor="editMaxToppings" className="block text-sm font-medium text-gray-700">Max Toppings</label>
                        <input
                          id="editMaxToppings"
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
                        <label htmlFor="editMaxSauces" className="block text-sm font-medium text-gray-700">Max Sauces</label>
                        <input
                          id="editMaxSauces"
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

              {/* Side Size Pricing */}
              {itemType === 'sideWithSizes' && (
                <div className="mt-4 p-3 bg-white rounded-lg border">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">🍟 Side Size Pricing</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="editSideSmallPrice" className="block text-sm font-medium text-gray-700">Small</label>
                      <input
                        id="editSideSmallPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={sideSmallPrice}
                        onChange={(e) => setSideSmallPrice(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="editSideLargePrice" className="block text-sm font-medium text-gray-700">Large</label>
                      <input
                        id="editSideLargePrice"
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
                      <label htmlFor="editDrinkSmallPrice" className="block text-sm font-medium text-gray-700">Small</label>
                      <input
                        id="editDrinkSmallPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={drinkSmallPrice}
                        onChange={(e) => setDrinkSmallPrice(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="editDrinkMediumPrice" className="block text-sm font-medium text-gray-700">Medium</label>
                      <input
                        id="editDrinkMediumPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={drinkMediumPrice}
                        onChange={(e) => setDrinkMediumPrice(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="editDrinkLargePrice" className="block text-sm font-medium text-gray-700">Large</label>
                      <input
                        id="editDrinkLargePrice"
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

              {/* Size Pricing - show for specialty pizzas */}
              {itemType === 'specialtyPizza' && (
                <div className="mt-4 p-3 bg-white rounded-lg border">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">🍕 Size Pricing</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="editSmallPrice" className="block text-sm font-medium text-gray-700">Small</label>
                      <input
                        id="editSmallPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={smallPrice}
                        onChange={(e) => setSmallPrice(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="editMediumPrice" className="block text-sm font-medium text-gray-700">Medium</label>
                      <input
                        id="editMediumPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={mediumPrice}
                        onChange={(e) => setMediumPrice(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="editLargePrice" className="block text-sm font-medium text-gray-700">Large</label>
                      <input
                        id="editLargePrice"
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
            </div>
            <div className="flex justify-end pt-4">
                <button type="button" onClick={onClose} className="mr-2 px-4 py-2 rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300">Cancel</button>
                <button type="submit" disabled={isUploading} className="px-4 py-2 rounded-md text-white bg-[#800000] hover:bg-red-800 flex items-center disabled:bg-gray-400">
                    <Save className="h-5 w-5 mr-2" />
                    {isUploading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};