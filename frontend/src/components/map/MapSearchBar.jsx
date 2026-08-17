import React, { useState, useEffect, useRef } from 'react';

// Common Ahmedabad / Gujarat Police Jurisdiction Key Localities for instant coordinate lookup
const AHMEDABAD_LOCALITIES = {
  navrangpura: { lat: 23.0373, lng: 72.5613, title: 'Navrangpura', address: 'Navrangpura, Ahmedabad, Gujarat 380009' },
  'sg highway': { lat: 23.0456, lng: 72.5118, title: 'S.G. Highway', address: 'Sarkhej - Gandhinagar Hwy, Ahmedabad, Gujarat' },
  'ellis bridge': { lat: 23.0232, lng: 72.5714, title: 'Ellis Bridge', address: 'Ellisbridge, Ahmedabad, Gujarat 380006' },
  satellite: { lat: 23.0304, lng: 72.5178, title: 'Satellite', address: 'Satellite, Ahmedabad, Gujarat 380015' },
  vastrapur: { lat: 23.0350, lng: 72.5293, title: 'Vastrapur', address: 'Vastrapur, Ahmedabad, Gujarat 380054' },
  bodakdev: { lat: 23.0435, lng: 72.5152, title: 'Bodakdev', address: 'Bodakdev, Ahmedabad, Gujarat 380054' },
  maninagar: { lat: 22.9978, lng: 72.6026, title: 'Maninagar', address: 'Maninagar, Ahmedabad, Gujarat 380008' },
  paldi: { lat: 23.0131, lng: 72.5625, title: 'Paldi', address: 'Paldi, Ahmedabad, Gujarat 380007' },
  thaltej: { lat: 23.0569, lng: 72.5086, title: 'Thaltej', address: 'Thaltej, Ahmedabad, Gujarat 380059' },
  ghatlodia: { lat: 23.0689, lng: 72.5408, title: 'Ghatlodia', address: 'Ghatlodia, Ahmedabad, Gujarat 380061' },
  bopal: { lat: 23.0343, lng: 72.4642, title: 'Bopal', address: 'Bopal, Ahmedabad, Gujarat 380058' },
  sabarmati: { lat: 23.0848, lng: 72.5850, title: 'Sabarmati', address: 'Sabarmati, Ahmedabad, Gujarat 380005' },
  chandkheda: { lat: 23.1097, lng: 72.5850, title: 'Chandkheda', address: 'Chandkheda, Ahmedabad, Gujarat 382424' },
  gandhinagar: { lat: 23.2156, lng: 72.6369, title: 'Gandhinagar', address: 'Gandhinagar, Gujarat 382010' },
  ahmedabad: { lat: 23.0225, lng: 72.5714, title: 'Ahmedabad', address: 'Ahmedabad, Gujarat, India' },
  'civil hospital': { lat: 23.0531, lng: 72.6044, title: 'Civil Hospital Ahmedabad', address: 'Asarwa, Ahmedabad, Gujarat 380016' },
  'police commissioner office': { lat: 23.0338, lng: 72.5850, title: 'Police Commissioner Office', address: 'Shahibaug, Ahmedabad, Gujarat 380004' },
};

