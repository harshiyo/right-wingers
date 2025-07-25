import React, { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db, storage } from '../services/firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface Combo {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  imageUrl?: string;
  components: ComboComponent[];
}

interface ComboComponent {
  type: 'pizza' | 'wings' | 'side' | 'drink';
  itemId: string;
  itemName: string;
  quantity: number;
  maxToppings?: number;
  maxSauces?: number;
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
      default: return null;
    }
  };

  if (loading || loadingMenu) return <div className="p-6">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-card-foreground">Combo Meals</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold mb-4">{editingCombo ? 'Edit Combo' : 'Create New Combo'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Family Feast" required />
              <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description of the combo" />
              <Input type="number" step="0.01" value={formData.basePrice} onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })} placeholder="0.00" required />
              
              {/* Image Upload */}
              <div>
                <label htmlFor="comboImage" className="block text-sm font-medium text-gray-700 mb-1">Combo Image</label>
                <input 
                  type="file" 
                  id="comboImage" 
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)} 
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
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

              <div className="flex flex-wrap gap-2 mb-3">
                {['pizza', 'wings', 'side', 'drink'].map((type) => (
                  <Button key={type} type="button" size="sm" variant="outline" className="rounded-full border-dashed text-sm" onClick={() => addComponent(type as ComboComponent['type'])}>
                    {typeIcon(type as ComboComponent['type'])} Add {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>
              <div className="space-y-4">
                {formData.components.map((component, index) => (
                  <div key={index} className="relative rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-base font-semibold capitalize">
                        {typeIcon(component.type)} {component.type}
                      </div>
                      <Button size="sm" variant="ghost" type="button" onClick={() => removeComponent(index)} className="text-destructive">Remove</Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input type="number" min="1" value={component.quantity} onChange={(e) => updateComponent(index, 'quantity', parseInt(e.target.value) || 1)} placeholder="Quantity" />
                      <select value={component.itemId} onChange={(e) => {
                        const selectedItem = menuItems.find(item => item.id === e.target.value);
                        updateComponent(index, 'itemId', e.target.value);
                        updateComponent(index, 'itemName', selectedItem?.name || '');
                      }} className="w-full border rounded px-2 py-1 text-sm">
                        <option value="">Select {component.type}</option>
                        {menuItems.filter(item => {
                          const cat = item.category?.toLowerCase() || '';
                          const type = component.type;
                          // Accept singular or plural (e.g., drink/drinks)
                          return cat === type || cat === type + 's';
                        }).map(item => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                    {component.type === 'pizza' && (
                      <Input type="number" min="0" value={component.maxToppings || 0} onChange={(e) => updateComponent(index, 'maxToppings', parseInt(e.target.value) || 0)} placeholder="Max Toppings" className="mt-3" />
                    )}
                    {component.type === 'wings' && (
                      <Input type="number" min="0" value={component.maxSauces || 0} onChange={(e) => updateComponent(index, 'maxSauces', parseInt(e.target.value) || 0)} placeholder="Max Sauces" className="mt-3" />
                    )}
                    {(component.type === 'drink' || component.type === 'side') && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium mb-1">Available Sizes</label>
                        <select
                          multiple
                          className="w-full border rounded px-2 py-1 text-sm mb-2"
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
                        <label className="block text-sm font-medium mb-1">Default Size</label>
                        <select
                          className="w-full border rounded px-2 py-1 text-sm"
                          value={component.defaultSize || ''}
                          onChange={e => updateComponent(index, 'defaultSize', e.target.value)}
                        >
                          <option value="">Select default size</option>
                          {(component.availableSizes || []).map(size => (
                            <option key={size} value={size}>{size}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center pt-2 gap-2">
                <Button type="submit" disabled={isSaving || !formData.name.trim()} className="w-full justify-center">
                  <Plus className="h-5 w-5 mr-2" />
                  {isSaving ? 'Saving...' : (editingCombo ? 'Update Combo' : 'Create Combo')}
                </Button>
                {editingCombo && (
                  <Button type="button" onClick={resetForm} variant="secondary">
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold mb-4">Available Combos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {combos.map((combo) => (
                <div key={combo.id} className="bg-white rounded-xl border border-gray-200 shadow-md p-4">
                  {combo.imageUrl && (
                    <div className="mb-3">
                      <img 
                        src={combo.imageUrl} 
                        alt={combo.name}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{combo.name}</h3>
                      <span className="text-maroon font-semibold text-base">${combo.basePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button onClick={() => handleEdit(combo)} variant="ghost" size="icon"><Edit className="h-5 w-5" /></Button>
                      <Button onClick={() => handleDelete(combo.id)} variant="ghost" size="icon"><Trash2 className="h-5 w-5 text-destructive" /></Button>
                    </div>
                  </div>
                  {combo.description && (
                    <div className="text-muted-foreground mb-2 text-sm">{combo.description}</div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {combo.components.map((comp, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-gray-700 bg-[#f9f9f9] border border-gray-300 shadow-sm">
                        {typeIcon(comp.type)} {comp.quantity}x {comp.itemName}
                        {comp.type === 'pizza' && comp.maxToppings !== undefined && (
                          <span className="ml-1 text-gray-500">/ {comp.maxToppings} toppings</span>
                        )}
                        {comp.type === 'wings' && comp.maxSauces !== undefined && (
                          <span className="ml-1 text-gray-500">/ {comp.maxSauces} sauces</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Combos;
