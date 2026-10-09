# Bugs found during the admin UI pass — reported, not fixed

The UI/UX pass was explicitly scoped to looks: no API call, payload, handler,
validation, navigation target, state shape or business rule was changed. These
are the defects the pass walked into and left alone. They are behaviour, not
styling, so each one needs a decision before it is touched.

Counted by severity of what a user sees, the recurring shapes are:

1. **A failed load looks like an empty list.** Dozens of screens `catch` a fetch
   failure by setting an empty array, so "the server is down" and "you have no
   records" render identically. Fixing it means adding an error flag to the
   catch block, which is a handler change.
2. **Optimistic writes that do not roll back.** Approve/reject/delete rows
   disappear before the request resolves and come back only on the next fetch.
3. **Pagination and filters computed on the page, not the server**, so a count
   or a filter silently applies to the current page only.
4. **A 200 with an unexpected body leaves a form stuck in edit mode**, with no
   toast either way.

199 findings across 22 units.

## food-core

- AdminHome: the dashboard-stats effect reads dashboardData but lists only [selectedZone, selectedPeriod] as deps, so the 'keep the old data on a 429' guard always tests the first-render value (null) and wipes good data on a throttled refetch
- AdminHome: nothing can retry a failed stats load except changing a filter - there is no reload handler to hang ErrorState's Try again on
- AdminSettings: adminInfo stays null both while loading and after a failed /auth/me with no admin_user in storage, so a failure is indistinguishable from loading; a proper ErrorState needs a new error flag
- AdminProfile: handleSubmit only clears the form, resets the password fields and leaves edit mode inside if (updatedAdmin); a 200 without a user object in the body leaves the screen in edit mode with no toast at all
- AdminForgotPassword: step 2's 'Verify code' only checks that six digits were typed and advances to step 3 - the OTP is never verified against the backend, so a wrong code is only reported after the user has chosen a new password

## food-zones

- ZoneSetup, ViewZone, AddZone, AllZonesMap and DeliveryBoyViewMap swallow fetch failures (catch sets an empty list or navigates away) with no error flag, so a failed load is indistinguishable from empty data. Adding a real ErrorState needs a setError in those catch blocks, which is a handler change - left alone.
- AllZonesMap.zonePolygons returns [] when `restaurants.length === 0`, so a district with zones but no restaurants draws no zones at all and shows the empty state.
- FoodApproval approve/reject optimistically filter the row out before the API call and only refetch on success; a failed request shows a toast but the row is gone until the follow-up fetch lands.
- JoiningRequest pages server-side but filters and sorts only the current page, so the zone/date filter and every column sort apply to 20 rows, not the result set; totalItems is also swapped for sortedRequests.length while a filter is on.
- JoiningRequest.hasFetchedOnceRef is assigned and never read (the StrictMode double-fetch guard it documents is not wired up).
- FoodApproval imports useMemo and never uses it; filteredRequests is just foodRequests.

## food-orders

- NewRefundRequests has no way to reload after a failed fetch: the fetch lives inside a useEffect with no exported retry, so its ErrorState cannot offer one without changing the data flow
- NewRefundRequests passes order.id to adminAPI.processRefund and to the processing-spinner check, but the list rows are keyed on order.orderId; if the API payload omits id, every row's spinner matches (processingRefund === undefined) at once
- NewRefundRequests computes totalCount from the response and never reads it other than for my empty-state copy; the restaurant filter list is built from o.restaurant with no de-dup of falsy values, so an order without a restaurant adds an empty option
- OrdersTable receives onDeleteOrder and deletingOrderId but renders no delete control, and OrdersPage defines handleDeleteOrder without wiring it - dead props on both sides
- OrdersPage polls every 8s and also holds a socket; the poll's withRingCheck path can fire the new-order alert for an order the socket already announced (no shared dedupe between recentRealtimeOrderRef and seenOrderIdsRef)
- PointOfSale leaves restaurantData in state but never reads it, and fetchRestaurantAnalytics swallows 404/400 into debug logs so a missing restaurant shows zeroed analytics rather than an error
- OrdersTable itemPrice column previously padded itself with a spacer div to line up with the food-items expander; the columns are independent cells so the alignment was approximate - I dropped the spacer, the two columns now simply top-align

