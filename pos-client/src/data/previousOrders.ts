export interface OrderItem {
  id: string;
  name: string;
  size?: string;
  customizations?: string[];
  price: number;
  quantity: number;
}

export interface PreviousOrder {
  id: string;
  customerId: string;
  storeId: string; // Store where order was placed
  date: string;
  items: OrderItem[];
  total: number;
  orderType: 'pickup' | 'delivery';
  status: 'completed' | 'cancelled';
}

// Mock previous orders data
export const mockPreviousOrders: PreviousOrder[] = [
  // David Brown's orders (customerId matches from customers.ts)
  {
    id: "1001",
    customerId: "3", // David Brown's ID from customers.ts
    storeId: "store_003", // University store where David shops
    date: "2024-06-26",
    orderType: "pickup",
    status: "completed",
    total: 67.45,
    items: [
      {
        id: "item1",
        name: "Large Right Wing Special Pizza",
        size: "Large",
        customizations: ["Extra Pepperoni", "Extra Cheese", "Thick Crust", "Extra Sauce"],
        price: 24.99,
        quantity: 1
      },
      {
        id: "item2",
        name: "Buffalo Wings",
        size: "20 pieces",
        customizations: ["Extra Hot Sauce", "Ranch Dip", "Celery Sticks"],
        price: 23.99,
        quantity: 1
      },
      {
        id: "item3",
        name: "Garlic Bread",
        customizations: ["Extra Garlic", "Parmesan Cheese"],
        price: 8.99,
        quantity: 2
      },
      {
        id: "item4",
        name: "Soft Drink",
        size: "Large",
        customizations: ["Coca-Cola"],
        price: 4.99,
        quantity: 2
      }
    ]
  },
  {
    id: "1002",
    customerId: "3", // David Brown
    storeId: "store_003", // University store
    date: "2024-06-22",
    orderType: "delivery",
    status: "completed",
    total: 45.97,
    items: [
      {
        id: "item5",
        name: "Medium Meat Lovers Pizza",
        size: "Medium",
        customizations: ["Pepperoni", "Sausage", "Bacon", "Ham", "Ground Beef"],
        price: 19.99,
        quantity: 1
      },
      {
        id: "item6",
        name: "BBQ Wings",
        size: "15 pieces",
        customizations: ["BBQ Sauce", "Blue Cheese Dip"],
        price: 17.99,
        quantity: 1
      },
      {
        id: "item7",
        name: "Caesar Salad",
        customizations: ["Extra Croutons", "Parmesan", "Caesar Dressing"],
        price: 7.99,
        quantity: 1
      }
    ]
  },
  {
    id: "1003",
    customerId: "3", // David Brown
    storeId: "store_003", // University store
    date: "2024-06-18",
    orderType: "pickup",
    status: "completed",
    total: 32.47,
    items: [
      {
        id: "item8",
        name: "Large Pepperoni Pizza",
        size: "Large",
        customizations: ["Extra Cheese", "Thin Crust"],
        price: 18.99,
        quantity: 1
      },
      {
        id: "item9",
        name: "Hot Wings",
        size: "10 pieces",
        customizations: ["Extra Hot Sauce", "Ranch Dip"],
        price: 13.48,
        quantity: 1
      }
    ]
  },
  {
    id: "1004",
    customerId: "3", // David Brown
    storeId: "store_003", // University store
    date: "2024-06-15",
    orderType: "delivery",
    status: "completed",
    total: 89.95,
    items: [
      {
        id: "item10",
        name: "Large Supreme Pizza",
        size: "Large",
        customizations: ["Pepperoni", "Mushrooms", "Green Peppers", "Onions", "Black Olives", "Sausage"],
        price: 24.99,
        quantity: 1
      },
      {
        id: "item11",
        name: "Medium Hawaiian Pizza",
        size: "Medium", 
        customizations: ["Ham", "Pineapple", "Extra Cheese"],
        price: 16.99,
        quantity: 1
      },
      {
        id: "item12",
        name: "Honey Garlic Wings",
        size: "20 pieces",
        customizations: ["Honey Garlic Sauce", "Ranch Dip", "Blue Cheese"],
        price: 23.99,
        quantity: 1
      },
      {
        id: "item13",
        name: "Mozzarella Sticks",
        size: "8 pieces",
        customizations: ["Marinara Sauce"],
        price: 9.99,
        quantity: 1
      },
      {
        id: "item14",
        name: "Soft Drink",
        size: "Large",
        customizations: ["Pepsi"],
        price: 4.99,
        quantity: 3
      }
    ]
  },
  {
    id: "1005",
    customerId: "3", // David Brown
    storeId: "store_003", // University store
    date: "2024-06-10",
    orderType: "pickup",
    status: "completed",
    total: 28.97,
    items: [
      {
        id: "item15",
        name: "Small Veggie Pizza",
        size: "Small",
        customizations: ["Mushrooms", "Green Peppers", "Onions", "Tomatoes", "Black Olives"],
        price: 14.99,
        quantity: 1
      },
      {
        id: "item16",
        name: "Mild Wings",
        size: "12 pieces",
        customizations: ["Mild Sauce", "Ranch Dip"],
        price: 13.98,
        quantity: 1
      }
    ]
  },
  // Other customers' orders for variety (Sarah Wilson and Glenda A.)
  {
    id: "1006",
    customerId: "1", // Sarah Wilson 
    storeId: "store_001", // Downtown store where Sarah shops
    date: "2024-06-20",
    orderType: "delivery",
    status: "completed",
    total: 24.99,
    items: [
      {
        id: "item17",
        name: "Medium Margherita Pizza",
        size: "Medium",
        customizations: ["Fresh Basil", "Extra Mozzarella"],
        price: 16.99,
        quantity: 1
      },
      {
        id: "item18",
        name: "Garlic Bread",
        customizations: ["Extra Garlic"],
        price: 7.99,
        quantity: 1
      }
    ]
  },
  {
    id: "1007",
    customerId: "2", // Glenda A.
    storeId: "store_002", // Westside store where Glenda shops
    date: "2024-06-25",
    orderType: "pickup",
    status: "completed",
    total: 45.97,
    items: [
      {
        id: "item19",
        name: "Large Meat Lovers Pizza",
        size: "Large",
        customizations: ["Pepperoni", "Sausage", "Bacon", "Ham"],
        price: 22.99,
        quantity: 1
      },
      {
        id: "item20",
        name: "BBQ Wings",
        size: "15 pieces",
        customizations: ["BBQ Sauce", "Blue Cheese Dip"],
        price: 17.99,
        quantity: 1
      },
      {
        id: "item21",
        name: "Caesar Salad",
        customizations: ["Extra Croutons", "Parmesan"],
        price: 4.99,
        quantity: 1
      }
    ]
  }
];

