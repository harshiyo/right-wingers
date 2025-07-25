import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchToppings,
  fetchSauces,
  Topping,
  Sauce,
} from '../services/firebase';

const { width, height } = Dimensions.get('window');

interface CustomizationScreenProps {
  navigation: any;
}

export const CustomizationScreen: React.FC<CustomizationScreenProps> = ({ navigation }) => {
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [sauces, setSauces] = useState<Sauce[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pizza customization state
  const [activeSelection, setActiveSelection] = useState<'whole' | 'left' | 'right'>('whole');
  const [selectedToppings, setSelectedToppings] = useState<{
    wholePizza: Topping[];
    leftSide: Topping[];
    rightSide: Topping[];
  }>({
    wholePizza: [],
    leftSide: [],
    rightSide: []
  });
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
  // Wing customization state
  const [selectedSauces, setSelectedSauces] = useState<Sauce[]>([]);
  const [spicyFilter, setSpicyFilter] = useState<'all' | 'spicy' | 'not-spicy'>('all');
  
  // Size selection state
  const [selectedSize, setSelectedSize] = useState<string>('Medium');
  const [showSizeModal, setShowSizeModal] = useState(false);
  
  // Demo item
  const [demoItem, setDemoItem] = useState<'pizza' | 'wings' | 'combo'>('pizza');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [toppingsData, saucesData] = await Promise.all([
        fetchToppings(),
        fetchSauces(),
      ]);
      setToppings(toppingsData);
      setSauces(saucesData);
    } catch (error) {
      console.error('Error loading customization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToppingToggle = (topping: Topping) => {
    setSelectedToppings(prev => {
      const newSelections = { ...prev };
      
      if (activeSelection === 'whole') {
        const wholePizza = [...newSelections.wholePizza];
        const index = wholePizza.findIndex(t => t.id === topping.id);
        if (index >= 0) {
          wholePizza.splice(index, 1);
        } else {
          wholePizza.push(topping);
        }
        newSelections.wholePizza = wholePizza;
      } else if (activeSelection === 'left') {
        const leftSide = [...newSelections.leftSide];
        const index = leftSide.findIndex(t => t.id === topping.id);
        if (index >= 0) {
          leftSide.splice(index, 1);
        } else {
          leftSide.push(topping);
        }
        newSelections.leftSide = leftSide;
      } else if (activeSelection === 'right') {
        const rightSide = [...newSelections.rightSide];
        const index = rightSide.findIndex(t => t.id === topping.id);
        if (index >= 0) {
          rightSide.splice(index, 1);
        } else {
          rightSide.push(topping);
        }
        newSelections.rightSide = rightSide;
      }
      
      return newSelections;
    });
  };

  const handleSauceToggle = (sauce: Sauce) => {
    setSelectedSauces(prev => {
      const index = prev.findIndex(s => s.id === sauce.id);
      if (index >= 0) {
        return prev.filter(s => s.id !== sauce.id);
      } else {
        return [...prev, sauce];
      }
    });
  };

  const getFilteredToppings = () => {
    if (activeCategory === 'All') return toppings;
    return toppings.filter(topping => topping.category === activeCategory);
  };

  const getFilteredSauces = () => {
    if (spicyFilter === 'all') return sauces;
    return sauces.filter(sauce => 
      spicyFilter === 'spicy' ? sauce.isSpicy : !sauce.isSpicy
    );
  };

  const getTotalToppings = () => {
    return selectedToppings.wholePizza.length + 
           selectedToppings.leftSide.length + 
           selectedToppings.rightSide.length;
  };

  const getTotalExtraCharge = () => {
    const toppingCharge = getTotalToppings() > 3 ? 
      (getTotalToppings() - 3) * 1.50 : 0;
    const sauceCharge = selectedSauces.length > 2 ? 
      (selectedSauces.length - 2) * 0.50 : 0;
    return toppingCharge + sauceCharge;
  };

  const renderPizzaCustomization = () => (
    <View style={styles.customizationSection}>
      <Text style={styles.sectionTitle}>Pizza Toppings</Text>
      
      {/* Selection Mode */}
      <View style={styles.selectionMode}>
        <TouchableOpacity
          style={[
            styles.selectionButton,
            activeSelection === 'whole' && styles.selectionButtonActive
          ]}
          onPress={() => setActiveSelection('whole')}
        >
          <Text style={[
            styles.selectionButtonText,
            activeSelection === 'whole' && styles.selectionButtonTextActive
          ]}>
            🍕 Whole Pizza
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.selectionButton,
            activeSelection === 'left' && styles.selectionButtonActive
          ]}
          onPress={() => setActiveSelection('left')}
        >
          <Text style={[
            styles.selectionButtonText,
            activeSelection === 'left' && styles.selectionButtonTextActive
          ]}>
            ⬅️ Left Half
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.selectionButton,
            activeSelection === 'right' && styles.selectionButtonActive
          ]}
          onPress={() => setActiveSelection('right')}
        >
          <Text style={[
            styles.selectionButtonText,
            activeSelection === 'right' && styles.selectionButtonTextActive
          ]}>
            ➡️ Right Half
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
        {['All', 'Meat', 'Vegetables', 'Cheese'].map(category => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              activeCategory === category && styles.categoryButtonActive
            ]}
            onPress={() => setActiveCategory(category)}
          >
            <Text style={[
              styles.categoryButtonText,
              activeCategory === category && styles.categoryButtonTextActive
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Toppings Grid */}
      <View style={styles.toppingsGrid}>
        {getFilteredToppings().map(topping => {
          const isSelected = activeSelection === 'whole' 
            ? selectedToppings.wholePizza.some(t => t.id === topping.id)
            : activeSelection === 'left'
            ? selectedToppings.leftSide.some(t => t.id === topping.id)
            : selectedToppings.rightSide.some(t => t.id === topping.id);

          return (
            <TouchableOpacity
              key={topping.id}
              style={[
                styles.toppingItem,
                isSelected && styles.toppingItemSelected
              ]}
              onPress={() => handleToppingToggle(topping)}
            >
              <Text style={[
                styles.toppingName,
                isSelected && styles.toppingNameSelected
              ]}>
                {topping.name}
              </Text>
              {topping.price > 0 && (
                <Text style={[
                  styles.toppingPrice,
                  isSelected && styles.toppingPriceSelected
                ]}>
                  +${topping.price.toFixed(2)}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderWingCustomization = () => (
    <View style={styles.customizationSection}>
      <Text style={styles.sectionTitle}>Wing Sauces</Text>
      
      {/* Spicy Filter */}
      <View style={styles.spicyFilter}>
        {['all', 'spicy', 'not-spicy'].map(filter => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.spicyButton,
              spicyFilter === filter && styles.spicyButtonActive
            ]}
            onPress={() => setSpicyFilter(filter as any)}
          >
            <Text style={[
              styles.spicyButtonText,
              spicyFilter === filter && styles.spicyButtonTextActive
            ]}>
              {filter === 'all' ? 'All' : filter === 'spicy' ? '🔥 Spicy' : '😌 Mild'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sauces Grid */}
      <View style={styles.saucesGrid}>
        {getFilteredSauces().map(sauce => {
          const isSelected = selectedSauces.some(s => s.id === sauce.id);
          
          return (
            <TouchableOpacity
              key={sauce.id}
              style={[
                styles.sauceItem,
                isSelected && styles.sauceItemSelected
              ]}
              onPress={() => handleSauceToggle(sauce)}
            >
              <Text style={[
                styles.sauceName,
                isSelected && styles.sauceNameSelected
              ]}>
                {sauce.name}
              </Text>
              {sauce.isSpicy && (
                <Text style={styles.spicyIndicator}>🔥</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderSizeSelection = () => (
    <View style={styles.customizationSection}>
      <Text style={styles.sectionTitle}>Size Selection</Text>
      
      <TouchableOpacity
        style={styles.sizeSelector}
        onPress={() => setShowSizeModal(true)}
      >
        <Text style={styles.sizeSelectorText}>Current Size: {selectedSize}</Text>
        <Ionicons name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>

      <Modal
        visible={showSizeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSizeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Size</Text>
            {['Small', 'Medium', 'Large', 'Extra Large'].map(size => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.sizeOption,
                  selectedSize === size && styles.sizeOptionSelected
                ]}
                onPress={() => {
                  setSelectedSize(size);
                  setShowSizeModal(false);
                }}
              >
                <Text style={[
                  styles.sizeOptionText,
                  selectedSize === size && styles.sizeOptionTextSelected
                ]}>
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowSizeModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderComboCustomization = () => (
    <View style={styles.customizationSection}>
      <Text style={styles.sectionTitle}>Combo Customization</Text>
      
      <View style={styles.comboPreview}>
        <Text style={styles.comboPreviewTitle}>Supreme Combo</Text>
        <Text style={styles.comboPreviewPrice}>$24.99</Text>
        
        <View style={styles.comboComponents}>
          <Text style={styles.comboComponent}>🍕 1x Large Supreme Pizza</Text>
          <Text style={styles.comboComponent}>🍗 1x 12pc Wings</Text>
          <Text style={styles.comboComponent}>🥤 1x 2L Drink</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.customizeButton}
        onPress={() => Alert.alert('Customize', 'Combo customization coming soon!')}
      >
        <Text style={styles.customizeButtonText}>Customize Combo Items</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading customization options...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Customize Your Order</Text>
        <Text style={styles.headerSubtitle}>Personalize your meal</Text>
      </View>

      {/* Demo Item Selector */}
      <View style={styles.demoSelector}>
        {(['pizza', 'wings', 'combo'] as const).map(item => (
          <TouchableOpacity
            key={item}
            style={[
              styles.demoButton,
              demoItem === item && styles.demoButtonActive
            ]}
            onPress={() => setDemoItem(item)}
          >
            <Text style={[
              styles.demoButtonText,
              demoItem === item && styles.demoButtonTextActive
            ]}>
              {item === 'pizza' ? '🍕 Pizza' : item === 'wings' ? '🍗 Wings' : '🎁 Combo'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {demoItem === 'pizza' && renderPizzaCustomization()}
        {demoItem === 'wings' && renderWingCustomization()}
        {demoItem === 'combo' && renderComboCustomization()}
        
        {renderSizeSelection()}

        {/* Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Base Price:</Text>
            <Text style={styles.summaryValue}>$18.99</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Extra Toppings:</Text>
            <Text style={styles.summaryValue}>${getTotalExtraCharge().toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total:</Text>
            <Text style={styles.summaryTotal}>${(18.99 + getTotalExtraCharge()).toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  demoSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  demoButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  demoButtonActive: {
    backgroundColor: '#d32f2f',
  },
  demoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  demoButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  customizationSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 16,
  },
  selectionMode: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  selectionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  selectionButtonActive: {
    backgroundColor: '#d32f2f',
  },
  selectionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  selectionButtonTextActive: {
    color: '#fff',
  },
  categoryFilter: {
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  categoryButtonActive: {
    backgroundColor: '#d32f2f',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  toppingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  toppingItem: {
    width: (width - 60) / 2,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  toppingItemSelected: {
    backgroundColor: '#d32f2f',
  },
  toppingName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  toppingNameSelected: {
    color: '#fff',
  },
  toppingPrice: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  toppingPriceSelected: {
    color: '#fff',
  },
  spicyFilter: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  spicyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  spicyButtonActive: {
    backgroundColor: '#d32f2f',
  },
  spicyButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  spicyButtonTextActive: {
    color: '#fff',
  },
  saucesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sauceItem: {
    width: (width - 60) / 2,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  sauceItemSelected: {
    backgroundColor: '#d32f2f',
  },
  sauceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  sauceNameSelected: {
    color: '#fff',
  },
  spicyIndicator: {
    fontSize: 12,
    marginTop: 4,
  },
  sizeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  sizeSelectorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: width * 0.8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  sizeOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  sizeOptionSelected: {
    backgroundColor: '#d32f2f',
  },
  sizeOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  sizeOptionTextSelected: {
    color: '#fff',
  },
  modalCloseButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  comboPreview: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  comboPreviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  comboPreviewPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 12,
  },
  comboComponents: {
    gap: 4,
  },
  comboComponent: {
    fontSize: 14,
    color: '#666',
  },
  customizeButton: {
    backgroundColor: '#d32f2f',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  customizeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  summary: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
}); 