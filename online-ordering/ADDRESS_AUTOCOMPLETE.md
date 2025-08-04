# Address Autocomplete Feature

## Overview

The online ordering system now includes a custom address autocomplete feature using the Geoapify Geocoding API. This provides users with real-time address suggestions as they type, improving the delivery address input experience. **The system is restricted to Ontario, Canada addresses only.**

## Features

### ✅ Implemented
- **Real-time address suggestions** using Geoapify API
- **Ontario, Canada address support** with province filtering
- **Address validation** with error and warning messages
- **Structured address parsing** (street, city, postal code)
- **Responsive design** that matches the existing UI
- **Accessibility** with proper labels and keyboard navigation
- **Ontario postal code validation** (K, L, M, N, P prefixes)
- **Debounced API calls** to reduce server load
- **Keyboard navigation** (arrow keys, enter, escape)

### 🔧 Technical Details

#### Components
- `AddressAutocomplete.tsx` - Custom autocomplete component
- `addressHelpers.ts` - Utility functions for address validation and formatting
- Updated `DeliveryDetailsPage.tsx` - Integration with the autocomplete
- Updated `CustomerInfoPage.tsx` - Integration with the autocomplete

#### API Implementation
Following the [Geoapify Address Autocomplete API documentation](https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/):

- **Endpoint**: `https://api.geoapify.com/v1/geocode/autocomplete`
- **Parameters**:
  - `text`: User input
  - `type`: 'street' (for full addresses)
  - `filter`: 'countrycode:ca' (Canada only)
  - `limit`: 5 suggestions
  - `format`: 'json'
  - `apiKey`: Your API key

#### Address Validation
- Required fields: street, city, postal code
- Canadian postal code format validation
- Ontario postal code prefix validation (K, L, M, N, P)
- Minimum address length checks
- Real-time validation feedback

## Usage

### For Users
1. Navigate to delivery details page or customer info page
2. Start typing in the address field
3. Select from suggested addresses (Ontario only)
4. Address is automatically parsed and validated
5. Continue when address is complete

### For Developers

#### Basic Usage
```tsx
import AddressAutocomplete from '../components/AddressAutocomplete';

<AddressAutocomplete
  value={address}
  onChange={handleChange}
  onAddressSelect={handleAddressSelect}
  placeholder="Enter your address"
/>
```

#### Address Structure
```typescript
interface Address {
  street: string;
  city: string;
  postalCode: string;
  fullAddress: string;
}
```

#### Validation
```typescript
import { validateDeliveryAddress } from '../utils/addressHelpers';

const validation = validateDeliveryAddress(address);
// Returns: { isValid: boolean, errors: string[], warnings: string[] }
```

## API Configuration

### Geoapify Settings
- **Type**: `street` (full addresses only)
- **Filter**: `countrycode:ca` (Canada only)
- **Limit**: 5 suggestions
- **Format**: JSON
- **Debounce**: 300ms delay

### Ontario Postal Code Prefixes
- **K**: Eastern Ontario (Kingston, Ottawa area)
- **L**: Central Ontario (Toronto, Hamilton area)
- **M**: Toronto area
- **N**: Southwestern Ontario (London, Windsor area)
- **P**: Northern Ontario (Thunder Bay, Sudbury area)

### Styling
The component uses Tailwind CSS classes and includes:
- Input field styling with icon
- Suggestions dropdown
- Focus states and hover effects
- Error/warning states

## Error Handling

### Common Issues
1. **No suggestions**: Check API key and network connection
2. **Invalid addresses**: Validation will show specific errors
3. **Non-Ontario addresses**: Will be filtered out automatically
4. **Partial addresses**: Warnings for incomplete information

### Fallback Behavior
- Users can still type manually if autocomplete fails
- Validation provides clear feedback
- Graceful degradation if API is unavailable
- Ontario-only filtering prevents invalid addresses

## Ontario Coverage

### Supported Cities
The system includes validation for major Ontario cities:
- Toronto, Ottawa, Mississauga, Brampton, Hamilton
- London, Windsor, Kitchener, Markham, Vaughan
- Oakville, Richmond Hill, Burlington, Oshawa
- And many more...

### Postal Code Validation
- Automatically validates Ontario postal code prefixes
- Shows error for non-Ontario postal codes
- Supports both formats: A1A 1A1 and A1A1A1

## Implementation Details

### API Call Structure
```typescript
const params = new URLSearchParams({
  text: text,
  type: 'street',
  filter: 'countrycode:ca',
  limit: '5',
  format: 'json',
  apiKey: API_KEY
});

const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params}`);
```

### Response Processing
```typescript
// Filter for Ontario addresses only
const ontarioSuggestions = data.features.filter((suggestion) => {
  const province = suggestion.properties.state || '';
  const country = suggestion.properties.country || '';
  return country.toLowerCase() === 'canada' && 
         province.toLowerCase().includes('ontario');
});
```

### Address Parsing
```typescript
// Build street address
let street = '';
if (props.housenumber && props.street) {
  street = `${props.housenumber} ${props.street}`;
} else if (props.street) {
  street = props.street;
} else if (props.housenumber) {
  street = props.housenumber;
}
```

## Future Enhancements

### Planned Features
- [ ] Distance calculation from store locations
- [ ] Delivery zone detection based on address
- [ ] Address history/saved addresses
- [ ] Map preview integration
- [ ] Multi-store delivery area validation
- [ ] Real-time delivery fee calculation

### Technical Improvements
- [ ] Caching for frequently used addresses
- [ ] Offline address validation
- [ ] Performance optimization for large datasets
- [ ] Accessibility improvements (screen reader support)
- [ ] Enhanced Ontario city database

## Testing

### Manual Testing Checklist
- [ ] Address suggestions appear when typing
- [ ] Only Ontario addresses are shown in suggestions
- [ ] Address selection populates all fields correctly
- [ ] Validation shows appropriate errors/warnings
- [ ] Ontario postal code validation works
- [ ] Continue button is disabled until valid address
- [ ] Address persists when navigating back
- [ ] Works on mobile devices
- [ ] Keyboard navigation works (arrow keys, enter, escape)

### Test Cases
1. **Valid Ontario address**: Should work without errors
2. **Non-Ontario address**: Should be filtered out
3. **Invalid postal code**: Should show warning
4. **Non-Ontario postal code**: Should show error
5. **Incomplete address**: Should show errors
6. **Network issues**: Should gracefully handle API failures

## Security

### API Key Management
- API key is currently hardcoded (should be moved to environment variables)
- Consider implementing rate limiting
- Monitor API usage for cost control

### Data Privacy
- Address data is only used for delivery purposes
- No address data is stored permanently without user consent
- Follows Canadian privacy regulations
- Ontario-only restriction reduces data scope

## Performance

### Optimization
- Debounced API calls (300ms delay) to reduce requests
- Limited to 5 suggestions for faster response
- Canadian-only filtering reduces irrelevant results
- Ontario province filtering further reduces results
- Minimal re-renders with proper state management

### Monitoring
- Track API response times
- Monitor suggestion accuracy
- Measure user completion rates
- Monitor error rates and types
- Track Ontario address success rate

## API Documentation Reference

This implementation follows the official [Geoapify Address Autocomplete API documentation](https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/) and uses the recommended parameters and response structure. 