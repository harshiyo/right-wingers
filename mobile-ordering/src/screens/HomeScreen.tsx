import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchFeaturedItems, fetchCategories, MenuItem, Category } from '../services/firebase';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [featuredItems, setFeaturedItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [featuredData, categoriesData] = await Promise.all([
        fetchFeaturedItems(),
        fetchCategories(),
      ]);
      setFeaturedItems(featuredData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFeaturedItemPress = (item: MenuItem) => {
    navigation.navigate('Menu');
  };

  const handleTrackOrderPress = () => {
    navigation.navigate('Track');
  };

  const handleMenuPress = () => {
    navigation.navigate('Menu');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d32f2f" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} />
        <Text style={styles.brandTitle}>Right Wingers Pizza</Text>
        <Text style={styles.brandSubtitle}>World Class Pizza, Wings & More</Text>
      </View>

      {/* Banners */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bannerRow}>
        <TouchableOpacity style={styles.banner} onPress={handleMenuPress}>
          <Text style={styles.bannerText}>🔥 Hot Deals!</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.banner} onPress={handleMenuPress}>
          <Text style={styles.bannerText}>🍕 New Combos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.banner} onPress={handleMenuPress}>
          <Text style={styles.bannerText}>🏆 Best Sellers</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Featured Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured Menu</Text>
        {featuredItems.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredContainer}>
            {featuredItems.slice(0, 5).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.featuredItem}
                onPress={() => handleFeaturedItemPress(item)}
              >
                <View style={styles.featuredItemImage}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                  ) : (
                    <View style={[styles.itemImagePlaceholder, { backgroundColor: item.tileColor || '#f0f0f0' }]}>
                      <Ionicons name="pizza" size={32} color="#d32f2f" />
                    </View>
                  )}
                </View>
                <Text style={styles.featuredItemName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.featuredItemPrice}>
                  ${item.price.toFixed(2)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.featuredRow}>
            <View style={styles.featuredItem}>
              <Ionicons name="pizza" size={36} color="#d32f2f" />
              <Text style={styles.featuredText}>Signature Pizza</Text>
            </View>
            <View style={styles.featuredItem}>
              <Ionicons name="flame" size={36} color="#d32f2f" />
              <Text style={styles.featuredText}>Spicy Wings</Text>
            </View>
            <View style={styles.featuredItem}>
              <Ionicons name="fast-food" size={36} color="#d32f2f" />
              <Text style={styles.featuredText}>Loaded Sides</Text>
            </View>
          </View>
        )}
      </View>

      {/* Categories Preview */}
      {categories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Menu Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
            {categories.slice(0, 6).map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryItem}
                onPress={handleMenuPress}
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Order Tracking CTA */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Track Your Order</Text>
        <TouchableOpacity style={styles.trackingBox} onPress={handleTrackOrderPress}>
          <Ionicons name="locate" size={24} color="#d32f2f" />
          <Text style={styles.trackingText}>Track your order in real time after placing it!</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={handleMenuPress}>
            <Ionicons name="pizza" size={24} color="#d32f2f" />
            <Text style={styles.quickActionText}>Browse Menu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('Customize')}>
            <Ionicons name="construct" size={24} color="#d32f2f" />
            <Text style={styles.quickActionText}>Customize</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={handleTrackOrderPress}>
            <Ionicons name="locate" size={24} color="#d32f2f" />
            <Text style={styles.quickActionText}>Track Order</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 8,
    borderRadius: 20,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 2,
  },
  brandSubtitle: {
    fontSize: 16,
    color: '#444',
    marginBottom: 8,
  },
  bannerRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  banner: {
    backgroundColor: '#ffe0e0',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginRight: 10,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    color: '#d32f2f',
    fontWeight: 'bold',
    fontSize: 16,
  },
  section: {
    marginTop: 18,
    paddingHorizontal: 18,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 10,
  },
  featuredContainer: {
    marginBottom: 8,
  },
  featuredRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  featuredItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 120,
  },
  featuredItemImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
    overflow: 'hidden',
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
  featuredItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  featuredItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  featuredText: {
    marginTop: 6,
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
  categoriesContainer: {
    marginBottom: 8,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    minWidth: 80,
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  trackingBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 6,
    flexDirection: 'row',
  },
  trackingText: {
    color: '#222',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickAction: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    minWidth: 100,
  },
  quickActionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
}); 