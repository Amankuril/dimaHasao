import DeliverySignIn from '../../../components/delivery/auth/DeliverySignIn';

// Web: /food/delivery/login -> pages/auth/SignIn.jsx (phone step)
export default function DeliveryLogin() {
  return <DeliverySignIn isOtpStep={false} />;
}
