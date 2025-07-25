import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { doc, getDoc, deleteDoc, setDoc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Monitor, RotateCcw } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  icon: string;
  order?: number;
}

interface SortableCategoryProps {
  category: Category;
  index: number;
}

function SortableCategory({ category, index }: SortableCategoryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center p-3 bg-white border rounded-lg shadow-sm ${
        isDragging ? 'shadow-lg scale-105 z-50' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="p-1 mr-3 rounded cursor-grab active:cursor-grabbing transition-colors text-gray-400 hover:text-gray-600"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <span className="text-2xl mr-3">{category.icon}</span>
      <span className="font-medium text-gray-800">{category.name}</span>
      <div className="ml-auto text-sm text-gray-500">#{index + 1}</div>
    </div>
  );
}

const LayoutManager = () => {
  // POS Category Order Management
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [posCategories, setPosCategories] = useState<Category[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load categories from Firebase
  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const categoriesRef = collection(db, 'categories');
      const categoriesQuery = query(categoriesRef, orderBy('name'));
      
      // Subscribe to real-time updates
      const unsubscribe = onSnapshot(categoriesQuery, (snapshot) => {
        const categoriesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Category));
        
        setCategories(categoriesData);
        loadPOSCategoryOrder(categoriesData);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadPOSCategoryOrder = async (availableCategories: Category[]) => {
    try {
      const docRef = doc(db, 'settings', 'posCategoryOrder');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.categoryOrder) {
          const orderedCategories = [...availableCategories].sort((a, b) => {
            const aIndex = data.categoryOrder.findIndex((item: any) => item.id === a.id);
            const bIndex = data.categoryOrder.findIndex((item: any) => item.id === b.id);
            
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
          });

          const combosCategory = { id: 'combos', name: 'Combos', icon: '🎁' };
          const combosIndex = data.categoryOrder.findIndex((item: any) => item.id === 'combos');
          
          if (combosIndex !== -1) {
            orderedCategories.splice(combosIndex, 0, combosCategory);
          } else {
            orderedCategories.push(combosCategory);
          }

          setPosCategories(orderedCategories);
        } else {
          setPosCategories([...availableCategories, { id: 'combos', name: 'Combos', icon: '🎁' }]);
        }
      } else {
        setPosCategories([...availableCategories, { id: 'combos', name: 'Combos', icon: '🎁' }]);
      }
    } catch (error) {
      console.error('Error loading POS category order:', error);
      setPosCategories([...availableCategories, { id: 'combos', name: 'Combos', icon: '🎁' }]);
    }
  };

  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = posCategories.findIndex((item) => item.id === active.id);
      const newIndex = posCategories.findIndex((item) => item.id === over?.id);

      const newCategories = arrayMove(posCategories, oldIndex, newIndex);
      setPosCategories(newCategories);

      try {
        const categoryOrder = newCategories.map((item, index) => ({
          id: item.id,
          order: index
        }));

        await setDoc(doc(db, 'settings', 'posCategoryOrder'), {
          categoryOrder,
          updatedAt: new Date()
        });
      } catch (error) {
        console.error('Error saving POS category order:', error);
        setPosCategories(posCategories);
      }
    }
  };

  const resetPOSCategoryOrder = async () => {
    try {
      await deleteDoc(doc(db, 'settings', 'posCategoryOrder'));
      setPosCategories([...categories, { id: 'combos', name: 'Combos', icon: '🎁' }]);
      alert('POS category order has been reset to default.');
    } catch (error) {
      console.error('Error resetting POS category order:', error);
      alert('Failed to reset POS category order.');
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    loadCategories().then((unsub) => {
      unsubscribe = unsub;
    });
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">POS Layout Manager</h1>
        <p className="text-gray-600">Manage the layout and ordering of POS client interface elements.</p>
      </div>

      {/* POS Category Order Management */}
      <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl">
        <div className="flex items-center mb-4">
          <Monitor className="h-6 w-6 text-gray-700 mr-3" />
          <h2 className="text-xl font-semibold text-gray-800">POS Category Sidebar Order</h2>
        </div>
        <p className="text-gray-600 mb-6">
          Manage the order of category tabs in the POS client sidebar. Changes reflect immediately in the POS system.
        </p>
        
        {loadingCategories ? (
          <p className="text-gray-500">Loading categories...</p>
        ) : posCategories.length > 0 ? (
          <div className="space-y-4 mb-6">
            <h3 className="font-medium text-gray-700">Current Order:</h3>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleCategoryDragEnd}
            >
              <SortableContext
                items={posCategories.map(cat => cat.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {posCategories.map((category, index) => (
                    <SortableCategory key={category.id} category={category} index={index} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        ) : (
          <p className="text-gray-500 mb-6">No categories found.</p>
        )}
        
        <div className="flex gap-3">
          <Button
            onClick={resetPOSCategoryOrder}
            variant="outline"
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default Order
          </Button>
          <Button
            onClick={() => window.open('/menu', '_blank')}
            variant="outline"
            className="text-blue-600 border-blue-300 hover:bg-blue-50"
          >
            <Monitor className="h-4 w-4 mr-2" />
            Preview POS Client
          </Button>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-4xl">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">💡 Quick Tips</h3>
        <ul className="space-y-2 text-blue-700">
          <li>• <strong>Real-time Sync:</strong> Changes are saved automatically and sync to the POS client immediately</li>
          <li>• <strong>POS Categories:</strong> The "Combos" category is special and shows combo deals</li>
          <li>• <strong>Reset:</strong> Use reset button to restore alphabetical ordering with Combos at the end</li>
          <li>• <strong>Preview:</strong> Use the "Preview POS Client" button to see your changes in action</li>
        </ul>
      </div>
    </div>
  );
};

export default LayoutManager; 