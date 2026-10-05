import { Truck } from 'lucide-react-native';
import PolicyPage from '../../components/profile/PolicyPage';

/** Port of pages/user/profile/Shipping.jsx. */
export default function Shipping() {
  return <PolicyPage endpointKey="SHIPPING_PUBLIC" defaultTitle="Shipping Policy" EmptyIcon={Truck} />;
}
