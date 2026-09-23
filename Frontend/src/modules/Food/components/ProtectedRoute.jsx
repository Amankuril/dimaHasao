import { Navigate, useLocation } from "react-router-dom";
import { isModuleAuthenticated } from "@food/utils/auth";

/** Screens a restaurant may reach before an admin has approved it. */
const ALLOWED_BEFORE_APPROVAL = ["/food/restaurant/add-hotel"];

/**
 * Role-based Protected Route Component
 * Only allows access if user is authenticated for the specific module
 */
export default function ProtectedRoute({ children, requiredRole, loginPath = "/login" }) {
  const location = useLocation();

  // If no role required, allow access
  if (!requiredRole) {
    return children;
  }

  const isAuthenticated = isModuleAuthenticated(requiredRole);

  // If not authenticated for this module, redirect to login
  if (!isAuthenticated) {
    return <Navigate to={loginPath} state={{ from: location.pathname }} replace />;
  }

  // Intercept restaurant status
  if (requiredRole === "restaurant") {
    /*
     * Setting up the stay is reachable before approval. The combined "both"
     * signup lands there straight after registering, when the restaurant
     * cannot be anything but pending — bouncing it to the pending screen would
     * end the signup halfway through. Banned and deleted accounts are still
     * stopped below; those are account problems, not review states.
     */
    const allowedBeforeApproval = ALLOWED_BEFORE_APPROVAL.some((route) =>
      location.pathname.startsWith(route),
    );

    const userStr = localStorage.getItem("restaurant_user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const status = String(user?.status || "").toLowerCase();
        if ((status === "pending" || status === "rejected") && !allowedBeforeApproval) {
          if (status === "rejected") {
            const msg = user.rejectionReason
              ? `Your restaurant registration has been rejected. Reason: ${user.rejectionReason}`
              : "Your restaurant registration has been rejected. Please contact support.";
            localStorage.setItem("restaurant_pendingStatus", "rejected");
            localStorage.setItem("restaurant_pendingMessage", msg);
          } else {
            localStorage.setItem("restaurant_pendingStatus", "pending");
            localStorage.setItem("restaurant_pendingMessage", "Your restaurant registration is pending approval.");
          }
          return <Navigate to="/food/restaurant/pending-verification" replace />;
        }
        if (status === "banned" || status === "deleted") {
          const msg = "Your restaurant has been disabled. Reason: Disabled by admin";
          localStorage.setItem("restaurant_pendingStatus", "banned");
          localStorage.setItem("restaurant_pendingMessage", msg);
          return <Navigate to="/food/restaurant/pending-verification" state={{ isDisabled: true }} replace />;
        }
      } catch (e) {
        console.error("ProtectedRoute restaurant status check failed", e);
      }
    }
  }

  return children;
}
