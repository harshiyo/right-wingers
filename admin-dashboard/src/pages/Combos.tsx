import React, { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db, storage } from '../services/firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plus, Edit, Trash2, Tag, Grid3X3, Sparkles, Package } from 'lucide-react';

interface Combo {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
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
  availableSizes?: string[];
  defaultSize?: string;
}

const Combos = () => {
  const [combosSnapshot, loading] = useCollection(collection(db, 'combos'));
  const [menuItemsSnapshot, loadingMenu] = useCollection(query(collection(db, 'menuItems'), orderBy('name')));
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: 0,
    imageUrl: '',
    components: [] as ComboComponent[],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const combos = combosSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Combo)) || [];
  const menuItems = menuItemsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)) || [];

  const resetForm = () => {
    setEditingCombo(null);
    setFormData({ name: '', description: '', basePrice: 0, imageUrl: '', components: [] });
    setImageFile(null);
  };

  const handleEdit = (combo: Combo) => {
    setEditingCombo(combo);
    setFormData({
      name: combo.name,
      description: combo.description || '',
      basePrice: combo.basePrice,
      imageUrl: combo.imageUrl || '',
      components: combo.components || [],
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this combo?')) {
      await deleteDoc(doc(db, 'combos', id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let imageUrl = formData.imageUrl;
      
      // Upload new image if selected
      if (imageFile) {
        const storageRef = ref(storage, `combos/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      const comboData: any = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        basePrice: parseFloat(formData.basePrice.toFixed(2)),
        components: formData.components,
      };

      // Only include imageUrl if it exists
      if (imageUrl && imageUrl.trim()) {
        comboData.imageUrl = imageUrl;
      }

      if (editingCombo) {
        await updateDoc(doc(db, 'combos', editingCombo.id), comboData);
      } else {
        await addDoc(collection(db, 'combos'), comboData);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving combo:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addComponent = (type: ComboComponent['type']) => {
    const newComponent: ComboComponent = {
      type,
      itemId: '',
      itemName: '',
      quantity: 1,
    };
    setFormData(prev => ({
      ...prev,
      components: [...prev.components, newComponent],
    }));
  };

  const updateComponent = (index: number, field: keyof ComboComponent, value: any) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.map((comp, i) =>
        i === index ? { ...comp, [field]: value } : comp
      ),
    }));
  };

  const removeComponent = (index: number) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index),
    }));
  };

  const typeIcon = (type: ComboComponent['type']) => {
    switch (type) {
      case 'pizza': return <span title="Pizza" className="mr-1">🍕</span>;
      case 'wings': return <span title="Wings" className="mr-1">🍗</span>;
      case 'side': return <span title="Side" className="mr-1">🍟</span>;
      case 'drink': return <span title="Drink" className="mr-1">🥤</span>;
      case 'dipping': return <span title="Dipping Sauce" className="mr-1">🥄</span>;
      default: return null;
    }
  };

  if (loading || loadingMenu) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <span className="text-lg text-gray-600">Loading combos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Combo Meals</h1>
              <p className="text-lg text-gray-600">Create irresistible meal combinations for your customers</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-[#800000] to-red-700 rounded-xl">
                <Package className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add/Edit Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-[#800000] to-red-700 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Plus className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {editingCombo ? 'Edit Combo' : 'Create New Combo'}
                  </h2>
                </div>
              </div>
              
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="comboName" className="block text-sm font-semibold text-gray-700">
                      Combo Name
                    </label>
                    <Input 
                      id="comboName"
                      value={formData.name} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                      placeholder="e.g., Family Feast" 
                      required 
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="comboDescription" className="block text-sm font-semibold text-gray-700">
                      Description
                    </label>
                    <Input 
                      id="comboDescription"
                      value={formData.description} 
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                      placeholder="Description of the combo" 
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="comboPrice" className="block text-sm font-semibold text-gray-700">
                      Base Price
                    </label>
                    <Input 
                      id="comboPrice"
                      type="number" 
                      step="0.01" 
                      value={formData.basePrice} 
                      onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })} 
                      placeholder="0.00" 
                      required 
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                    />
                  </div>
                  
                  {/* Image Upload */}
                  <div className="space-y-2">
                    <label htmlFor="comboImage" className="block text-sm font-semibold text-gray-700">
                      Combo Image
                    </label>
                    <input 
                      type="file" 
                      id="comboImage" 
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)} 
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" 
                    />
                    {formData.imageUrl && !imageFile && (
                      <div className="mt-2">
                        <img src={formData.imageUrl} alt="Current combo" className="w-20 h-20 object-cover rounded-lg border" />
                        <p className="text-xs text-gray-500 mt-1">Current image (select new file to replace)</p>
                      </div>
                    )}
                    {imageFile && (
                      <div className="mt-2">
                        <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-20 h-20 object-cover rounded-lg border" />
                        <p className="text-xs text-gray-500 mt-1">New image preview</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-700">Add Components</label>
                    <div className="flex flex-wrap gap-2">
                      {['pizza', 'wings', 'side', 'drink', 'dipping'].map((type) => (
                        <Button 
                          key={type} 
                          type="button" 
                          size="sm" 
                          variant="outline" 
                          className="rounded-full border-dashed text-sm hover:bg-red-50 hover:border-red-300 hover:text-red-700" 
                          onClick={() => addComponent(type as ComboComponent['type'])}
                        >
                          {typeIcon(type as ComboComponent['type'])} Add {type === 'dipping' ? 'Dipping Sauce' : type.charAt(0).toUpperCase() + type.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {formData.components.map((component, index) => (
                      <div key={index} className="relative rounded-xl border border-gray-300 bg-gray-50 p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 text-base font-semibold capitalize">
                            {typeIcon(component.type)} {component.type}
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            type="button" 
                            onClick={() => removeComponent(index)} 
                            className="text-red-600 hover:bg-red-100 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input 
                            type="number" 
                            min="1" 
                            value={component.quantity} 
                            onChange={(e) => updateComponent(index, 'quantity', parseInt(e.target.value) || 1)} 
                            placeholder="Quantity" 
                            className="px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                          />
                          <select 
                            value={component.itemId} 
                            onChange={(e) => {
                              const selectedItem = menuItems.find(item => item.id === e.target.value);
                              updateComponent(index, 'itemId', e.target.value);
                              updateComponent(index, 'itemName', selectedItem?.name || '');
                            }} 
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                          >
                            <option value="">Select {component.type}</option>
                            {menuItems.filter(item => {
                              const cat = item.category?.toLowerCase() || '';
                              const type = component.type;
                              return cat === type || cat === type + 's';
                            }).map(item => (
                              <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                          </select>
                        </div>
                        {component.type === 'pizza' && (
                          <Input 
                            type="number" 
                            min="0" 
                            value={component.maxToppings || 0} 
                            onChange={(e) => updateComponent(index, 'maxToppings', parseInt(e.target.value) || 0)} 
                            placeholder="Max Toppings" 
                            className="mt-3 px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                          />
                        )}
                        {component.type === 'wings' && (
                          <Input 
                            type="number" 
                            min="0" 
                            value={component.maxSauces || 0} 
                            onChange={(e) => updateComponent(index, 'maxSauces', parseInt(e.target.value) || 0)} 
                            placeholder="Max Sauces" 
                            className="mt-3 px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                          />
                        )}
                        {component.type === 'dipping' && (
                          <Input 
                            type="number" 
                            min="0" 
                            value={component.maxDipping || 0} 
                            onChange={(e) => updateComponent(index, 'maxDipping', parseInt(e.target.value) || 0)} 
                            placeholder="Max Dipping Sauces" 
                            className="mt-3 px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                          />
                        )}
                        {(component.type === 'drink' || component.type === 'side') && (
                          <div className="mt-3 space-y-3">
                            <div>
                              <label className="block text-sm font-medium mb-2">Available Sizes</label>
                              <select
                                multiple
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                                value={component.availableSizes || []}
                                onChange={e => {
                                  const options = Array.from(e.target.selectedOptions).map(opt => opt.value);
                                  updateComponent(index, 'availableSizes', options);
                                  if (component.defaultSize && !options.includes(component.defaultSize)) {
                                    updateComponent(index, 'defaultSize', '');
                                  }
                                }}
                              >
                                {['Small', 'Medium', 'Large'].map(size => (
                                  <option key={size} value={size}>{size}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Default Size</label>
                              <select
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-red-600 focus:border-red-600 transition-colors"
                                value={component.defaultSize || ''}
                                onChange={e => updateComponent(index, 'defaultSize', e.target.value)}
                              >
                                <option value="">Select default size</option>
                                {(component.availableSizes || []).map(size => (
                                  <option key={size} value={size}>{size}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    {editingCombo && (
                      <Button 
                        type="button" 
                        onClick={resetForm} 
                        variant="secondary"
                        className="flex-1 px-6 py-3 rounded-xl font-medium"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button 
                      type="submit" 
                      disabled={isSaving || !formData.name.trim()} 
                      className="flex-1 px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-[#800000] to-red-700 hover:from-[#700000] hover:to-red-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      {isSaving ? 'Saving...' : (editingCombo ? 'Update Combo' : 'Create Combo')}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Combos List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-[#800000] to-red-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Grid3X3 className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Available Combos</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium text-white">
                      {combos.length} combos
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {combos.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No combos found</h3>
                    <p className="text-gray-500">Create your first combo to get started!</p>
                  </div>
                )}
                
                {combos.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {combos.map((combo) => (
                      <div key={combo.id} className="group relative bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all duration-200 hover:border-red-300">
                        {combo.imageUrl && (
                          <div className="mb-3">
                            <img 
                              src={combo.imageUrl} 
                              alt={combo.name}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          </div>
                        )}
                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-gray-800">{combo.name}</h3>
                            <span className="text-red-600 font-semibold text-base">${combo.basePrice.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Button 
                              onClick={() => handleEdit(combo)} 
                              variant="ghost" 
                              size="icon"
                              className="w-8 h-8 rounded-lg hover:bg-red-100 hover:text-red-600"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              onClick={() => handleDelete(combo.id)} 
                              variant="ghost" 
                              size="icon"
                              className="w-8 h-8 rounded-lg hover:bg-red-100 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {combo.description && (
                          <div className="text-gray-600 mb-3 text-sm">{combo.description}</div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {combo.components.map((comp, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-gray-700 bg-red-50 border border-red-200 shadow-sm">
                              {typeIcon(comp.type)} {comp.quantity}x {comp.itemName}
                              {comp.type === 'pizza' && comp.maxToppings !== undefined && (
                                <span className="ml-1 text-gray-500">/ {comp.maxToppings} toppings</span>
                              )}
                              {comp.type === 'wings' && comp.maxSauces !== undefined && (
                                <span className="ml-1 text-gray-500">/ {comp.maxSauces} sauces</span>
                              )}
                              {comp.type === 'dipping' && comp.maxDipping !== undefined && (
                                <span className="ml-1 text-gray-500">/ {comp.maxDipping} dipping sauces</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Combos;
