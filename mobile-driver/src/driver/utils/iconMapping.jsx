import { Car, Bike, Truck, Package, MapPin, Zap, Clock, IndianRupee, Briefcase, Milestone, Settings } from 'lucide-react-native';

/* Web: Taxi/modules/driver/utils/iconMapping.jsx. Maps semantic icon identifiers to icons (no emojis). */
export const getLucideIcon = (iconName, size = 20, color) => {
  const icons = {
    // Service & Vehicle Icons
    taxi_icon: <Car size={size} color={color} />,
    bike_icon: <Bike size={size} color={color} />,
    auto_icon: <Zap size={size} color={color} />, // Zap for Auto (modern look)
    cab_icon: <Car size={size} color={color} />,
    delivery_icon: <Package size={size} color={color} />,
    truck_icon: <Truck size={size} color={color} />,

    // General UI Icons
    location_icon: <MapPin size={size} color={color} />,
    time_icon: <Clock size={size} color={color} />,
    payment_icon: <IndianRupee size={size} color={color} />,
    corporate_icon: <Briefcase size={size} color={color} />,
    route_icon: <Milestone size={size} color={color} />,
    settings_icon: <Settings size={size} color={color} />,
  };

  return icons[iconName] || <Car size={size} color={color} />; // Fallback to Car
};