## food-restaurants

- AddRestaurant: the success dialog navigates to '/admin/restaurants' while the list lives at '/admin/food/restaurants' (the Add button's source route), so finishing the wizard can land on a dead route
- EditRestaurant: when the route has no :id the load effect returns before clearing `loading`, so the screen shows the loading state forever
- RestaurantsList: handleEditLocation is defined but no control calls it, so the per-row 'edit location' entry point is unreachable (the editor only appears via Edit details)
- RestaurantsList: the `filters` state is never updated (setFilters unused) yet filteredRestaurants filters on it, so those filters are dead code
- RestaurantsBulkImport/RestaurantsBulkExport: Import, Export and both template downloads are stubs - they only alert or do nothing, no API call
- Out of unit: PlacesSearchInput suggestion rows are px-3 py-2 (~36px), under the 44px touch target, and it is used by both restaurant forms

## food-promotions

- FoodCampaign: the row Edit button, the Export button and the Settings button have no onClick at all - they are dead controls
- Cashback and Banners: the row Edit buttons have no onClick; Banners has no banner-image picker (the upload area was never wired to pickImage, unlike PromotionalBanner)
- Cashback and Banners: amounts and limits are labelled and rendered in $ while the rest of the admin is in Rs
- BasicCampaign/FoodCampaign/Cashback/Banners/AdsList/AdRequests read from utils/adminFallbackData and mutate local state only - nothing is persisted and no API is called
- Coupons: filteredOffers = offers with a comment about filtering by search; search is server-side only, so the local variable is misleading dead indirection
- Coupons: AdminListPagination renders even when the list is loading, errored or empty
- AdsList priority Select and AdRequests approve/deny only change local state; the ads list priority has no persistence call
- PromotionalBanner: the preview image is read as base64 into state and saved into localStorage, which can exceed the quota for a 2MB image (save then silently throws)
- Mojibake in the hardcoded languageTabs labels (Spanish 'espa<?>ol', Cafe Monarch) was copied into five promotion screens; corrected in the four screens of this unit, but other units ported from the same source still carry it

## food-catalog

- RestaurantComplaints: the stats state is fetched and stored but never rendered - there is no KPI row for total/pending/resolved counts
- RestaurantCommission: visibleColumns/columnsConfig and setVisibleColumns exist but no column-settings UI was ever ported, so the feature is unreachable; fetchApprovedRestaurants is also dead after the bootstrap call
- RestaurantCommission and RestaurantComplaints toast on a failed fetch but keep no error flag, so a network failure shows an empty list rather than a retry path - an ErrorState cannot be wired without adding state
- AddonsList delete calls rejectRestaurantAddon(id, 'Deleted by admin') - a reject, not a delete, so the row only disappears because the list filters to approved
- TopRestaurants Status column is hardcoded to Approved for every row; it never reads the restaurant's real status
- FoodsList: getFoodInitial, getPlaceholderColor and PLACEHOLDER_COLORS are dead - FoodImageThumb always falls back to dishFallbackImage, so the coloured-initial placeholder was lost in the port
- RestaurantReviews pageSize is read from localStorage but AdminListPagination writes it back only on change; a value above the API limit would silently over-fetch

## food-customers

- RestaurantWithdraws: visibleColumns.restaurantAddress is a dead toggle - it appears in the Table Settings dialog but no address column or data field exists, so toggling it does nothing
- Customers: handleToggleStatus/handleToggleCodStatus look the customer up with (c._id || c.id) === customerId but are called with (customer.id || customer.sl), and the optimistic setCustomers map keys on c.id only - for records that carry only _id the toggle silently no-ops or updates the wrong row
- Customers: the Order Date filter is wired into state but never used in filteredCustomers nor sent to the API - it has no effect
- Customers: 'Apply Filters' has an empty handler (comment says filters apply via useMemo), so it is a button that does nothing
- SubscribedMailList: the Filter button, the Export button and all three filter fields are inert - no handler reads filters.subscriptionDate / sortBy / chooseFirst
- SubscribedMailList/Bonus/WithdrawMethod/EmployeeList/EmployeeRole/Report: data comes from adminFallbackData or a hardcoded array, not the API, so every screen is static mock content
- AddFund, Bonus, AddEmployee, EmployeeRole submit handlers only alert() - no API call, and no validation of amount, password match or length
- WithdrawMethod handleToggleActive/handleToggleDefault mutate the existing objects in place ([...methods] is shallow), so React can miss the change
- SupportTickets: the useEffect that loads tickets omits `load` and `filters` from its dep array and only watches three filter fields - adding a filter later will silently not refetch
- EmployeeList: maskEmail crashes on an email with no '@' (localPart.length on undefined domain path is fine, but a bare string makes domain undefined and renders 'x***@undefined')
- ContactMessages/SafetyEmergencyReports: the record counter shows feedbacks.length (this page) while the pager counts server pages, so the number contradicts the pagination

## food-delivery-ops

- DeliveryWithdrawal: the # column renders `index + 1`, ignoring the page offset, so rows on page 2 are numbered 1..n again (every other screen in the unit uses (page-1)*limit+i+1).
- DeliveryWithdrawal: `localStorage` is read in useState and written in onPageSizeChange with no import and no webShim alias (the file imports only `window` from lib/webShim), so the page-size preference depends on a global that may be undefined on native.
- DeliveryBoyWallet: a 5-second setInterval poll sits in an effect keyed on fetchWallets, which is recreated whenever page or searchQuery changes, so the interval is torn down and restarted on every keystroke; the search effect also fires once on mount, duplicating the first fetch.
- DeliveryBoyWallet / CashLimitSettlement: a failed load calls toast.error and sets the list to [], so the screen shows 'No wallets found' / 'No settlements found' instead of an error; there is no error state to render ErrorState from, and adding one would change state shape.
- DeliveryBoyCommission: handleSave resets formData without `maxDistanceUnlimited`, so after a successful save that key is dropped from state and the Unlimited checkbox is uncontrolled until the dialog is reopened.
- DeliveryBoyCommission: resetColumns writes a `totalCommission` key that is not in visibleColumns' initial shape or in columnsConfig, so it is stored but never used.
- DeliveryCashLimit: each of the two Save buttons posts both fields, so pressing Save on one card also commits whatever is currently typed in the other.
- DeliveryEmergencyHelp: the green 'Changes will be reflected immediately' banner was rendered on `!loading && !saving`, i.e. always, not after a save; kept as a muted hint line rather than removed.
- MultiorderSetting / DeliveryCashLimit: both read and write the same endpoint (getDeliveryCashLimit / updateDeliveryCashLimit) for different fields, so the two screens can overwrite each other's values.
- DeliverySupportTickets: fetchTickets is called from an effect keyed on statusFilter/priorityFilter only, so typing in the search box does nothing until Enter or the Search button; formatDate has been dead code since before this pass.
- DeliveryCashLimit had two mojibake characters (U+FFFD) in its loading text, which came through the original port.

## food-delivery-partners

- AddDeliveryman submits nothing: handleSubmit awaits a 1s setTimeout and shows a success dialog - no API call. Zone options are hardcoded Asia/Europe and the phone prefix is +1, both wrong for Dima Hasao. The image and identity-image uploaders have no picker wired at all.
- EarningAddon redemptions column reads `{currentRedemptions} / {maxRedemptions || '8'}` - an unlimited offer (maxRedemptions null) is shown as a cap of 8.
- DeliveryEarnings export menu offers CSV/Excel/JSON but handleExport also has a 'pdf' branch with no menu item; Excel and PDF only toast 'coming soon'. EarningAddonHistory's whole export menu is a 'coming soon' toast.
- DeliverymanList handleView() sets the page-level `loading` flag, so opening one partner's details blanks the whole table behind the dialog.
- DeliverymanList polls every 8s with two requests per tick (partners + wallets) regardless of focus; a slow save can be overwritten by a poll landing after it.
- DeliverymanReviews, DeliverymanBonus, EarningAddon and EarningAddonHistory have no error state at all - a failed fetch only toasts and empties the list, so it renders as 'no data'. An ErrorState cannot be wired without adding state and touching the catch blocks, which this pass may not do.
- JoinRequest's `loadingDetails` is set but never rendered, so tapping a row gives no feedback until the dialog opens.
- DeliverymanReviews row links point at /admin/delivery-partners/{id} and /admin/users/{id}; those detail routes do not exist in this app, so the links are dead (left as-is, navigation targets are out of scope).
- GradientFill.jsx in this folder is now unreferenced dead code after the gradient dialog headers were flattened.

## food-reports

- RegularOrderReport: the 'Total Item Amount' column renders formatAmount(order.totalAmount), so it duplicates the Order Amount column and never shows order.totalItemAmount (src/food/pages/admin/reports/RegularOrderReport.jsx)
- FeedbackExperienceReport: the details dialog shows the rating as '{rating}/10' while the table, filter options and statistics all use /5
- RestaurantReport: the negative-commission highlight tests totalAdminCommission.startsWith('?-') / '-?' (mojibake currency sign), so it never matches, and it throws if totalAdminCommission is missing
- RestaurantVATReport / CampaignOrderReport / DisbursementReport*: a restaurant filter option value is the mojibake 'Caf� Monarch', which can never match live data
- ExpenseReport, CampaignOrderReport, RestaurantVATReport and both disbursement reports read static fallback data (adminFallbackData) - no API call, so they have no real loading or error path to cover
- RestaurantVATReport 'View' action and CampaignOrderReport view/print actions have no handler (no onClick)
- TaxReport/RestaurantReport/FeedbackExperienceReport report fetch failures only through a toast - there is no error state variable, so no ErrorState could be wired without changing state shape

## food-settings

- Gallery.jsx handleDeleteFolder calls `window.confirmAsync(...)` but the file only imports `alert` from lib/webShim, so on a device it hits the global window and throws 'window.confirmAsync is not a function' - deleting a folder is dead.
- Gallery.jsx is entirely local state: the folder list is 41 hard-coded placeholder names ('React_head', 'Payment_mo', 'Opportunit' - truncated vendor strings), uploads only mutate React state and nothing is ever sent to or read from the API.
- ReactRegistration.jsx has no API at all: handleSubmit only logs, handleReset clears the hero image but not the steps/opportunities/FAQs, and nothing is persisted.
- LoginSetup.jsx panel URLs are hard-coded stackfood.com addresses and handleSubmit only alerts; no setting on the screen is saved anywhere.
- EmailTemplate.jsx handleSubmit does not call the API either, and its defaults still say 'StackFood' and '(c) 2023 StackFood'.
- The rich-text toolbar in EmailTemplate (B/I/U/S/Color/Link/Image), the 'Read Instructions' link, the 'StackFood Logo' placeholder box and the per-file delete button in Gallery all had empty handlers; I removed these dead controls rather than restyle them.
- No screen in this unit tracks a load error, so a failed GET only fires a toast and leaves an empty form that looks saved. Covering ErrorState would mean adding error state and touching the catch blocks, which the UI-only rule forbids - flagging it instead.
- LegalTerms/LegalPrivacy/SupportCMS useEffect depends on activeRole but calls fetchXData declared below it (pre-existing react-hooks/immutability warning); switching role refetches by luck of the closure.
- BusinessSetup.jsx still defines an unused ToggleSwitch component left over from the port.

## food-landing

- LandingPageManagement: the whole Categories feature is unreachable. categories/pendingCategories state, fetchCategories, handleCategoryFileSelect, handlePendingCategoryLabelChange, handleRemovePendingCategory, handleUploadPendingCategories, handleDeleteCategory, handleToggleCategoryStatus and handleCategoryOrderChange all exist, but there is no 'categories' entry in `tabs` and no render branch, so the admin cannot manage landing categories at all.
- LandingPageManagement: the Explore More icons grid only uploads. handleDeleteExploreMore, handleToggleExploreMoreStatus, handleExploreMoreOrderChange, exploreMoreLabel/exploreMoreLink and exploreMoreUploading/exploreMoreDeleting are all dead, so an icon can never be removed, reordered or switched off once uploaded.
- LandingPageManagement: the Explore More sub-tab loop computes `const isActive = activeTab === 'explore-more' && (tab.id === 'gourmet' ? gourmetRestaurants.length > 0 : false)` and then never uses it - the active styling comes from exploreMoreSubTab. The variable is dead (I dropped it in the restyle); whatever it was meant to signal is missing.
- LandingPageManagement: a failed fetch calls setErrorSafely and leaves the list empty, and setErrorSafely deliberately swallows any message containing 'token'/'unauthorized', so an expired session shows an empty list with no message at all. My ErrorState only fires when `error` survived that filter.
- LandingPageManagement: `error` and `success` are one shared pair of strings for six independent loaders, so an error from the banners tab is still displayed after switching to dining, and nothing ever clears them on tab change.
- LandingPageManagement: gourmetRestaurants.sort((a,b) => a.order - b.order) sorts the state array in place during render.
- LandingPageManagement: the gourmet image falls back to 'https://via.placeholder.com/400', a dead external host, instead of a local asset.
- LandingPageManagement: the fest-banner Remove button only clears festBannerImageUrl/festBannerTopColor in local state - it is not persisted until Save Settings, and nothing says so.
- LandingPageManagement: selectedBannerId is set when the Advertise dialog opens but handleLinkRestaurants is the only reader; cancelling clears it while linkingRestaurants is not reset on unmount, so a failed link can leave the button stuck.
- LandingPageSettings: only the Header tab is wired to state. Every other admin tab and every react tab except Header renders uncontrolled inputs with no value, no onChange and no API call, and handleSave only logs - so 19 of the 21 sections silently discard whatever is typed.
- LandingPageSettings: handleReset resets the Header state regardless of which section's Reset was pressed, so pressing Reset under 'About us' quietly reverts the Header content instead.
- LandingPageSettings: the language tabs (adminActiveLanguage / reactActiveLanguage) change nothing - the same single set of fields is shown for every language, so a translation typed under English(EN) overwrites the default.
- LandingPageSettings: 'See how it works!' is styled as a link but has no handler.
- LandingPageSettings: the Promotional Banner image tile has no picker handler at all (unlike every other image slot), so it cannot be used.

## taxi-core

- AdminEarnings: 'Export CSV' and 'Download report' are two buttons bound to the same handleExport, so there is no report format at all
- AdminEarnings: several KPIs are invented client-side, not API data - netPlatformRevenue = commission*0.95, refundAmount = gross*1.5%, pendingSettlements = driverEarnings*8%, 'Paid to drivers' = driverEarnings*0.92, and the refund column plus 'Next settlement target: Friday, 10:00 AM' are hardcoded
- AdminEarnings: every row's status is a hardcoded 'Success' badge regardless of the transaction
- AdminEarnings: the Escape-to-close listener binds to lib/webShim window, so it is dead on a device
- MainDashboard: 'Online customers' = max(1, totalUsers*0.15) and 'Platform uptime' = '99.98%' are fabricated; the whole Performance leaderboard ('Rydon Driver Node A'...), the five platform-health statuses and both AI insight paragraphs are hardcoded demo content
- MainDashboard: the 'Pending approvals' KPI shows totalDrivers.declined (declined drivers), not pending ones
- MainDashboard: fetchData's catch discards the error and always reports 'System offline', hiding 401/validation failures
- CancellationAnalytics: the fetch only sets data when response.data.success is true and never records an error, so a failed or non-success call is indistinguishable from an empty report (the new ErrorState papers over it)
- AdminLayout: removing the shell's px-4 means any taxi admin screen not yet on AdminPage and without its own padding will sit flush to the edges

## food-system

- NotificationChannels: the SMS column renders a toggle only when `notification.sms !== false`, so switching SMS off replaces the switch with a static 'N/A' badge and it can never be switched back on
- AppWebSettings: each card's Reset button calls only the Android reset (handleUserAppAndroidReset etc.); the iOS fields are left untouched and handleUserAppIOSReset/handleRestaurantAppIOSReset/handleDeliverymanAppIOSReset are dead code. The three Submit buttons have no onClick at all, so nothing is saved
- OfflinePaymentSetup: 'Add New Method' and the per-row edit (pencil) button have no onClick — both are dead
- CleanDatabase: handleSelectAll exists but no control ever calls it, so there is no select-all; and 'Clear' only alerts — no API call
- ReactSite, AISetup, JoinUsPageSetup, FirebaseNotification, AnalyticsScript, AddonActivation, ThirdParty, PageMetaData, NotificationChannels, CleanDatabase all run on hard-coded mock data and alert() on save; none of them calls an API
- FirebaseNotification: the Bengali/Arabic/Spanish language tab labels are mojibake in the source (UTF-8 read as latin-1), e.g. 'Bengali - à¦¬à¦¾à¦‚à¦²à¦¾(BN)'
- FirebaseNotification reads import.meta.env.* for its defaults, which is Vite, not Expo — these are always empty in the app
- ArchivedAccounts and DiningManagement swallow fetch failures into a toast/console only, with no error state in the component, so a failed load is indistinguishable from an empty list; I could not add an ErrorState without adding state
- useAdminNotifications never surfaces a load error (it keeps the last snapshot on failure), so AdminNotifications cannot show an error path
- DiningList polls getDiningRestaurants every 3 seconds for the whole screen's lifetime
- ArchivedAccounts formatted ids with account.id.substring(...), which throws when an account has no id; I changed it to String(account.id || '').slice(-8) as part of the text rendering, but the underlying rows with no id are still worth checking server-side
- NotificationChannels' subtitle said notifications come 'from StackFood' (the upstream vendor's product name); I reworded the copy

