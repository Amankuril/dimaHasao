import React, { useEffect, useState } from 'react';
import { propertyService, userService } from '../../services/apiService';
import PropertyCard from './PropertyCard';
import { Loader2 } from 'lucide-react';

const PropertyFeed = ({ selectedType, selectedCity, viewMode = 'grid', limit, extraFilters = {} }) => {
  const [properties, setProperties] = useState([]);
  const [savedHotelIds, setSavedHotelIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPropertiesAndSaved = async () => {
      setLoading(true);
      setError(null);
      try {
        const filters = {};
        // Add extra filters only if they have a value
        Object.keys(extraFilters).forEach(key => {
          if (extraFilters[key] !== undefined && extraFilters[key] !== null) {
            filters[key] = extraFilters[key];
          }
        });

        // Only add type filter if a specific category is selected (not null/empty/All)
        if (selectedType && selectedType !== 'All' && selectedType !== null && selectedType !== '') {
          filters.type = selectedType;
        }

        // Fetch properties and saved status in parallel if logged in
        const promises = [propertyService.getPublic(filters)];
        if (localStorage.getItem('token')) {
          promises.push(userService.getSavedHotels());
        }

        const [data, savedRes] = await Promise.all(promises);

        if (savedRes) {
          const list = savedRes.savedHotels || [];
          setSavedHotelIds(list.map(h => (typeof h === 'object' ? h._id : h)));
        }

        let filteredData = data;
        if (selectedCity && selectedCity !== 'All') {
          filteredData = data.filter(p => p.address?.city?.toLowerCase() === selectedCity.toLowerCase());
        }

        setProperties(filteredData);
      } catch (err) {
        console.error("Failed to fetch properties:", err);
        setError("Could not load properties. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchPropertiesAndSaved();
  }, [selectedType, selectedCity, JSON.stringify(extraFilters)]);

  if (loading) {
    return (
      <div className={`flex justify-center items-center ${viewMode === 'carousel' ? 'h-56' : 'py-20'}`}>
        <Loader2 className="animate-spin text-surface" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-500">
        {error}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p>No properties found in this category.</p>
      </div>
    );
  }

  const displayedProperties = limit ? properties.slice(0, limit) : properties;

  if (viewMode === 'carousel') {
    return (
      <div className="flex overflow-x-auto gap-4 no-scrollbar snap-x snap-mandatory py-2 px-5 md:px-0 pb-1">
        {displayedProperties.map(property => (
          <PropertyCard
            key={property._id}
            data={property}
            className="min-w-[75vw] md:min-w-[270px] snap-center shrink-0"
            isSaved={savedHotelIds.includes(property._id)}
          />
        ))}
        {/* Spacer for right padding */}
        <div className="w-2 shrink-0" />
      </div>
    );
  }

  return (
    <div className="px-5 pb-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {displayedProperties.map(property => (
        <PropertyCard
          key={property._id}
          data={property}
          isSaved={savedHotelIds.includes(property._id)}
        />
      ))}
    </div>
  );
};

export default PropertyFeed;
