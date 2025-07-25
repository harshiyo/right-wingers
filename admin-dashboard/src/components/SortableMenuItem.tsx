import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Edit, Trash2 } from 'lucide-react';

// Assuming MenuItem is defined elsewhere and imported
interface MenuItem {
    id: string;
    name: string;
    price: number;
    category: string;
    imageUrl?: string;
    position: number;
}

interface SortableMenuItemProps {
    item: MenuItem;
    onEdit: (item: MenuItem) => void;
    onDelete: (item: MenuItem) => void;
}

export const SortableMenuItem = ({ item, onEdit, onDelete }: SortableMenuItemProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
        opacity: isDragging ? 0.75 : 1,
        transformOrigin: '0 0',
    };

    return (
        <div ref={setNodeRef} style={style} className="bg-gray-50 rounded-lg shadow-sm p-4 flex flex-col group text-center touch-none">
            <div className="relative w-full">
                <img src={item.imageUrl} alt={item.name} className="w-full h-32 object-cover rounded-md mb-4" />
                <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button {...attributes} {...listeners} className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 cursor-grab active:cursor-grabbing">
                        <GripVertical className="h-4 w-4 text-gray-500" />
                    </button>
                    <button onClick={() => onEdit(item)} className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100">
                        <Edit className="h-4 w-4 text-blue-600" />
                    </button>
                    <button onClick={() => onDelete(item)} className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100">
                        <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                </div>
            </div>
            <h3 className="font-semibold text-gray-900">{item.name}</h3>
            <p className="text-sm text-gray-600">${item.price.toFixed(2)}</p>
        </div>
    );
}; 