import React, { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, addDoc, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Plus, Trash2, Edit } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

// Common restaurant emojis
const COMMON_EMOJIS = [
  '🍕', '🍔', '🌮', '🍟', '🍗', '🥩', '🍖', '🥓',
  '🥪', '🌯', '🥙', '🍜', '🍝', '🍛', '🍚', '🍣',
  '🍱', '🥟', '🥠', '🍤', '🍙', '🍘', '🍥', '🥮',
  '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂',
  '🍮', '🍭', '🍬', '🍫', '🍩', '🍪', '🌰', '🥜',
  '🍺', '🍷', '🥤', '🧃', '🥛', '☕', '🍵', '🧋',
  '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🥔',
  '🍅', '🍆', '🥑', '🥝', '🍎', '🍐', '🍊', '🍋'
];

interface Category {
  id: string;
  name: string;
  icon: string;
  createdAt: any;
}

const Categories = () => {
  const [categories, loading, error] = useCollection(collection(db, 'categories'));
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim() === '' || newCategoryIcon.trim() === '') return;

    await addDoc(collection(db, 'categories'), {
      name: newCategoryName,
      icon: newCategoryIcon,
      createdAt: serverTimestamp(),
    });

    setNewCategoryName('');
    setNewCategoryIcon('');
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      await deleteDoc(doc(db, 'categories', id));
    }
  };
  
  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || editingCategory.name.trim() === '' || editingCategory.icon.trim() === '') return;
    
    const categoryDoc = doc(db, 'categories', editingCategory.id);
    await updateDoc(categoryDoc, {
        name: editingCategory.name,
        icon: editingCategory.icon,
    });
    
    setEditingCategory(null);
  }

  const handleEmojiSelect = (emoji: string) => {
    if (editingCategory) {
      setEditingCategory({ ...editingCategory, icon: emoji });
    } else {
      setNewCategoryIcon(emoji);
    }
    setShowEmojiPicker(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-card-foreground">Manage Categories</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Add/Edit Form */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold mb-4">{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
            <form onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory} className="space-y-4">
              <Input
                type="text"
                id="categoryName"
                value={editingCategory ? editingCategory.name : newCategoryName}
                onChange={(e) => editingCategory ? setEditingCategory({...editingCategory, name: e.target.value}) : setNewCategoryName(e.target.value)}
                placeholder="e.g., Pizza"
                required
              />
              <div>
                <label htmlFor="categoryIcon" className="block text-sm font-medium text-gray-700">Icon (Emoji Only)</label>
                <div className="relative flex items-center gap-2">
                  <Input
                    type="text"
                    id="categoryIcon"
                    value={editingCategory ? editingCategory.icon : newCategoryIcon}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\p{Emoji}+$/u.test(value) || value === "") {
                        editingCategory ? setEditingCategory({...editingCategory, icon: value}) : setNewCategoryIcon(value);
                      }
                    }}
                    placeholder="e.g., 🍕"
                    maxLength={2}
                    required
                    className="text-2xl text-center"
                  />
                  <button
                    type="button"
                    className="ml-1 px-2 py-1 rounded bg-gray-100 border border-gray-300 hover:bg-gray-200"
                    onClick={() => setShowEmojiPicker((v) => !v)}
                    tabIndex={-1}
                  >
                    😊
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute z-50 top-12 left-0 bg-white border border-gray-300 rounded-lg shadow-lg p-3 max-h-64 overflow-y-auto">
                      <div className="grid grid-cols-8 gap-1">
                        {COMMON_EMOJIS.map((emoji, index) => (
                          <button
                            key={index}
                            type="button"
                            className="w-8 h-8 text-lg hover:bg-gray-100 rounded flex items-center justify-center"
                            onClick={() => handleEmojiSelect(emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Please enter a single emoji (e.g., 🍕). No text or HTML.</p>
              </div>
              <div className="flex gap-2 pt-2">
                {editingCategory && (
                  <Button type="button" onClick={() => setEditingCategory(null)} variant="secondary">
                    Cancel
                  </Button>
                )}
                <Button type="submit" className="px-4 py-2 rounded-md text-white bg-[#800000] hover:bg-red-800 flex items-center disabled:bg-gray-400 w-full justify-center">
                  {editingCategory ? 'Update Category' : 'Add Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Category List */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold mb-4">Existing Categories</h2>
            <ul className="space-y-3">
              {loading && <p>Loading...</p>}
              {error && <p className="text-destructive">Error: {error.message}</p>}
              {categories && categories.docs.map(categoryDoc => {
                const category = { id: categoryDoc.id, ...categoryDoc.data() } as Category;
                return (
                  <li key={category.id} className="flex items-center justify-between p-3 bg-[#f9f9f9] rounded-lg border border-gray-200">
                    <div className="flex items-center">
                      <span className="text-2xl mr-4">{category.icon}</span>
                      <span className="font-medium text-gray-800">{category.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button onClick={() => setEditingCategory(category)} variant="ghost" size="icon">
                        <Edit className="h-5 w-5" />
                      </Button>
                      <Button onClick={() => handleDeleteCategory(category.id)} variant="ghost" size="icon">
                        <Trash2 className="h-5 w-5 text-destructive" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Categories; 