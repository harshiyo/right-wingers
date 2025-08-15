// Topping image mapping utility
// Maps topping names to their corresponding image files in the assets/Toppings folder

const images = import.meta.glob('/src/assets/Toppings/*.png', { eager: true, as: 'url' });

export const toppingImageMap: Record<string, string> = {
  'pepperoni': images['/src/assets/Toppings/pepperoni.png'],
  'ham': images['/src/assets/Toppings/ham.png'],
  'bacon': images['/src/assets/Toppings/real-bacon.png'],
  'bacon-bits': images['/src/assets/Toppings/bacon-bits.png'],
  'ground-beef': images['/src/assets/Toppings/ground-beef.png'],
  'italian-sausage': images['/src/assets/Toppings/italian-sausage.png'],
  'hot-italian-sausage': images['/src/assets/Toppings/hot-italian-sausage.png'],
  'chicken': images['/src/assets/Toppings/chicken.png'],
  'pesto': images['/src/assets/Toppings/pesto.png'],
  'mushrooms': images['/src/assets/Toppings/mushrooms.png'],
  'onion': images['/src/assets/Toppings/onion.png'],
  'green-peppers': images['/src/assets/Toppings/green-peppers.png'],
  'red-peppers': images['/src/assets/Toppings/red-peppers.png'],
  'black-olives': images['/src/assets/Toppings/black-olives.png'],
  'green-olives': images['/src/assets/Toppings/green-olives.png'],
  'tomato': images['/src/assets/Toppings/tomato.png'],
  'pineapple': images['/src/assets/Toppings/pineapple.png'],
  'jalapeno': images['/src/assets/Toppings/jalapeno.png'],
  'hot-peppers': images['/src/assets/Toppings/hot-peppers.png'],
  'sundried-tomatoes': images['/src/assets/Toppings/sundried-tomatoes.png'],
  'feta-cheese': images['/src/assets/Toppings/feta-cheese.png'],
};


/**
 * Get the image path for a topping by name
 * @param toppingName - The name of the topping
 * @returns The image path or null if not found
 */
export const getToppingImage = (toppingName: string): string | null => {
  // Normalize the topping name for matching
  const normalizedName = toppingName.toLowerCase().replace(/\s+/g, '-');
  
  // Direct match
  if (toppingImageMap[normalizedName]) {
    return toppingImageMap[normalizedName];
  }
  
  // Try partial matches for common variations
  for (const [key, value] of Object.entries(toppingImageMap)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return value;
    }
  }
  
  return null;
};

/**
 * Get all available topping images
 * @returns Array of topping image paths
 */
export const getAllToppingImages = (): string[] => {
  return Object.values(toppingImageMap);
}; 