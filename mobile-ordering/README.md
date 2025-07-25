# Right Wingers Mobile App

A world-class React Native mobile app for Right Wingers Pizza, built with Expo and Firebase integration.

## Features

### 🏠 Home Screen
- **Brand Story**: Displays the Right Wingers logo and brand messaging
- **Banners**: Interactive promotional banners for hot deals, new combos, and best sellers
- **Featured Menu**: Dynamic display of featured items from Firebase
- **Categories Preview**: Quick access to menu categories
- **Order Tracking CTA**: Direct access to order tracking functionality
- **Quick Actions**: Fast navigation to key features

### 🍕 Menu Screen
- **Category Navigation**: Horizontal scrollable category selection
- **Menu Items Grid**: Responsive grid layout for menu items
- **Combo Display**: Special combo deals with component previews
- **Real-time Data**: Fetches categories, menu items, and combos from Firebase
- **Pull-to-Refresh**: Refresh menu data with pull gesture
- **Loading States**: Smooth loading indicators

### 📍 Order Tracking Screen
- **Real-time Status**: Live order status updates
- **Progress Indicators**: Visual progress bars for order stages
- **Order History**: Recent and completed orders
- **Order Details**: Expandable order cards with item details
- **Estimated Times**: Real-time delivery/pickup estimates
- **Mock Data**: Demo orders for testing and demonstration

### ⚙️ Customization Screen
- **Pizza Toppings**: Full topping selection with whole/half pizza options
- **Wing Sauces**: Sauce selection with spicy/mild filtering
- **Size Selection**: Interactive size selection modal
- **Combo Customization**: Combo item customization interface
- **Real-time Pricing**: Dynamic price calculation with extra charges
- **Category Filtering**: Filter toppings by category (Meat, Vegetables, Cheese)

## Technical Architecture

### Tech Stack
- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and build tools
- **TypeScript**: Type-safe JavaScript
- **React Navigation**: Navigation and routing
- **Firebase**: Backend services and real-time data
- **Expo Vector Icons**: Icon library

### Project Structure
```
src/
├── screens/
│   ├── HomeScreen.tsx          # Home screen with banners and featured items
│   ├── MenuScreen.tsx          # Menu with categories and items
│   ├── OrderTrackingScreen.tsx # Order tracking and history
│   └── CustomizationScreen.tsx # Topping/sauce/size selection
├── services/
│   └── firebase.ts            # Firebase configuration and API calls
└── assets/
    └── logo.png               # Right Wingers logo
```

### Firebase Integration
- **Categories**: Menu categories with icons and positions
- **Menu Items**: Individual menu items with pricing and customization options
- **Combos**: Combo deals with component definitions
- **Toppings**: Pizza toppings with categories and dietary info
- **Sauces**: Wing sauces with spicy indicators

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation
1. Navigate to the mobile-ordering directory:
   ```bash
   cd pos-monorepo/mobile-ordering
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npx expo start
   ```

4. Run on your preferred platform:
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app on your device

### Environment Setup
The app uses the same Firebase project as the POS client:
- Project ID: `right-wingers`
- Authentication, Firestore, and Storage enabled
- Emulator support for development

## Development

### Adding New Features
1. Create new screen components in `src/screens/`
2. Add Firebase service functions in `src/services/firebase.ts`
3. Update navigation in `App.tsx`
4. Add TypeScript interfaces for new data types

### Styling Guidelines
- Use the brand color `#d32f2f` (red) for primary elements
- Maintain consistent spacing and typography
- Follow mobile-first design principles
- Use Expo Vector Icons for consistent iconography

### Firebase Data Structure
The app expects the following Firestore collections:
- `categories`: Menu categories with icons and positions
- `menuItems`: Individual menu items with pricing and options
- `combos`: Combo deals with component definitions
- `toppings`: Pizza toppings with categories
- `sauces`: Wing sauces with properties

## Features in Development

### Planned Enhancements
- **User Authentication**: Login/signup functionality
- **Shopping Cart**: Add items to cart and checkout
- **Payment Integration**: Secure payment processing
- **Push Notifications**: Order status updates
- **Offline Support**: Offline menu browsing
- **Store Selection**: Multiple store locations
- **Order History**: Detailed order history and reordering

### Customization Logic
The app implements the same customization logic as the POS client:
- **Pizza Toppings**: Whole/half pizza selection with topping limits
- **Wing Sauces**: Multiple sauce selection with spicy filtering
- **Size Selection**: Interactive size selection with pricing
- **Combo Customization**: Step-by-step combo item customization

## Testing

### Manual Testing
1. Test navigation between all screens
2. Verify Firebase data loading
3. Test customization features
4. Check responsive design on different screen sizes
5. Test pull-to-refresh functionality

### Automated Testing
- Unit tests for service functions
- Component testing with React Native Testing Library
- Integration tests for Firebase operations

## Deployment

### Building for Production
1. Configure app.json with production settings
2. Build for iOS: `expo build:ios`
3. Build for Android: `expo build:android`
4. Submit to app stores

### App Store Deployment
- Configure app signing certificates
- Set up app store connect
- Submit builds for review
- Configure production Firebase project

## Support

For technical support or feature requests, please contact the development team or create an issue in the project repository.

---

**Right Wingers Mobile App** - World-class pizza ordering experience on mobile devices. 