## taxi-drivers

- DriverList + PendingDrivers: the Filters panel's dateRange and vehicleType state is never sent to adminService.getDrivers, so both filters do nothing
- DriverList + PendingDrivers: three useEffects (itemsPerPage, searchTerm, page) each fetch, so first mount fires three overlapping requests and a page-size change fires two
- EditDriver: a hardcoded super-admin JWT is committed as the fallback when localStorage has no adminToken (providedToken), and it is used for every fetch on the screen
- EditDriver: the Metadata card always prints Status 'Active' and 'DRV-' + id prefix regardless of the driver's real status or driver_code
- EditDriver: the 'Disable Account' button has no handler
- EditDriver: Cancel navigates to /taxi/admin/drivers while Back uses location.state.from, so cancelling from the pending queue lands on the wrong list
- DriverAudit: the per-document Eye / CheckCircle2 / MessageSquare row actions and 'Re-audit all documents' have no handlers
- DriverAudit: document expiry always renders 'Not captured' or 'N/A' - the template's expiry value is never read
- DriverDetails: the wallet adjust fetch ignores the response status, so a failed credit/debit still clears the form and reports nothing
- DriverDetails: acceptanceRate/cancellationRate divide by requests.length (the current page of requests), not the driver's lifetime totals
- DriverDetails: 'Review History' is hardcoded to show no reviews; no API call is made
- DriverList: the password modal rejects under 4 characters while its hint says 'Minimum 8 characters required'
- PendingDrivers: the password modal has no minimum-length check at all
- DriverBulkUpload: addFiles aborts the whole batch on the first invalid file but keeps any files already validated out of state, so a mixed selection silently drops the valid ones

