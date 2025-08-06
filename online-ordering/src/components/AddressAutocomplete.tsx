import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapPin } from 'lucide-react';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
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

interface GeoapifySuggestion {
  country: string;
  country_code: string;
  state: string;
  city: string;
  street: string;
  housenumber: string;
  postcode: string;
  formatted: string;
  lat: number;
  lon: number;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Enter your delivery address",
  className = ""
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<GeoapifySuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const API_KEY = "34fdfa74334e4230b1153e219ddf8dcd";

  // Debounce function to limit API calls
  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  };

  // Fetch suggestions from Geoapify API
  const fetchSuggestions = async (text: string) => {
    // Count only meaningful characters (letters and numbers, excluding spaces)
    const meaningfulChars = text.replace(/\s/g, '').length;
    
    if (!text || meaningfulChars < 7) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    try {
      const params = new URLSearchParams({
        text: text,
        format: 'json',
        apiKey: API_KEY
      });

      const url = `https://api.geoapify.com/v1/geocode/autocomplete?${params}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        
        // Filter for Ontario addresses only
        const ontarioSuggestions = data.results.filter((suggestion: GeoapifySuggestion) => {
          const province = suggestion.state || '';
          const country = suggestion.country || '';
          const isOntario = country.toLowerCase() === 'canada' && 
                 province.toLowerCase().includes('ontario');
          
          return isOntario;
        });

        setSuggestions(ontarioSuggestions);
        setIsOpen(ontarioSuggestions.length > 0);
        setSelectedIndex(-1);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    } catch (error) {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  // Debounced version of fetchSuggestions
  const debouncedFetchSuggestions = debounce((text: string) => {
    fetchSuggestions(text);
  }, 300);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onChange(value);
    debouncedFetchSuggestions(value);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: GeoapifySuggestion) => {
    // Build street address
    let street = '';
    if (suggestion.housenumber && suggestion.street) {
      street = `${suggestion.housenumber} ${suggestion.street}`;
    } else if (suggestion.street) {
      street = suggestion.street;
    } else if (suggestion.housenumber) {
      street = suggestion.housenumber;
    }

    const address = {
      street: street.trim(),
      city: suggestion.city || '',
      postalCode: suggestion.postcode || '',
      fullAddress: suggestion.formatted || '',
      lat: suggestion.lat,
      lon: suggestion.lon
    };

    onChange(address.fullAddress);
    onAddressSelect(address);
    setIsOpen(false);
    setSuggestions([]);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node) &&
          suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Input field with icon */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10">
          <MapPin className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-3 py-4 text-base rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-300 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
        />
      </div>

      {/* Suggestions dropdown using Portal */}
      {isOpen && suggestions.length > 0 && createPortal(
        <div
          ref={suggestionsRef}
          className="fixed bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-[9999]"
          style={{
            top: inputRef.current ? inputRef.current.getBoundingClientRect().bottom + 4 : 0,
            left: inputRef.current ? inputRef.current.getBoundingClientRect().left : 0,
            width: inputRef.current ? inputRef.current.offsetWidth : 'auto',
            maxWidth: inputRef.current ? inputRef.current.offsetWidth : 'auto'
          }}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.lat}-${suggestion.lon}-${index}`}
              className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors duration-200 ${
                index === selectedIndex ? 'bg-red-50 border-red-200' : ''
              } ${index === 0 ? 'rounded-t-xl' : ''} ${index === suggestions.length - 1 ? 'rounded-b-xl' : ''}`}
              onClick={() => handleSuggestionSelect(suggestion)}
            >
              <div className="text-sm font-medium text-gray-900">
                {suggestion.formatted}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {suggestion.city}, {suggestion.state}
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
} 