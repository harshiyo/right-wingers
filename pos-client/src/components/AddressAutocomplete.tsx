import React, { useState, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';

interface GeoapifySuggestion {
  formatted: string;
  street?: string;
  city?: string;
  postcode?: string;
  lat: number;
  lon: number;
  country?: string;
  state?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (address: {
    street: string;
    city: string;
    postalCode: string;
    fullAddress: string;
    lat?: number;
    lon?: number;
  }) => void;
  placeholder?: string;
  className?: string;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Enter your delivery address",
  className = ""
}) => {
  const [suggestions, setSuggestions] = useState<GeoapifySuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  const fetchSuggestions = async (text: string) => {
    const meaningfulChars = text.replace(/\s/g, '').length;
    
    if (!text || meaningfulChars < 7) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    
    try {
      const API_KEY = "34fdfa74334e4230b1153e219ddf8dcd";
      const params = new URLSearchParams({
        text: text,
        format: 'json',
        apiKey: API_KEY
      });

             const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params}`);
       const data = await response.json();

       if (data.results && Array.isArray(data.results)) {
        // Filter for Ontario, Canada addresses
        const ontarioAddresses = data.results.filter((suggestion: any) => {
          // Check if suggestion has formatted address
          if (!suggestion || !suggestion.formatted) {
            return false;
          }
          
          // Check if it's from Ontario, Canada
          const isOntario = suggestion.state === 'Ontario' || 
                           suggestion.formatted.toLowerCase().includes('ontario') ||
                           suggestion.formatted.toLowerCase().includes('on,') ||
                           suggestion.formatted.toLowerCase().includes('on ');
          
          const isCanada = suggestion.country === 'Canada' || 
                          suggestion.formatted.toLowerCase().includes('canada');
          
          return isOntario && isCanada;
                 });
         
         setSuggestions(ontarioAddresses);
        setIsOpen(ontarioAddresses.length > 0);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout for debouncing
    debounceTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  const handleSuggestionClick = (suggestion: any) => {
    try {
      if (!suggestion || !suggestion.formatted) {
        console.error('Invalid suggestion structure:', suggestion);
        return;
             }
       
       // Extract the full street address (including number) from the formatted address
      const fullStreetAddress = suggestion.formatted.split(',')[0] || '';
      
      const address = {
        street: fullStreetAddress, // Use the full street address including number
        city: suggestion.city || '',
        postalCode: suggestion.postcode || '',
        fullAddress: suggestion.formatted,
        lat: suggestion.lat,
        lon: suggestion.lon
             };
       
       onChange(suggestion.formatted);
      onAddressSelect(address);
      setIsOpen(false);
      setSuggestions([]);
    } catch (error) {
      console.error('Error handling suggestion click:', error);
    }
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Delay closing to allow for suggestion clicks
    setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className="w-full text-base py-3 px-4 pr-10 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-300 focus:border-transparent"
        />
        <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-center text-gray-500">
              Loading suggestions...
            </div>
          ) : suggestions.length > 0 ? (
            <ul>
                             {suggestions.map((suggestion, index) => (
                 <li
                   key={index}
                   className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                   onClick={() => handleSuggestionClick(suggestion)}
                 >
                                     <div className="text-sm text-gray-900">
                    {suggestion.formatted || 'Invalid address'}
                  </div>
                 </li>
               ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete; 