export default function MapSearchBar({ onSelectLocation, isGoogleLoaded, googleMapInstance }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Helper to safely dispatch coordinates to Google Maps
  const dispatchLocation = (lat, lng, title, address) => {
    const numericLat = typeof lat === 'function' ? lat() : Number(lat);
    const numericLng = typeof lng === 'function' ? lng() : Number(lng);

    if (isNaN(numericLat) || isNaN(numericLng)) {
      console.warn('Invalid coordinates:', lat, lng);
      return;
    }

    if (onSelectLocation) {
      onSelectLocation({
        lat: numericLat,
        lng: numericLng,
        title: title || 'SEARCH LOCATION',
        address: address || '',
      });
    }
  };

  // Fallback geocoding query over web when Google Cloud project billing is not enabled
  const fetchWebGeocode = async (term) => {
    const lower = term.toLowerCase().trim();
    for (const [key, val] of Object.entries(AHMEDABAD_LOCALITIES)) {
      if (lower.includes(key) || key.includes(lower)) {
        return {
          lat: val.lat,
          lng: val.lng,
          title: val.title,
          address: val.address,
        };
      }
    }

    try {
      const encoded = encodeURIComponent(term + ' Ahmedabad Gujarat');
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1&addressdetails=1`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            title: data[0].name || term.toUpperCase(),
            address: data[0].display_name,
          };
        }
      }
    } catch (e) {
      console.debug('Web geocode failed:', e);
    }
    return null;
  };

  // Direct search execution (on Enter key or Search button click)
  const executeDirectSearch = (searchTerm) => {
    const term = searchTerm || query;
    if (!term || term.trim().length < 2) return;

    setLoading(true);
    setNoResults(false);
    const cleanTerm = term.trim();

    // Check locality dictionary first for sub-millisecond instant lookup
    const lower = cleanTerm.toLowerCase();
    for (const [key, val] of Object.entries(AHMEDABAD_LOCALITIES)) {
      if (lower.includes(key) || key.includes(lower)) {
        setLoading(false);
        setIsOpen(false);
        setQuery(val.title);
        dispatchLocation(val.lat, val.lng, val.title, val.address);
        return;
      }
    }

    // Try Google Geocoder
    if (window.google && window.google.maps) {
      const geocoder = new window.google.maps.Geocoder();
      const geocodeOpts = { address: cleanTerm };
      if (googleMapInstance && googleMapInstance.getBounds) {
        geocodeOpts.bounds = googleMapInstance.getBounds();
      }

      geocoder.geocode(geocodeOpts, async (geoResults, geoStatus) => {
        if (geoStatus === 'OK' && geoResults && geoResults.length > 0) {
          const topResult = geoResults[0];
          const loc = topResult.geometry.location;
          setLoading(false);
          setIsOpen(false);
          setQuery(topResult.formatted_address || cleanTerm);

          dispatchLocation(
            loc.lat(),
            loc.lng(),
            cleanTerm.toUpperCase(),
            topResult.formatted_address
          );
        } else {
          // If Google geocoder fails due to billing or zero results, use fallback geocoding
          const fallbackLoc = await fetchWebGeocode(cleanTerm);
          setLoading(false);
          if (fallbackLoc) {
            setIsOpen(false);
            setQuery(fallbackLoc.title);
            dispatchLocation(fallbackLoc.lat, fallbackLoc.lng, fallbackLoc.title, fallbackLoc.address);
          } else {
            setNoResults(true);
            setIsOpen(true);
          }
        }
      });
    } else {
      fetchWebGeocode(cleanTerm).then((fallbackLoc) => {
        setLoading(false);
        if (fallbackLoc) {
          setIsOpen(false);
          setQuery(fallbackLoc.title);
          dispatchLocation(fallbackLoc.lat, fallbackLoc.lng, fallbackLoc.title, fallbackLoc.address);
        } else {
          setNoResults(true);
          setIsOpen(true);
        }
      });
    }
  };

  // Debounced search for autocomplete suggestions
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      setNoResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setNoResults(false);
      const trimmed = query.trim();
      const lower = trimmed.toLowerCase();

      // Check locality dictionary for instant suggestion matching
      const localMatches = [];
      for (const [key, val] of Object.entries(AHMEDABAD_LOCALITIES)) {
        if (key.includes(lower) || lower.includes(key) || val.title.toLowerCase().includes(lower)) {
          localMatches.push({
            id: `local-${key}`,
            title: val.title,
            subtitle: val.address,
            location: { lat: val.lat, lng: val.lng },
            type: 'locality',
          });
        }
      }

      if (localMatches.length > 0) {
        setLoading(false);
        setResults(localMatches);
        setIsOpen(true);
        return;
      }

      // Try Google Places API (New)
      if (
        window.google &&
        window.google.maps &&
        window.google.maps.places &&
        window.google.maps.places.AutocompleteSuggestion &&
        window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions
      ) {
        try {
          const { suggestions } =
            await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
              input: trimmed,
              locationBias: {
                center: { lat: 23.0225, lng: 72.5714 },
                radius: 50000,
              },
            });

          if (suggestions && suggestions.length > 0) {
            setLoading(false);
            setResults(
              suggestions.map((s) => {
                const pred = s.placePrediction;
                return {
                  id: pred.placeId || pred.place,
                  title: pred.mainText?.text || pred.text?.text,
                  subtitle: pred.secondaryText?.text || '',
                  placeId: pred.placeId,
                  rawSuggestion: s,
                  type: 'places-new',
                };
              })
            );
            setIsOpen(true);
            return;
          }
        } catch {
          // Fallback
        }
      }

      // Try Google Geocoder
      if (window.google && window.google.maps) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: trimmed }, async (geoResults, geoStatus) => {
          if (geoStatus === 'OK' && geoResults && geoResults.length > 0) {
            setLoading(false);
            setResults(
              geoResults.slice(0, 6).map((r, i) => ({
                id: r.place_id || `geo-${i}`,
                title: r.formatted_address.split(',')[0],
                subtitle: r.formatted_address,
                placeId: r.place_id,
                location: {
                  lat: r.geometry.location.lat(),
                  lng: r.geometry.location.lng(),
                },
                type: 'geocoder',
              }))
            );
            setIsOpen(true);
          } else {
            // Web fallback suggestions
            try {
              const encoded = encodeURIComponent(trimmed + ' Ahmedabad');
              const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=5&addressdetails=1`
              );
              if (res.ok) {
                const data = await res.json();
                setLoading(false);
                if (data && data.length > 0) {
                  setResults(
                    data.map((item) => ({
                      id: `osm-${item.place_id}`,
                      title: item.name || item.display_name.split(',')[0],
                      subtitle: item.display_name,
                      location: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) },
                      type: 'web-fallback',
                    }))
                  );
                  setIsOpen(true);
                  return;
                }
              }
            } catch {}

            setLoading(false);
            setResults([]);
            setNoResults(true);
            setIsOpen(true);
          }
        });
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle clicking an item in the suggestion dropdown
  const handleSelect = async (item) => {
    setIsOpen(false);
    setQuery(item.title);

    // Case 1: Location already present
    if (item.location) {
      dispatchLocation(
        item.location.lat,
        item.location.lng,
        item.title,
        item.subtitle
      );
      return;
    }

    // Case 2: Places API (New) Place object
    if (item.rawSuggestion && item.rawSuggestion.placePrediction) {
      try {
        const place = item.rawSuggestion.placePrediction.toPlace();
        await place.fetchFields({ fields: ['location', 'displayName', 'formattedAddress'] });
        if (place.location) {
          dispatchLocation(
            place.location.lat(),
            place.location.lng(),
            place.displayName || item.title,
            place.formattedAddress || item.subtitle
          );
          return;
        }
      } catch {}
    }

    // Case 3: Geocode the title or address
    executeDirectSearch(item.subtitle || item.title);
  };

  // Handle Enter key on search input
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0 && isOpen) {
        handleSelect(results[0]);
      } else {
        executeDirectSearch(query);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="map-search-container" ref={dropdownRef}>
      <div className="map-search-box">
        <button
          type="button"
          onClick={() => executeDirectSearch(query)}
          title="Search location"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span className="map-search-icon">🔍</span>
        </button>
        <input
          ref={inputRef}
          type="text"
          className="map-search-input"
          placeholder="Search Google Maps (e.g. Navrangpura, SG Highway, hospital)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
        />
        {loading && (
          <span style={{ fontSize: '10px', color: '#3b82f6', marginRight: '6px' }}>
            ⌛
          </span>
        )}
        {query && (
          <button
            type="button"
            className="map-search-clear"
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
              setNoResults(false);
            }}
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (
        <div className="map-search-dropdown">
          {results.length > 0 ? (
            results.map((item) => (
              <div
                key={item.id}
                className="map-search-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(item);
                }}
                style={{ cursor: 'pointer' }}
              >
                <span className="map-search-item-icon">📍</span>
                <div style={{ overflow: 'hidden', pointerEvents: 'none' }}>
                  <div
                    style={{
                      fontWeight: 600,
                      color: '#f8fafc',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.title}
                  </div>
                  {item.subtitle && (
                    <div
                      style={{
                        fontSize: '10px',
                        color: '#94a3b8',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.subtitle}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : noResults ? (
            <div
              style={{
                padding: '10px 14px',
                fontSize: '11px',
                color: '#94a3b8',
                fontFamily: 'var(--font-family-mono, monospace)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>No places found. Press <strong>Enter</strong> to search globally.</span>
              <button
                type="button"
                onClick={() => executeDirectSearch(query)}
                style={{
                  background: '#3b82f6',
                  border: 'none',
                  color: 'white',
                  padding: '3px 8px',
                  borderRadius: '2px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Search
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
