export const adminSidebarMenu = [
  {
    type: "link",
    label: "Dashboard",
    path: "/admin/food",
    icon: "LayoutDashboard",
  },
  {
    type: "link",
    label: "Point of sale",
    path: "/admin/food/point-of-sale",
    icon: "CreditCard",
  },
  {
    type: "section",
    label: "Food management",
    items: [
      {
        type: "link",
        label: "Food approval",
        path: "/admin/food/food-approval",
        icon: "CheckCircle2",
      },
      {
        type: "expandable",
        label: "Foods",
        icon: "Utensils",
        subItems: [
          { label: "Restaurant foods list", path: "/admin/food/foods" },
          { label: "Restaurant addons list", path: "/admin/food/addons" },
          { label: "Pricing management", path: "/admin/food/pricing" },
        ],
      },
      {
        type: "expandable",
        label: "Categories",
        icon: "FolderTree",
        subItems: [{ label: "Category", path: "/admin/food/categories" }],
      },
    ],
  },
  {
    type: "section",
    label: "Restaurant management",
    items: [
      {
        type: "link",
        label: "Zone setup",
        path: "/admin/food/zone-setup",
        icon: "MapPin",
      },
      {
        type: "expandable",
        label: "Restaurants",
        icon: "UtensilsCrossed",
        subItems: [
          { label: "Restaurants list", path: "/admin/food/restaurants" },
          { label: "New joining request", path: "/admin/food/restaurants/joining-request" },
          { label: "Top restaurants", path: "/admin/food/restaurants/top-restaurants" },
          { label: "Restaurant commission", path: "/admin/food/restaurants/commission" },
          { label: "Restaurant reviews", path: "/admin/food/restaurants/reviews" },
          { label: "Restaurant complaints", path: "/admin/food/restaurants/complaints" },
          { label: "Restaurant settings", path: "/admin/food/restaurants/settings" },
        ],
      },
    ],
  },
  {
    type: "section",
    label: "Order management",
    items: [
      {
        type: "expandable",
        label: "Orders",
        icon: "FileText",
        subItems: [
          { label: "All", path: "/admin/food/orders/all" },
          // { label: "Scheduled", path: "/admin/food/orders/scheduled" },
          { label: "Pending", path: "/admin/food/orders/pending" },
          { label: "Processing", path: "/admin/food/orders/processing" },
          { label: "Food on the way", path: "/admin/food/orders/food-on-the-way" },
          { label: "Delivered", path: "/admin/food/orders/delivered" },
          { label: "Cancelled", path: "/admin/food/orders/canceled" },
          { label: "Restaurant cancelled", path: "/admin/food/orders/restaurant-cancelled" },
          { label: "Payment failed", path: "/admin/food/orders/payment-failed" },
          { label: "Refunded", path: "/admin/food/orders/refunded" },
          { label: "Offline payments", path: "/admin/food/orders/offline-payments" },
        ],
      },
      {
        type: "link",
        label: "Order detect delivery",
        path: "/admin/food/order-detect-delivery",
        icon: "Truck",
      },
    ],
  },
  {
    type: "section",
    label: "Promotions management",
    items: [
      {
        type: "link",
        label: "Restaurant coupons & offers",
        path: "/admin/food/coupons",
        icon: "Gift",
      },
    ],
  },
  // TODO: Referral feature temporarily disabled. Uncomment to re-enable in future.
  // {
  //   type: "section",
  //   label: "Referral & rewards",
  //   items: [
  //     { type: "link", label: "Referral settings", path: "/admin/food/referral-settings", icon: "Gift" },
  //   ],
  // },
  {
    type: "section",
    label: "Customer management",
    items: [
      {
        type: "link",
        label: "Customers",
        path: "/admin/food/customers",
        icon: "Users",
      },
      {
        type: "link",
        label: "Support tickets (user & restaurant)",
        path: "/admin/food/support-tickets",
        icon: "MessageSquare",
      },
    ],
  },
  {
    type: "section",
    label: "Deliveryman management",
    items: [
      { type: "link", label: "Delivery cash limit", path: "/admin/food/delivery-cash-limit", icon: "IndianRupee" },
      { type: "link", label: "Multiorder setting", path: "/admin/food/multiorder-setting", icon: "Package" },
      { type: "link", label: "Delivery & platform fee", path: "/admin/food/fee-settings", icon: "DollarSign" },
      { type: "link", label: "Cash confirmations", path: "/admin/food/cash-confirmations", icon: "CheckCircle2" },
      { type: "link", label: "Cash limit settlement", path: "/admin/food/cash-limit-settlement", icon: "Receipt" },
      { type: "link", label: "Delivery withdrawal", path: "/admin/food/delivery-withdrawal", icon: "Wallet" },
      { type: "link", label: "Delivery boy wallet", path: "/admin/food/delivery-boy-wallet", icon: "PiggyBank" },
      { type: "link", label: "Delivery boy payout", path: "/admin/food/delivery-boy-commission", icon: "DollarSign" },
      { type: "link", label: "Delivery emergency help", path: "/admin/food/delivery-emergency-help", icon: "Phone" },
      { type: "link", label: "Delivery support tickets", path: "/admin/food/delivery-support-tickets", icon: "MessageSquare" },
      {
        type: "expandable",
        label: "Deliveryman",
        icon: "Package",
        subItems: [
          { label: "New join request", path: "/admin/food/delivery-partners/join-request" },
          { label: "Deliveryman list", path: "/admin/food/delivery-partners" },
          { label: "Deliveryman reviews", path: "/admin/food/delivery-partners/reviews" },
          { label: "Bonus", path: "/admin/food/delivery-partners/bonus" },
          { label: "Earning addon", path: "/admin/food/delivery-partners/earning-addon" },
          { label: "Earning addon history", path: "/admin/food/delivery-partners/earning-addon-history" },
          { label: "Delivery earning", path: "/admin/food/delivery-partners/earnings" },
        ],
      },
    ],
  },
  {
    type: "section",
    label: "Help & support",
    items: [
      { type: "link", label: "User feedback", path: "/admin/food/contact-messages", icon: "Mail" },
      { type: "link", label: "Safety emergency reports", path: "/admin/food/safety-emergency-reports", icon: "AlertTriangle" },
    ],
  },
  {
    type: "section",
    label: "Report management",
    items: [
      { type: "link", label: "Transaction report", path: "/admin/food/transaction-report", icon: "FileText" },
      { type: "link", label: "Order report", path: "/admin/food/order-report/regular", icon: "FileText" },
      { type: "link", label: "Tax report", path: "/admin/food/tax-report", icon: "Receipt" },
      {
        type: "expandable",
        label: "Restaurant report",
        icon: "FileText",
        subItems: [{ label: "Restaurant report", path: "/admin/food/restaurant-report" }],
      },
      {
        type: "expandable",
        label: "Customer report",
        icon: "FileText",
        subItems: [{ label: "Feedback experience", path: "/admin/food/customer-report/feedback-experience" }],
      },
    ],
  },
  {
    type: "section",
    label: "Transaction management",
    items: [
      { type: "link", label: "Restaurant withdraws", path: "/admin/food/restaurant-withdraws", icon: "CreditCard" },
    ],
  },
  {
    type: "section",
    label: "Banner settings",
    items: [
      { type: "link", label: "Landing page management", path: "/admin/food/hero-banner-management", icon: "Image" },
    ],
  },
  {
    type: "section",
    label: "Dining management",
    items: [
      { type: "link", label: "Dining banners", path: "/admin/food/dining-management", icon: "UtensilsCrossed" },
      { type: "link", label: "Dining list", path: "/admin/food/dining-list", icon: "FileText" },
      { type: "link", label: "Dining category request", path: "/admin/food/dining-requests", icon: "CheckCircle" },
    ],
  },
  {
    type: "section",
    label: "System settings",
    items: [
      { type: "link", label: "Broadcast notification", path: "/admin/food/broadcast-notification", icon: "Bell" },
      { type: "link", label: "Business setup", path: "/admin/food/business-setup", icon: "Settings" },
      { type: "link", label: "Customization settings", path: "/admin/food/customization-settings", icon: "Zap" },
      { type: "link", label: "Archived accounts", path: "/admin/food/archived-accounts", icon: "UserX" },
    ],
  },
  {
    type: "section",
    label: "Pages & social media",
    items: [
      { type: "link", label: "About us", path: "/admin/food/pages-social-media/about", icon: "Globe" },
      { type: "link", label: "Terms & conditions", path: "/admin/food/pages-social-media/terms", icon: "FileText" },
      { type: "link", label: "Privacy policy", path: "/admin/food/pages-social-media/privacy", icon: "Lock" },
      { type: "link", label: "Support", path: "/admin/food/pages-social-media/support", icon: "Headset" },
      { type: "link", label: "Refund policy", path: "/admin/food/pages-social-media/refund", icon: "Receipt" },
      { type: "link", label: "Shipping policy", path: "/admin/food/pages-social-media/shipping", icon: "Truck" },
      { type: "link", label: "Cancellation policy", path: "/admin/food/pages-social-media/cancellation", icon: "FileX" },
    ],
  },
];

