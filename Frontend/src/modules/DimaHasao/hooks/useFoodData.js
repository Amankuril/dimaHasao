import { useEffect, useState } from 'react';
import { RESTAURANTS_DATA } from '../data/foodData';
import { fetchRestaurants, fetchRestaurantWithMenu } from '../services/foodApi';

// Live food data with a fall back to the bundled sample data, so the approved
// UI still renders (and demos) when the API is unreachable.

export function useRestaurants() {
  const [restaurants, setRestaurants] = useState(RESTAURANTS_DATA);

  useEffect(() => {
    let cancelled = false;

    fetchRestaurants()
      .then((list) => {
        if (!cancelled && list.length) setRestaurants(list);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return restaurants;
}

export function useRestaurant(id) {
  const fallback = RESTAURANTS_DATA.find((r) => r.id === id) || RESTAURANTS_DATA[0];
  const [restaurant, setRestaurant] = useState(fallback);

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;

    fetchRestaurantWithMenu(id)
      .then((data) => {
        if (!cancelled && data?.menu?.length) setRestaurant(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [id]);

  return restaurant;
}
