import { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, storage } from '../services/firebase';
import { ref, deleteObject } from 'firebase/storage';
import { Plus } from 'lucide-react';
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
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-card-foreground">Menu Management</h1>
        <Button 
          onClick={() => setIsAddDialogOpen(true)}
          className="px-4 py-2 rounded-md text-white bg-[#800000] hover:bg-red-800 flex items-center disabled:bg-gray-400"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Menu Item
        </Button>
      </div>

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

      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                className={`${
                  selectedCategoryId === category.id
                    ? 'border-[#800000] text-[#800000]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                {category.name}
              </button>
            ))}
          </nav>
        </div>

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
      </div>
    </div>
  );
};

export default Menu;