## taxi-pricing

- VehicleType list: the Active StatusToggle has onToggle={() => {}} - toggling a vehicle type from the list does nothing and never calls the API
- RentalPackageTypes: the status toggle calls adminService.updateRentalPackageType(...).then(...) with no .catch, so a failed status change shows a success toast's absence and no error at all (unhandled rejection)
- SetPrices: the list status toggle swallows every failure (catch (e) {}) and calls fetch() directly with a localStorage token instead of the shared axios instance
- ServiceLocation: handleDelete swallows errors (catch (err) {}) and only refetches when res?.success, so a failed delete is silent
- Airport: handleDelete removes the row only when res?.success is truthy; a 200 response without that flag leaves the deleted airport on screen
- CreatePackagePrice/SetPrices: validation runs on required HTML attributes plus toast.error, and hidden required inputs (payment_type, transport_type) are not reachable by keyboard - invalid submits can block with no visible message
- ZoneManagement: `drivers` state and the isDriverAvailable import are fetched/declared but never used anywhere on the screen

## taxi-drivers-settings

- WithdrawalRequestDrivers.jsx: the row action navigates to '/admin/drivers/wallet/withdrawals/<id>' without the '/taxi' prefix every other link in the module uses, so View details likely lands on a dead route
- PaymentMethods.jsx: itemsPerPage is read from the Show select but never applied - filteredMethods is rendered unsliced, so the entries selector does nothing (and setItemsPerPage stores a string, not a number)
- DriverWallet.jsx: the whole screen is hardcoded mock data (walletStats and ledger are useState literals with no fetch); Export CSV and Bulk Settle Payouts have no handler at all
- TipSettings.jsx: presets and allowCustom are UI-only local state and are deliberately excluded from the PATCH payload, so edits there are silently lost on reload
- DispatcherAddons.jsx: handleVerify is a 1.5s setTimeout that always reports 'Invalid purchase code' - there is no verification call
- MailSettings.jsx: Send Test Mail is a 1.2s setTimeout that always reports success; no mail is sent
- AppModules.jsx: the list status toggle calls updateAppModule(...).then(...) with no .catch, so a failed toggle shows a success toast path only on success and swallows the rejection
- OnboardingScreens.jsx: the entries selector slices with filteredScreens.slice(0, entries) and there is no pagination, so rows beyond the first page are unreachable
- GlobalDocuments.jsx / PaymentMethods.jsx: handleToggleStatus and handleDelete report failures through window.alert rather than the app's toast, which is invisible on native

