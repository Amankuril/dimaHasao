import { XCircle } from 'lucide-react-native';
import PolicyPage from '../../components/profile/PolicyPage';

/** Port of pages/user/profile/Cancellation.jsx. */
export default function Cancellation() {
  return <PolicyPage endpointKey="CANCELLATION_PUBLIC" defaultTitle="Cancellation Policy" EmptyIcon={XCircle} honourReturnTo />;
}
