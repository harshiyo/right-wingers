export interface Address {
  street: string;
  city: string;
  postalCode: string;
  fullAddress?: string;
}

export interface AddressValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a delivery address
 */
export function validateDeliveryAddress(address: Address): AddressValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!address.street || address.street.trim().length === 0) {
    errors.push('Street address is required');
  }

  if (!address.city || address.city.trim().length === 0) {
    errors.push('City is required');
  }

  if (!address.postalCode || address.postalCode.trim().length === 0) {
    errors.push('Postal code is required');
  }

  // Validate postal code format (Canadian format)
  if (address.postalCode && !/^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/.test(address.postalCode.trim())) {
    warnings.push('Postal code format may be incorrect (expected: A1A 1A1)');
  }

  // Check for minimum address length
  if (address.street && address.street.trim().length < 5) {
    warnings.push('Street address seems too short');
  }

  // Validate that postal code is from Ontario (K, L, M, N, P prefixes)
  if (address.postalCode) {
    const firstChar = address.postalCode.charAt(0).toUpperCase();
    const ontarioPrefixes = ['K', 'L', 'M', 'N', 'P'];
    
    if (!ontarioPrefixes.includes(firstChar)) {
      errors.push('Postal code must be from Ontario (K, L, M, N, P prefixes)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Formats an address for display
 */
export function formatAddress(address: Address): string {
  const parts = [
    address.street,
    address.city,
    address.postalCode
  ].filter(Boolean);

  return parts.join(', ');
}

/**
 * Formats a postal code for display
 */
export function formatPostalCode(postalCode: string): string {
  if (!postalCode) return '';
  
  // Remove spaces and convert to uppercase
  const cleaned = postalCode.replace(/\s/g, '').toUpperCase();
  
  // Add space in the middle if not present
  if (cleaned.length === 6) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  }
  
  return cleaned;
}

/**
 * Checks if an address is in Ontario
 */
export function isAddressInOntario(address: Address): boolean {
  if (!address.postalCode) return false;
  
  const firstChar = address.postalCode.charAt(0).toUpperCase();
  const ontarioPrefixes = ['K', 'L', 'M', 'N', 'P'];
  
  return ontarioPrefixes.includes(firstChar);
}

/**
 * Extracts province from postal code (first character)
 */
export function getProvinceFromPostalCode(postalCode: string): string {
  if (!postalCode) return '';
  
  const firstChar = postalCode.charAt(0).toUpperCase();
  
  // Canadian province mapping based on postal code
  const provinceMap: { [key: string]: string } = {
    'A': 'Newfoundland and Labrador',
    'B': 'Nova Scotia',
    'C': 'Prince Edward Island',
    'E': 'New Brunswick',
    'G': 'Quebec',
    'H': 'Quebec',
    'J': 'Quebec',
    'K': 'Ontario',
    'L': 'Ontario',
    'M': 'Ontario',
    'N': 'Ontario',
    'P': 'Ontario',
    'R': 'Manitoba',
    'S': 'Saskatchewan',
    'T': 'Alberta',
    'V': 'British Columbia',
    'X': 'Nunavut/Northwest Territories',
    'Y': 'Yukon'
  };
  
  return provinceMap[firstChar] || '';
}

/**
 * Gets Ontario cities for validation
 */
export function getOntarioCities(): string[] {
  return [
    'Toronto', 'Ottawa', 'Mississauga', 'Brampton', 'Hamilton', 'London', 
    'Windsor', 'Kitchener', 'Markham', 'Vaughan', 'Oakville', 'Richmond Hill',
    'Burlington', 'Oshawa', 'Whitby', 'Ajax', 'Pickering', 'Scarborough',
    'Etobicoke', 'North York', 'York', 'East York', 'Thornhill', 'Aurora',
    'Newmarket', 'Barrie', 'St. Catharines', 'Niagara Falls', 'Kingston',
    'Guelph', 'Cambridge', 'Waterloo', 'Stratford', 'Brantford', 'Woodstock',
    'Sarnia', 'Chatham', 'Windsor', 'Leamington', 'Amherstburg', 'Tecumseh'
  ];
}

/**
 * Validates if a city is in Ontario
 */
export function isCityInOntario(cityName: string): boolean {
  const ontarioCities = getOntarioCities();
  return ontarioCities.some(city => 
    city.toLowerCase().includes(cityName.toLowerCase()) ||
    cityName.toLowerCase().includes(city.toLowerCase())
  );
} 