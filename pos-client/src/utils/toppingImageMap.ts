// Topping image mapping utility
// Maps topping names to their corresponding image files in the assets/Toppings folder

export const toppingImageMap: Record<string, string> = {
  // Meats
  'pepperoni': '/src/assets/Toppings/pepperoni.png',
  'ham': '/src/assets/Toppings/ham.png',
  'bacon': '/src/assets/Toppings/real-bacon.png',
  'bacon-bits': '/src/assets/Toppings/bacon-bits.png',
  'ground-beef': '/src/assets/Toppings/ground-beef.png',
  'italian-sausage': '/src/assets/Toppings/italian-sausage.png',
  'hot-italian-sausage': '/src/assets/Toppings/hot-italian-sausage.png',
  'chicken': '/src/assets/Toppings/chicken.png',
  
  // Vegetables
  'mushrooms': '/src/assets/Toppings/mushrooms.png',
  'onion': '/src/assets/Toppings/onion.png',
  'green-peppers': '/src/assets/Toppings/green-peppers.png',
  'red-peppers': '/src/assets/Toppings/red-peppers.png',
  'black-olives': '/src/assets/Toppings/black-olives.png',
  'green-olives': '/src/assets/Toppings/green-olives.png',
  'tomato': '/src/assets/Toppings/tomato.png',
  'pineapple': '/src/assets/Toppings/pineapple.png',
  'jalapeno': '/src/assets/Toppings/jalapeno.png',
  'hot-peppers': '/src/assets/Toppings/hot-peppers.png',
  'sundried-tomatoes': '/src/assets/Toppings/sundried-tomatoes.png',
  
  // Cheeses
  'feta-cheese': '/src/assets/Toppings/feta-cheese.png',
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