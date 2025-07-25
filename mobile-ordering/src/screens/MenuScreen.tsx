import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchCategories,
  fetchMenuItems,
  fetchCombos,
  Category,
  MenuItem,
  Combo,
} from '../services/firebase';

const { width } = Dimensions.get('window');

interface MenuScreenProps {
  navigation: any;
}

export const MenuScreen: React.FC<MenuScreenProps> = ({ navigation }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesData, menuItemsData, combosData] = await Promise.all([
        fetchCategories(),
        fetchMenuItems(),
        fetchCombos(),
      ]);
      
      setCategories(categoriesData);
      setMenuItems(menuItemsData);
      setCombos(combosData);
      
      // Set first category as selected by default
      if (categoriesData.length > 0 && !selectedCategory) {
        setSelectedCategory(categoriesData[0]);
      }
    } catch (error) {
      console.error('Error loading menu data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getFilteredMenuItems = () => {
    if (!selectedCategory) return menuItems;
    return menuItems.filter(item => item.category === selectedCategory.id);
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
  };

  const handleMenuItemPress = (item: MenuItem) => {
    // TODO: Navigate to item customization screen
    console.log('Selected menu item:', item);
  };

  const handleComboPress = (combo: Combo) => {
    // TODO: Navigate to combo customization screen
    console.log('Selected combo:', combo);
  };

  const renderCategoryItem = (category: Category) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryItem,
        selectedCategory?.id === category.id && styles.categoryItemSelected,
      ]}
      onPress={() => handleCategorySelect(category)}
    >
      <Text style={styles.categoryIcon}>{category.icon}</Text>
      <Text
        style={[
          styles.categoryName,
          selectedCategory?.id === category.id && styles.categoryNameSelected,
        ]}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.menuItem}
      onPress={() => handleMenuItemPress(item)}
    >
      <View style={styles.menuItemImage}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
        ) : (
          <View style={[styles.itemImagePlaceholder, { backgroundColor: item.tileColor || '#f0f0f0' }]}>
            <Ionicons name="pizza" size={32} color="#d32f2f" />
          </View>
        )}
      </View>
      <View style={styles.menuItemContent}>
        <Text style={styles.menuItemName} numberOfLines={2}>
          {item.name}
        </Text>
        {item.description && (
          <Text style={styles.menuItemDescription} numberOfLines={1}>
            {item.description}
          </Text>
        )}
        <Text style={styles.menuItemPrice}>
          ${item.price.toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderComboItem = (combo: Combo) => (
    <TouchableOpacity
      key={combo.id}
      style={styles.comboItem}
      onPress={() => handleComboPress(combo)}
    >
      <View style={styles.comboHeader}>
        <View style={styles.comboImage}>
          {combo.imageUrl ? (
            <Image source={{ uri: combo.imageUrl }} style={styles.comboImageContent} />
          ) : (
            <View style={styles.comboImagePlaceholder}>
              <Ionicons name="gift" size={32} color="#d32f2f" />
            </View>
          )}
        </View>
        <View style={styles.comboBadge}>
          <Text style={styles.comboBadgeText}>COMBO</Text>
        </View>
      </View>
      <View style={styles.comboContent}>
        <Text style={styles.comboName} numberOfLines={2}>
          {combo.name}
        </Text>
        {combo.description && (
          <Text style={styles.comboDescription} numberOfLines={2}>
            {combo.description}
          </Text>
        )}
        <Text style={styles.comboPrice}>
          ${combo.basePrice.toFixed(2)}
        </Text>
        <View style={styles.comboComponents}>
          {combo.components.slice(0, 3).map((component, index) => (
            <Text key={index} style={styles.comboComponent}>
              {component.quantity}x {component.itemName}
            </Text>
          ))}
          {combo.components.length > 3 && (
            <Text style={styles.comboComponentMore}>
              +{combo.components.length - 3} more
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d32f2f" />
        <Text style={styles.loadingText}>Loading menu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menu</Text>
        <Text style={styles.headerSubtitle}>Choose from our delicious selection</Text>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map(renderCategoryItem)}
      </ScrollView>

      {/* Menu Items */}
      <ScrollView
        style={styles.menuContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Combos Section */}
        {combos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Combos</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.combosContainer}
              contentContainerStyle={styles.combosContent}
            >
              {combos.map(renderComboItem)}
            </ScrollView>
          </View>
        )}

        {/* Menu Items Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedCategory ? selectedCategory.name : 'All Items'}
          </Text>
          <View style={styles.menuGrid}>
            {getFilteredMenuItems().map(renderMenuItem)}
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
    marginTop: 16,
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
  categoriesContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  categoryItemSelected: {
    backgroundColor: '#d32f2f',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  categoryNameSelected: {
    color: '#fff',
  },
  menuContainer: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 16,
  },
  combosContainer: {
    marginBottom: 8,
  },
  combosContent: {
    paddingRight: 20,
  },
  comboItem: {
    width: 280,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  comboHeader: {
    position: 'relative',
  },
  comboImage: {
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  comboImageContent: {
    width: '100%',
    height: '100%',
  },
  comboImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffe0e0',
  },
  comboBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#d32f2f',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comboBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  comboContent: {
    padding: 16,
  },
  comboName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  comboDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  comboPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  comboComponents: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  comboComponent: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
    marginBottom: 2,
  },
  comboComponentMore: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuItem: {
    width: (width - 60) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  menuItemImage: {
    height: 100,
    backgroundColor: '#f0f0f0',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemContent: {
    padding: 12,
  },
  menuItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
}); 