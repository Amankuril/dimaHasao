import { useProfile } from '../../context/ProfileContext';
import PaymentForm from '../../components/profile/PaymentForm';

/** Port of pages/user/profile/AddPayment.jsx. */
export default function AddPayment() {
  const { addPaymentMethod } = useProfile();
  return <PaymentForm title="Add Payment Method" submitLabel="Save Payment Method" onSubmit={addPaymentMethod} />;
}