// Helper function to extract customizations from Firebase order items
const extractCustomizations = (item: any): string[] => {
  const customizations: string[] = [];
  
  try {
    console.log(`🔍 Extracting customizations for item: ${item.name}`);
    console.log(`📦 Item customizations data:`, JSON.stringify(item.customizations, null, 2));
    console.log(`🔍 Item full data:`, JSON.stringify(item, null, 2));
    
    // Check for combo items first (this is how combos are typically stored)
    if (item.comboItems && Array.isArray(item.comboItems)) {
      console.log(`🎯 Found combo items:`, item.comboItems.length);
      item.comboItems.forEach((comboItem: any, index: number) => {
        const comboPrefix = `${comboItem.name || `Item ${index + 1}`}: `;
        
        // Handle toppings
        if (comboItem.toppings) {
          const toppings: string[] = [];
          if (comboItem.toppings.wholePizza) {
            toppings.push(...comboItem.toppings.wholePizza.map((t: any) => t.name).filter(Boolean));
          }
          if (comboItem.toppings.leftSide) {
            toppings.push(...comboItem.toppings.leftSide.map((t: any) => `${t.name} (Left)`).filter(Boolean));
          }
          if (comboItem.toppings.rightSide) {
            toppings.push(...comboItem.toppings.rightSide.map((t: any) => `${t.name} (Right)`).filter(Boolean));
          }
          if (toppings.length > 0) {
            customizations.push(`${comboPrefix}${toppings.join(', ')}`);
          }
        }
        
        // Handle sauces
        if (comboItem.sauces && Array.isArray(comboItem.sauces)) {
          const sauceNames = comboItem.sauces.map((s: any) => s.name).filter(Boolean);
          if (sauceNames.length > 0) {
            customizations.push(`${comboPrefix}Sauces: ${sauceNames.join(', ')}`);
          }
        }
        
        // Handle size
        if (comboItem.size) {
          customizations.push(`${comboPrefix}Size: ${comboItem.size}`);
        }
        
        // Handle instructions
        if (comboItem.instructions && Array.isArray(comboItem.instructions)) {
          const instructionNames = comboItem.instructions.map((i: any) => typeof i === 'string' ? i : i.name).filter(Boolean);
          if (instructionNames.length > 0) {
            customizations.push(`${comboPrefix}Instructions: ${instructionNames.join(', ')}`);
          }
        }
      });
      
      if (customizations.length > 0) {
        console.log(`✅ Extracted combo customizations for ${item.name}:`, customizations);
        return customizations;
      }
    }
    
    // Check for alternative field names that might contain customization data
    const possibleCustomizationFields = ['customizations', 'modifiers', 'options', 'extras', 'additions'];
    let customizationData = null;
    
    for (const fieldName of possibleCustomizationFields) {
      if (item[fieldName]) {
        console.log(`🎯 Found customization data in field: ${fieldName}`);
        customizationData = item[fieldName];
        break;
      }
    }
    
    // If no customization data found in any field, return empty array
    if (!customizationData) {
      console.log(`❌ No customization data found in any field for ${item.name}`);
      return [];
    }
    
    // Handle object with numeric keys (like modify order logic)
    if (customizationData && typeof customizationData === 'object' && !Array.isArray(customizationData) && Object.keys(customizationData).every(k => !isNaN(Number(k)))) {
      console.log(`📋 Processing object with numeric keys customizations`);
      const customizationsArr = Object.values(customizationData);
      
      customizationsArr.forEach((customizationObj: any, index: number) => {
        console.log(`🔧 Processing customization ${index}:`, JSON.stringify(customizationObj, null, 2));
        
        if (customizationObj && typeof customizationObj === 'object') {
          // Handle toppings object - extract actual topping names
          if (customizationObj.toppings && typeof customizationObj.toppings === 'object') {
            const toppingsForThisItem: string[] = [];
            
            // Handle wholePizza toppings
            if (customizationObj.toppings.wholePizza && Array.isArray(customizationObj.toppings.wholePizza)) {
              customizationObj.toppings.wholePizza.forEach((topping: any) => {
                if (topping && topping.name) {
                  toppingsForThisItem.push(topping.name);
                }
              });
            }
            
            // Handle leftSide toppings
            if (customizationObj.toppings.leftSide && Array.isArray(customizationObj.toppings.leftSide)) {
              customizationObj.toppings.leftSide.forEach((topping: any) => {
                if (topping && topping.name) {
                  toppingsForThisItem.push(`${topping.name} (Left)`);
                }
              });
            }
            
            // Handle rightSide toppings
            if (customizationObj.toppings.rightSide && Array.isArray(customizationObj.toppings.rightSide)) {
              customizationObj.toppings.rightSide.forEach((topping: any) => {
                if (topping && topping.name) {
                  toppingsForThisItem.push(`${topping.name} (Right)`);
                }
              });
            }
            
            // Add toppings
            if (toppingsForThisItem.length > 0) {
              customizations.push(`Toppings: ${toppingsForThisItem.join(', ')}`);
            }
          }
          
          // Handle instructions
          if (customizationObj.instructions && Array.isArray(customizationObj.instructions) && customizationObj.instructions.length > 0) {
            const validInstructions = customizationObj.instructions.filter((instruction: any) => {
              if (typeof instruction === 'string' && instruction.trim()) {
                return true;
              } else if (instruction && instruction.name) {
                return true;
              }
              return false;
            });
            
            if (validInstructions.length > 0) {
              const instructionNames = validInstructions.map((instruction: any) => 
                typeof instruction === 'string' ? instruction : instruction.name
              );
              customizations.push(`Instructions: ${instructionNames.join(', ')}`);
            }
          }
          
          // Handle sauces
          if (customizationObj.sauces && Array.isArray(customizationObj.sauces) && customizationObj.sauces.length > 0) {
            const sauceNames = customizationObj.sauces
              .filter((sauce: any) => sauce && sauce.name)
              .map((sauce: any) => sauce.name);
            
            if (sauceNames.length > 0) {
              customizations.push(`Sauces: ${sauceNames.join(', ')}`);
            }
          }
          
          // Handle size
          if (customizationObj.size && typeof customizationObj.size === 'string') {
            customizations.push(`Size: ${customizationObj.size}`);
          }
        } else if (typeof customizationObj === 'string') {
          // Handle simple string customizations
          customizations.push(customizationObj);
        }
      });
    }
    
    // Handle Firebase structure: customizations is an array of customization objects
    else if (Array.isArray(customizationData)) {
      console.log(`📋 Processing array customizations (${customizationData.length} items)`);
      
      // Check if this is a combo with multiple items
      const isCombo = item.name && item.name.toLowerCase().includes('combo');
      let pizzaCount = 0;
      
      customizationData.forEach((customizationObj: any, index: number) => {
        console.log(`🔧 Processing customization ${index}:`, JSON.stringify(customizationObj, null, 2));
        
        if (customizationObj && typeof customizationObj === 'object') {
          
          // For combos, add pizza number prefix
          let prefix = '';
          if (isCombo && customizationObj.type === 'pizza') {
            pizzaCount++;
            prefix = `Pizza ${pizzaCount}: `;
          }
          
          // Handle toppings object - extract actual topping names
          if (customizationObj.toppings && typeof customizationObj.toppings === 'object') {
            const toppingsForThisItem: string[] = [];
            
            // Handle wholePizza toppings
            if (customizationObj.toppings.wholePizza && Array.isArray(customizationObj.toppings.wholePizza)) {
              customizationObj.toppings.wholePizza.forEach((topping: any) => {
                if (topping && topping.name) {
                  toppingsForThisItem.push(topping.name);
                }
              });
            }
            
            // Handle leftSide toppings
            if (customizationObj.toppings.leftSide && Array.isArray(customizationObj.toppings.leftSide)) {
              customizationObj.toppings.leftSide.forEach((topping: any) => {
                if (topping && topping.name) {
                  toppingsForThisItem.push(`${topping.name} (Left)`);
                }
              });
            }
            
            // Handle rightSide toppings
            if (customizationObj.toppings.rightSide && Array.isArray(customizationObj.toppings.rightSide)) {
              customizationObj.toppings.rightSide.forEach((topping: any) => {
                if (topping && topping.name) {
                  toppingsForThisItem.push(`${topping.name} (Right)`);
                }
              });
            }
            
            // Add toppings with prefix for combos
            if (toppingsForThisItem.length > 0) {
              if (isCombo) {
                customizations.push(`${prefix}${toppingsForThisItem.join(', ')}`);
              } else {
                customizations.push(...toppingsForThisItem);
              }
            }
          }
          
          // Handle instructions - ONLY if they have actual content
          if (customizationObj.instructions && Array.isArray(customizationObj.instructions) && customizationObj.instructions.length > 0) {
            const validInstructions = customizationObj.instructions.filter((instruction: any) => {
              if (typeof instruction === 'string' && instruction.trim()) {
                return true;
              } else if (instruction && instruction.name) {
                return true;
              }
              return false;
            });
            
            if (validInstructions.length > 0) {
              const instructionNames = validInstructions.map((instruction: any) => 
                typeof instruction === 'string' ? instruction : instruction.name
              );
              if (isCombo) {
                customizations.push(`${prefix}Instructions: ${instructionNames.join(', ')}`);
              } else {
                customizations.push(...instructionNames);
              }
            }
          }
          
          // Handle sauces - ONLY actual sauce names
          if (customizationObj.sauces && Array.isArray(customizationObj.sauces) && customizationObj.sauces.length > 0) {
            const sauceNames = customizationObj.sauces
              .filter((sauce: any) => sauce && sauce.name)
              .map((sauce: any) => sauce.name);
            
            if (sauceNames.length > 0) {
              if (isCombo) {
                customizations.push(`${prefix}Sauces: ${sauceNames.join(', ')}`);
              } else {
                customizations.push(...sauceNames);
              }
            }
          }
          
          // Handle isHalfAndHalf - this is useful information
          if (customizationObj.isHalfAndHalf === true) {
            customizations.push(`${prefix}Half & Half`);
          }
          
          // Handle extraCharge - ONLY if there's an actual charge
          if (customizationObj.extraCharge && customizationObj.extraCharge > 0) {
            customizations.push(`${prefix}Extra: $${customizationObj.extraCharge.toFixed(2)}`);
          }
          
          // Handle specific crust type - ONLY if it's not default
          if (customizationObj.crust && typeof customizationObj.crust === 'string' && customizationObj.crust.toLowerCase() !== 'regular') {
            customizations.push(`${prefix}${customizationObj.crust} Crust`);
          }
          
          // Handle specific sauce type - ONLY if it's not default
          if (customizationObj.sauce && typeof customizationObj.sauce === 'string' && customizationObj.sauce.toLowerCase() !== 'regular') {
            customizations.push(`${prefix}${customizationObj.sauce} Sauce`);
          }
          
          // Handle size - ONLY if it's specified and different from item.size
          if (customizationObj.size && typeof customizationObj.size === 'string' && customizationObj.size !== item.size) {
            customizations.push(`${prefix}Size: ${customizationObj.size}`);
          }
        } else if (typeof customizationObj === 'string') {
          // Handle simple string customizations
          customizations.push(customizationObj);
        }
      });
    }
    
    // Fallback: Handle old format where customizations might be a single object
    else if (customizationData && typeof customizationData === 'object') {
      console.log(`📋 Processing object customizations`);
      const customizationObj = customizationData;
      
      if (customizationObj.toppings && typeof customizationObj.toppings === 'object') {
        if (customizationObj.toppings.wholePizza && Array.isArray(customizationObj.toppings.wholePizza)) {
          customizationObj.toppings.wholePizza.forEach((topping: any) => {
            if (topping && topping.name) {
              customizations.push(topping.name);
            }
          });
        }
        
        if (customizationObj.toppings.leftSide && Array.isArray(customizationObj.toppings.leftSide)) {
          customizationObj.toppings.leftSide.forEach((topping: any) => {
            if (topping && topping.name) {
              customizations.push(`${topping.name} (Left)`);
            }
          });
        }
        
        if (customizationObj.toppings.rightSide && Array.isArray(customizationObj.toppings.rightSide)) {
          customizationObj.toppings.rightSide.forEach((topping: any) => {
            if (topping && topping.name) {
              customizations.push(`${topping.name} (Right)`);
            }
          });
        }
      }
      
      // Handle other meaningful properties
      if (customizationObj.instructions && typeof customizationObj.instructions === 'string' && customizationObj.instructions.trim()) {
        customizations.push(customizationObj.instructions);
      }
      
      if (customizationObj.sauces && Array.isArray(customizationObj.sauces)) {
        customizationObj.sauces.forEach((sauce: any) => {
          if (sauce && sauce.name) {
            customizations.push(sauce.name);
          }
        });
      }
      
      if (customizationObj.isHalfAndHalf === true) {
        customizations.push('Half & Half');
      }
      
      if (customizationObj.extraCharge && customizationObj.extraCharge > 0) {
        customizations.push(`Extra: $${customizationObj.extraCharge.toFixed(2)}`);
      }
    }
    
    // Remove duplicates and empty values, ensure all are strings
    const validCustomizations = customizations
      .filter(c => c && typeof c === 'string' && c.toString().trim())
      .map(c => c.toString().trim());
      
    const result = [...new Set(validCustomizations)];
    console.log(`✅ Extracted customizations for ${item.name}:`, result);
    return result;
    
  } catch (error) {
    console.warn('❌ Error extracting customizations:', error);
    return [];
  }
};

