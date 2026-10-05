import { Receipt } from 'lucide-react-native';
import PolicyPage from '../../components/profile/PolicyPage';

/** Port of pages/user/profile/Refund.jsx. */
export default function Refund() {
  return <PolicyPage endpointKey="REFUND_PUBLIC" defaultTitle="Refund Policy" EmptyIcon={Receipt} />;
}