## taxi-users-ops

- UserList: the Export button has no onClick at all, so it is dead
- UserList: the 'Update Password' action menu item calls handleEditUser, exactly the same as 'Edit' — there is no password-only flow
- UserModal: on edit it sets gender from editingUser.gender, but UserList maps gender to a display label ('Male'/'N/A'), so the gender select silently falls back to 'male' and an edit can overwrite the stored gender
- UserBulkUpload: 'Select Files' navigates to '/user-import/create', a route that is not mounted anywhere in the app; UserImportCreate.jsx is therefore unreachable
- UserDetails: the 'Show N entries' select and the whole Filters panel (status select, Apply) are uncontrolled with no state or handler — purely decorative; the pagination is hard-coded to page 1
- DeleteRequestUsers: pagination is hard-coded (Prev/Next permanently disabled, page always 1) while the API is called without any page parameter
- DeleteRequestUsers: the view/eye action navigates to /taxi/admin/users/<request._id>, using the delete-request record id as a user id
- Trips: the 'Assign Driver', 'Track Trip' and 'Cancel Trip' action-menu items have no onClick, so they do nothing when enabled (Ongoing's equivalents at least toast 'not implemented')
- Ongoing: a limit selector exists but the screen has no pagination, so changing it only refetches a bigger first page
- SafetyCenter: adminSession (getChatSession('admin')) is computed and never used; the SOS chat is hard-disabled with a single seeded system message
- SafetyCenter: 'Avg Response' is the hard-coded string '< 30s' and 'High Priority' just repeats alerts.length
- UserDetails: fetches with raw fetch + localStorage.getItem('adminToken') instead of the shared api client, so a 401 is not handled

## taxi-geo-promo

- BannerImage: the 'show N entries' <Select> has no value or onChange, so the page-size picker does nothing, and the pagination footer is hardcoded to page 1 of 1 — the list is never paginated.
- Finance: the four KPI tiles, the revenue trend and the settlement-quality percentages are hardcoded literals (₹12.4L, 82/15/3, the 12-month series); only the settlements table is live data.
- Finance: withdrawals without a transactionId get an id from Math.random() inside the map, so the displayed id changes on every refetch.
- Admins: 'Login success rate', 'Password resets', 'Permission changes', Recent activity, Top departments, Access by module and 'Failed logins / Password expiring' are all hardcoded; employeeId falls back to a value derived from the mongo id's last charCode.
- Admins: selectedRowIds is collected but no bulk action consumes it, and serviceLocations/zones are fetched and never used (the create/edit forms send empty scope arrays).
- Admins: the escape-key effect adds a listener to the webShim window; on native nothing dispatches keydown, so the only way to close the detail panel is its own button (as intended by the shim, but the effect is dead weight).
- GeoFencing / GodsEye: the no-key placeholders referenced a Windows path (z:/projects/appzeto-taxi/frontend/.env) and VITE_GOOGLE_MAPS_API_KEY — stale instructions for this app; copy was replaced but the key itself is still unconfigured (see memory: google-maps-api-key-blank).
- GodsEye: controls.cluster is toggled and stored but never read — there is no clustering on the map.
- UserReferralSettings: handleToggle's failure path calls setSettings(settings) with the stale pre-update object captured in the closure; the revert works only because setSettings had not yet committed, and the catch's `err` is unused.
- PromoCodes: the service-location multiselect has no click-outside close on native (documented in the file), so the dropdown closes only by tapping the field again.
- CountryManagement / Preferences: the edit (pencil) buttons on both tables have no onClick — editing a country or a preference is not wired up.
- SendNotification / PromoCodes / Admins: user-facing copy mixes Hindi and English ('promo all users ke liye available rahega'); left as-is since this pass is layout only, but it reads as unfinished.

## hotel-records

- AdminHotelDetail BookingsTab renders a 'Search Guest Name' input with no value/onChange and no filtering: the control is dead. Left as-is (UI-only pass).
- AdminPartners keeps filters.approvalStatus in state and sends it to adminService.getPartners, but no control ever sets it, so approval filtering is unreachable from the UI.
- AdminBookings reads bookingStatus for the list rows while AdminBookingDetail and AdminHotelDetail read booking.status (with a bookingStatus fallback only in the detail page): inconsistent field naming risks a blank status in the hotel-detail booking table.
- AdminBookingDetail hardcodes 'Payment status: PAID' and 'Payment verified' regardless of the booking's real payment state.
- AdminUsers has a role filter (user/partner/admin) but fetchUsers always sends role:'user', so choosing a role does nothing.
- AdminProperties/AdminPartners computed totalPages but rendered pagination only when totalPages > 1 while also never showing the current count; the kit Pagination now always shows totals (behaviour of the fetch unchanged).

## hotel-core

- AdminFinance: the 'Export Report' button has no onClick at all — it is a dead control.
- AdminFinance: the status filter offers 'Pending' but the predicate only special-cases 'Active', so 'Pending' and any future value both mean 'not approved'.
- AdminFinance: the 20% commission rate is hard-coded in the page while Settings saves a configurable defaultCommission, so the two disagree.
- AdminOffers: 'Highest Discount' is the literal string '75%', not computed from the offers.
- AdminOffers: the usage progress bar divides by offer.usageLimit with no guard, so a 0/absent limit yields Infinity/NaN width.
- AdminNotifications: the 'sent' tab filters broadcast_log client-side out of a fixed first 100 notifications, so older broadcasts silently vanish and there is no pagination.
- AdminNotifications: opening the Received tab marks every notification read as a side effect of loading, so the unread dot can never be reviewed twice.
- AdminLegalPages: handleSaveAll PUTs all four pages in a sequential loop with no per-page error handling — a failure halfway leaves some saved and some not.
- AdminReviews: the filter offers status 'flagged' but StatusBadge/toneFor has no 'flagged' entry, so flagged reviews render as a neutral grey badge.
- AdminCategories: handleCreate and handleDelete exist but no control reaches them (the Add and Delete buttons were removed upstream); they are dead code kept as found.
- AdminLayout: the notification dropdown only ever shows notifications.slice(0, 3) although it fetches 5.

## tours-global

- Tours Reviews printed review.packageId.title twice (as the card title and again in the meta line); the duplicate is dropped visually but the data shape suggests the meta line meant to show something else
- Festivals gate check-in sets scanResult.ok on success but the banner branches on scanResult.valid, which only exists on the server payload: a verify call that resolves without a `valid` field renders as 'Refused'
- Dashboard links to /tours/admin/packages?status=pending but Packages reads `status` from useSearchParams and its filter pills call setParams({}) wholesale, so any other query parameter on the URL is dropped
- Support's stats effect depends on tickets.length, so editing a ticket's status (which changes a group count but not the list length) leaves the waiting/total counters stale
- LegalDocuments' remove() leaves the editor holding the just-deleted document's content with isActive true, so pressing Save immediately republishes what was removed
- Tours Settings save() sends Number(settings.taxRate) with no validation, so a blank tax field posts NaN

## Found later, while verifying the pass in a browser

- **hotel › Bookings**: the KPI row read `NaN` for "Pending approval" and `0` for
  "Confirmed" against 31 bookings. `getDashboardStats()` does not return
  `confirmedBookings`, so `total - confirmed` is `NaN`. The cards now render an
  em dash instead of `NaN`, but the number itself is still missing — the
  endpoint or the field name has to change.