// New function to get real previous orders from Firebase
export const getPreviousOrdersFromFirebase = async (customerPhone: string, storeId?: string): Promise<PreviousOrder[]> => {
  try {
    // Import Firebase functions dynamically
    const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
    const { db } = await import('../services/firebase');

    // Clean phone number for consistent matching
    const cleanPhone = customerPhone.replace(/\D/g, '');
    
    console.log(`🔍 Fetching orders for phone: ${cleanPhone}`);

    // Use separate queries to handle both customerInfo.phone and customerPhone formats
    const queries = [];
    
    if (storeId) {
      // Query 1: customerInfo.phone with storeId
      queries.push(query(
        collection(db, 'orders'),
        where('customerInfo.phone', '==', cleanPhone),
        where('storeId', '==', storeId),
        orderBy('createdAt', 'desc')
      ));
      
      // Query 2: customerPhone with storeId
      queries.push(query(
        collection(db, 'orders'),
        where('customerPhone', '==', cleanPhone), 
        where('storeId', '==', storeId),
        orderBy('createdAt', 'desc')
      ));
    } else {
      // Query 1: customerInfo.phone
      queries.push(query(
        collection(db, 'orders'),
        where('customerInfo.phone', '==', cleanPhone),
        orderBy('createdAt', 'desc')
      ));
      
      // Query 2: customerPhone
      queries.push(query(
        collection(db, 'orders'),
        where('customerPhone', '==', cleanPhone),
        orderBy('createdAt', 'desc')
      ));
    }

    console.log(`🔄 Running ${queries.length} queries...`);

    const snapshots = await Promise.all(queries.map(q => getDocs(q)));
    const allDocs = snapshots.flatMap(snapshot => snapshot.docs);
    
    console.log(`📦 Found ${allDocs.length} total orders for phone ${cleanPhone}`);
    
    // Remove duplicates and sort by creation date
    const uniqueDocs = allDocs.filter((doc, index, arr) => 
      arr.findIndex(d => d.id === doc.id) === index
    ).sort((a, b) => {
      const dateA = new Date(a.data().createdAt || 0);
      const dateB = new Date(b.data().createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });

    const orders: PreviousOrder[] = uniqueDocs.map(doc => {
      const data = doc.data();
      
      // 🚨 DEBUG: Show complete raw Firebase data
      console.log('🔥 RAW FIREBASE ORDER DATA 🔥');
      console.log('📄 Document ID:', doc.id);
      console.log('📋 Complete Raw Data (JSON):');
      console.log(JSON.stringify(data, null, 2));
      console.log('🔍 Items Array:');
      console.log(JSON.stringify(data.items, null, 2));
      
      if (data.items && data.items.length > 0) {
        data.items.forEach((item: any, index: number) => {
          console.log(`🍕 ITEM ${index} - ${item.name}:`);
          console.log('📦 Full Item Data:', JSON.stringify(item, null, 2));
          console.log('🎯 Customizations Only:', JSON.stringify(item.customizations, null, 2));
        });
      }
      console.log('🔚 END RAW DATA DEBUG 🔚');
      
      const processedItems = (data.items || []).map((item: any, index: number) => {
        console.log(`🔧 PROCESSING ITEM ${index}: ${item.name}`);
        const customizations = extractCustomizations(item);
        console.log(`✅ EXTRACTED CUSTOMIZATIONS:`, customizations);
        
        const processedItem = {
          id: item.id || item.baseId || Math.random().toString(),
          name: item.name || 'Unknown Item',
          size: item.size,
          customizations,
          price: item.price || 0,
          quantity: item.quantity || 1
        };
        
        console.log(`📦 FINAL PROCESSED ITEM:`, JSON.stringify(processedItem, null, 2));
        return processedItem;
      });
      
      const finalOrder = {
        id: data.orderNumber || doc.id,
        customerId: data.customerInfo?.phone || data.customerPhone || cleanPhone,
        storeId: data.storeId || storeId || 'unknown',
        date: data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        items: processedItems,
        total: data.total || 0,
        orderType: (data.orderType === 'dine-in' ? 'pickup' : data.orderType) as 'pickup' | 'delivery',
        status: (data.status === 'pending' || data.status === 'preparing' || data.status === 'ready') 
          ? 'completed' as const 
          : data.status === 'cancelled' 
            ? 'cancelled' as const 
            : 'completed' as const
      };
      
      console.log('🎉 FINAL PROCESSED ORDER:', JSON.stringify(finalOrder, null, 2));
      console.log('=' .repeat(80));
      
      return finalOrder;
    });

    console.log(`✅ Converted ${orders.length} orders to PreviousOrder format`);
    return orders;

  } catch (error) {
    console.error('❌ Error fetching orders from Firebase:', error);
    return [];
  }
};

export const getPreviousOrdersForCustomer = (customerId: string, storeId?: string): PreviousOrder[] => {
  let orders = mockPreviousOrders.filter(order => order.customerId === customerId);
  
  // Filter by store if provided
  if (storeId) {
    orders = orders.filter(order => order.storeId === storeId);
  }
  
  return orders;
};

export const getOrdersByStore = (storeId: string): PreviousOrder[] => {
  return mockPreviousOrders.filter(order => order.storeId === storeId);
}; 