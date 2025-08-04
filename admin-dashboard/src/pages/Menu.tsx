import { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, storage } from '../services/firebase';
import { ref, deleteObject } from 'firebase/storage';
import { Plus, Tag, Grid3X3, Sparkles, Utensils } from 'lucide-react';
import { AddMenuItemDialog } from '../components/AddMenuItemDialog';
import { EditMenuItemDialog } from '../components/EditMenuItemDialog';
import { SortableMenuItem } from '../components/SortableMenuItem';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '../components/ui/Button';

// Interfaces
interface Category {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
  position: number;
  tileColor?: string;
  isCustomizable?: boolean;
  maxToppings?: number;
  maxSauces?: number;
}

const Menu = () => {
  const [categoriesSnapshot] = useCollection(
    query(collection(db, 'categories'), orderBy('name'))
  );
  const [menuItemsSnapshot] = useCollection(
    query(collection(db, 'menuItems'), orderBy('position'))
  );

  const categories = categoriesSnapshot?.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  } as Category)) || [];

  const menuItems = menuItemsSnapshot?.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  } as MenuItem)) || [];

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Initialize selected category if not set and categories exist
  if (!selectedCategoryId && categories.length > 0) {
    setSelectedCategoryId(categories[0].id);
  }

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const filteredItems = menuItems.filter(item => item.category === selectedCategory?.name);

  const handleDeleteItem = async (item: MenuItem) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    
    try {
      await deleteDoc(doc(db, 'menuItems', item.id));
      if (item.imageUrl) {
        const imageRef = ref(storage, item.imageUrl);
        await deleteObject(imageRef);
      }
    } catch (error) {
      console.error("Error deleting menu item: ", error);
      alert("Failed to delete menu item.");
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredItems.findIndex((item) => item.id === active.id);
    const newIndex = filteredItems.findIndex((item) => item.id === over.id);

    const reorderedItems = arrayMove(filteredItems, oldIndex, newIndex);

    try {
      const batch = writeBatch(db);
      reorderedItems.forEach((item, index) => {
        const docRef = doc(db, 'menuItems', item.id);
        batch.update(docRef, { position: index });
      });
      await batch.commit();
    } catch (error) {
      console.error("Failed to update item positions: ", error);
    }
  };

  if (!categoriesSnapshot || !menuItemsSnapshot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <span className="text-lg text-gray-600">Loading menu...</span>
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
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Menu Management</h1>
              <p className="text-lg text-gray-600">Organize and customize your restaurant menu items</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-[#800000] to-red-700 rounded-xl">
                <Utensils className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#800000] to-red-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Utensils className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Menu Items</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium text-white">
                  {filteredItems.length} items in {selectedCategory?.name || 'All'}
                </span>
                <Button 
                  onClick={() => setIsAddDialogOpen(true)}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center gap-2 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Add Menu Item
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Category Tabs */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={`${
                        selectedCategoryId === category.id
                          ? 'border-red-600 text-red-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
                    >
                      {category.name}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Menu Items Grid */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Utensils className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No menu items found</h3>
                <p className="text-gray-500">
                  {selectedCategory 
                    ? `No items in the "${selectedCategory.name}" category.` 
                    : 'Create your first menu item to get started!'}
                </p>
                <Button 
                  onClick={() => setIsAddDialogOpen(true)}
                  className="mt-4 px-6 py-3 bg-gradient-to-r from-[#800000] to-red-700 hover:from-[#700000] hover:to-red-800 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Menu Item
                </Button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={filteredItems} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredItems.map(item => (
                      <SortableMenuItem
                        key={item.id}
                        item={item}
                        onEdit={setEditingItem}
                        onDelete={handleDeleteItem}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AddMenuItemDialog 
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        categories={categories}
        menuItems={menuItems}
      />

      <EditMenuItemDialog
        open={editingItem !== null}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        categories={categories}
      />
    </div>
  );
};

export default Menu;