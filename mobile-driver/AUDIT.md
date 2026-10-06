# Taxi Driver Role - Audit for native Expo port

Scope: web driver module `Frontend/src/modules/Taxi/modules/driver/**` plus the shared code it imports, the backend it calls (`Backend/src/modules/taxi/**`, `Backend/src/core/**`) and the Flutter wrapper (`flutter/Dima Hasao Tourism - Taxi Driver/`). All paths are relative to the repo root unless marked "(F)" = relative to the Flutter folder.
Conventions: "unsure" marks things I could not confirm from code. No secret values are printed.

Key global facts
- API base = `<origin>/api/v1/taxi` (`Frontend/src/modules/Taxi/shared/api/runtimeConfig.js`). Auth OTP base = `<origin>/api/v1/auth/otp` (`Frontend/src/services/auth/otpAuthClient.js`, separate axios client). Production origin used by the wrapper: `https://tourismdimahasao.in` (F: `lib/config/app_config.dart`).
- Response envelope: `{ success:true, data:{...} }`. Taxi axios interceptor returns `response.data` wrapped in a Proxy that falls through to `.data.*` (so web code reads `res.data.x` or `res.x` interchangeably). Errors are rejected as `{...serverBody, status}` (so `err.message`, `err.status`; NOT `err.response`). Network failure: `{ message:'Network error or server down.' }` (no status). Port must reproduce this normalisation. `shared/api/axiosInstance.js`.
- Socket.IO server: separate port (`SOCKET_PORT`, 5001) behind the same origin via proxy (`/socket.io`); resolved by `Frontend/src/shared/utils/socketOrigin.js` (`VITE_SOCKET_URL` first, else page origin).
- Only role in scope: `driver` (JWT role claim `driver`). All "owner / pooling / bus / service-center" branches in the code are dead after the single-role cleanup.

---------------------------------------------------------------------------------------------------

## 1. Screens / routes

Router: `Frontend/src/modules/Taxi/TaxiApp.jsx` lines ~677-737, `<Route path="driver" element={<DriverLayout />}>`, mounted at `/taxi/*`. Unknown `/taxi/driver/*` paths -> `TaxiUnknownRoute` -> redirect `/taxi/driver` -> `DriverEntryRedirect`.

### 1.1 Guard: `Frontend/src/modules/Taxi/modules/driver/components/DriverLayout.jsx`
Runs on every pathname/location.state change inside `/taxi/driver/*`:
1. "Onboarding routes" set: `/taxi/driver/{login,terms,privacy,support,reg-phone,otp-verify,step-personal,step-vehicle,step-documents,registration-status,status}`. These render without any check (except `login` and `reg-phone` when a token exists: they verify first and bounce to `/home` if approved).
2. Any other path: no token (`getLocalDriverToken()`) -> `navigate('/taxi/driver/login', replace)`.
3. Token present -> `GET /drivers/me` (cached in-memory for the session via `verifiedTokenRef`). Result decides:
   - Approved = `approve === true|1|'true'|'1'|'yes'|'approved'` OR `status in {approved, active, verified}` -> allowed.
   - Not approved -> allowed only on pending-allowed routes `/taxi/driver/{documents,support,help-support,support/chat,support/tickets}`; everything else `navigate('/taxi/driver/registration-status', replace)`.
   - Approved but `effectiveRole !== 'driver'` on a console route -> home (effectively unreachable now).
   - Request error: `status 401` or `404` -> `/login`; `403` -> `/registration-status`; any other error -> `/registration-status`.
4. While checking, a full-page spinner is shown (not on onboarding routes).
5. When allowed and stored role is `driver`, mounts `DriverRideRequestListener` (global incoming-request overlay) next to the `<Outlet/>`. The listener is disabled on `/home`, `/dashboard`, `/active-trip`, `/login`, `/reg-phone`, `/otp-verify`, `/step-*`, `/registration-status`, `/status` (home and active-trip have their own handling).
`getAuthenticatedDriverHome()` is always `/taxi/driver/home`.

### 1.2 Route table (all under `/taxi/driver`)

| Path | Component (file under `Frontend/src/modules/Taxi/modules/driver/`) | Guard | What it does |
|---|---|---|---|
| (index) | `DriverEntryRedirect` in `TaxiApp.jsx` | none | token ? `/home` : `/login` |
| `login`, `reg-phone` | `pages/registration/PhoneRegistration.jsx` | onboarding (soft: verifies if token) | Phone entry (10 digits, +91). `reg-phone` also resumes a half-finished onboarding session; accepts `?ref=|referral=|code=` |
| `otp-verify` | `pages/registration/OTPVerification.jsx` | onboarding | 4-digit OTP; login mode (existing account) vs onboarding mode; 60 s resend timer |
| `step-personal` | `pages/registration/StepPersonal.jsx` | onboarding | Full name, email, gender, optional referral code |
| `step-vehicle` | `pages/registration/StepVehicle.jsx` | onboarding | City (service location), service category, vehicle type, RC number, make/model/year/number/colour, admin-defined custom fields |
| `step-documents` | `pages/registration/StepDocuments.jsx` | onboarding | Upload documents from templates (base64, 8 MB cap) + identifier/expiry; submits application |
| `registration-status` | `pages/registration/RegistrationStatus.jsx` | onboarding | Polls approval every 2.5 s; shows document review status; auto-redirect `/home` when approved |
| `status` | `pages/registration/ApplicationStatus.jsx` | onboarding | Static "application status" page with "Support" button -> `/taxi/driver/support` |
| `home`, `dashboard` | `pages/DriverHome.jsx` (2.6k lines) | approved | Map + online/offline switch, today summary, wallet banner, scheduled rides, notifications badge, incoming-request modal, selfie capture, realtime recovery |
| `active-trip` | `pages/ActiveTrip.jsx` (2.9k lines) | approved | Trip state machine: to_pickup -> otp_verification -> in_trip -> payment_confirm -> review; map + route, call/chat/SOS buttons, payment QR |
| `chat` | `Frontend/src/modules/Taxi/modules/user/pages/ride/Chat.jsx` (shared) | approved | In-trip chat with rider via socket (`ride:message:*`); role auto = driver when path starts with `/taxi/driver`; state `{rideId, peer:{name,phone,subtitle,role}}` |
| `wallet` | `pages/DriverWallet.jsx` | approved | Wallet balance, transactions, top-up (Razorpay/PhonePe), withdrawal request |
| `profile` | `pages/DriverProfile.jsx` | approved | Account hub, route-booking toggle, logout dialog, links below |
| `history` | `pages/RideRequests.jsx` | approved | Ride history (limit 100), tabs All/Rides, status filter |
| `incentives` | `pages/DriverIncentives.jsx` | approved | Milestones/features + claim reward |
| `edit-profile` | `pages/settings/EditProfile.jsx` | approved | Name / email / profile image (phone read-only) |
| `documents` | `pages/settings/DriverDocuments.jsx` | pending-allowed | View/replace documents, set expiry date |
| `notifications` | `pages/settings/Notifications.jsx` | approved | Tabs: alerts (admin broadcasts) and scheduled rides |
| `profile/bank-details` | `pages/DriverBankDetailsPage.jsx` | approved | Bank/UPI details + QR image |
| `referral` | `pages/settings/Referral.jsx` | approved | Referral code, copy/share (Web Share, WhatsApp link) |
| `delete-account` | `pages/settings/DeleteAccount.jsx` | approved | OTP-confirmed soft delete |
| `security` | `pages/settings/SecuritySOS.jsx` | approved | Emergency contacts (max 5), SOS button, device contact picker |
| `support` | `pages/settings/Support.jsx` | pending-allowed | Support call / WhatsApp (phone from platform settings) |
| `help-support` | `pages/settings/HelpSupportOptions.jsx` | pending-allowed | Menu -> chat / tickets |
| `support/chat` | `pages/settings/SupportChat.jsx` -> `Frontend/src/modules/Taxi/modules/shared/components/UserSupportChatPanel.jsx` | pending-allowed | Live support chat with admin (REST + socket `chat:*`) |
| `support/tickets` | `Frontend/src/modules/Taxi/modules/user/pages/support/SupportTickets.jsx` (shared) | pending-allowed | List/create tickets (`requesterType='driver'` derived from path) |
| `support/ticket/:id` | `Frontend/src/modules/Taxi/modules/user/pages/support/SupportTicketDetail.jsx` (shared) | approved (NOT in pending-allowed list; see section 9) | Ticket thread + reply (`:id` is the `ticketCode`) |
| `vehicle-fleet`, `vehicle-fleet/edit/:vehicleId` | `pages/settings/VehicleFleet.jsx` | approved | Edit own vehicle (type/make/model/number/colour/image). Saving may flip driver to pending -> redirect `registration-status` with `state.statusReason='vehicle-update'` |

Bottom nav (`Frontend/src/modules/Taxi/modules/shared/components/DriverBottomNav.jsx`, driver variant): Home `/home`, History `/history`, Wallet `/wallet`, Milestone `/incentives`, Accounts `/profile`.

### 1.3 Screens reached outside the driver folder
| Screen | File | Notes |
|---|---|---|
| Ride chat | `Frontend/src/modules/Taxi/modules/user/pages/ride/Chat.jsx` | Routed at `/taxi/driver/chat` |
| Support tickets list / detail | `Frontend/src/modules/Taxi/modules/user/pages/support/SupportTickets.jsx`, `SupportTicketDetail.jsx` | Service: `Frontend/src/modules/Taxi/modules/shared/services/supportTicketService.js` |
| Support chat panel | `Frontend/src/modules/Taxi/modules/shared/components/UserSupportChatPanel.jsx` | `mode="participant" preferredRole="driver"` |
| Legal viewer `/legal/:slug?module=taxi` | `Frontend/src/app/routes.jsx:237` (`LegalDocumentPage`) | Linked only from `AuthLegalLinks` (`Frontend/src/shared/components/auth/AuthLegalLinks.jsx`) on login + OTP screens; backend `GET /api/v1/legal/*` (not verified in detail). Profile "Terms/Privacy/Refund/Driver Application" are static in-page modal text (`DriverProfile.jsx openLegal`), not routes |
| Payment return pages `/razorpay/status`, PhonePe status | `Frontend/src/modules/Taxi/modules/shared/pages/{RazorpayStatusPage,PhonePeStatusPage,RazorpayLaunchPage}.jsx` | NOT registered in any router (see section 9) |
| Brand/support data | `Frontend/src/shared/hooks/usePlatformSettings.js` -> `GET <origin>/api/v1/platform/settings` (NOT under /taxi); `Frontend/src/modules/Taxi/modules/shared/content/supportInfo.js` |

---------------------------------------------------------------------------------------------------

## 2. API calls made by the driver app

Auth header on all non-public calls: `Authorization: Bearer <driver JWT>`. Paths are relative to `/api/v1/taxi` unless marked `[root]` (= `/api/v1`).
`unwrap(x)` = `x.data.data || x.data || x`.

### 2.1 Auth / session
| Method + path | Payload | Response fields read | Called from |
|---|---|---|---|
| POST `/drivers/onboarding/send-otp` (the real login entry point) | `{phone}` (10 digits) | `data.loginMode`/`data.existingAccount` (true if phone already a driver), `data.session{role,registrationId,debugOtp,status,loginMode,existingAccount,availableRoles}` | `PhoneRegistration.jsx`, `OTPVerification.jsx` resend (onboarding mode) via `registrationService.sendDriverOtp` |
| POST `[root]/auth/otp/request` | `{audience:'taxi-driver', phone}` | `{phone, audience, isRegistered, nextStepIfVerified, otp?}` (otp only in dev/staging) | resend in login mode (`OTPVerification.jsx`), `DeleteAccount.jsx` |
| POST `[root]/auth/otp/verify` | `{audience:'taxi-driver', phone, otp}` | existing driver: `{verified, audience, phone, isRegistered:true, nextStep:'authenticated', token, accessToken, role:'driver', availableRoles:['driver'], user:{id,name,phone,role}}`; unknown phone: `{verified, isRegistered:false, nextStep:'onboarding', signupToken, pending}` | `OTPVerification.jsx` (login), `DeleteAccount.jsx` (re-auth only; result discarded) |
| POST `[root]/auth/otp/complete` | `{audience, signupToken, ...}` | - | defined in `otpAuthClient.js`; NOT used by driver screens (driver audience has no `createAccount`; backend returns 400 "created through onboarding") |
| POST `/drivers/onboarding/verify-otp` | `{registrationId, phone, otp}` | `data.session.status` | `OTPVerification.jsx` (onboarding mode) |
| GET `/drivers/onboarding/session/:registrationId?phone=` | - | `data.session{...}`, `personal{fullName,email,gender}`, `referralCode`, `vehicle{...}`, `documents`, `roleDetails` | `PhoneRegistration.jsx` resume |
| PATCH `/drivers/onboarding/personal` | `{registrationId, phone, fullName, email, gender}` | - | `StepPersonal.jsx` |
| PATCH `/drivers/onboarding/referral` | `{registrationId, phone, referralCode}` | error message shown if invalid | `StepPersonal.jsx` |
| GET `/drivers/service-locations` | - | `data` or `data.results[]` of `{_id|id, service_location_name|name}` | `StepVehicle.jsx` |
| GET `/admin/types/vehicle-types` (driver token; always fails -> fallback) then GET `/users/vehicle-types` | - | list `data` or `data.results[]` | `registrationService.getDriverVehicleTypes` (StepVehicle, VehicleFleet). Port should call `/users/vehicle-types` directly |
| GET `/drivers/vehicle-field-templates?role=driver` | - | `results[]` of `{field_key, label, is_required, ...}` | `StepVehicle.jsx` |
| PATCH `/drivers/onboarding/vehicle` | `{registrationId, phone, registerFor, serviceCategories[], locationId, locationName, vehicleTypeId, rcNumber, make, model, year, number, color, customFields{}}` | - | `StepVehicle.jsx` |
| GET `/drivers/document-templates?role=driver` | - | `results[]` of templates `{id|_id, name, active, fields[{key,label,required}], has_expiry_date, has_identify_number, image_type, verification_type, is_required}` | `StepDocuments`, `DriverDocuments`, `RegistrationStatus`, `DriverHome` |
| PATCH `/drivers/onboarding/documents` | `{registrationId, phone, documents:{[key]:{dataUrl, fileName, mimeType, identifyNumber, expiryDate}}}` | `data.documents[key]` or `data.session.documents[key]` (server returns secureUrl/status) | `StepDocuments.jsx` |
| POST `/drivers/onboarding/complete` | `{registrationId, phone, documents}` | `data.token` (JWT, role driver, status pending), `data.driver`, `data.documents` | `StepDocuments.jsx` |
| GET `/drivers/approval-status?t=<ts>` | - | `data{id,name,phone,approve,status,documents,onboarding,isOnline,isOnRide}` | `RegistrationStatus.jsx` (poll 2.5 s). Route is unauthenticated by middleware but parses the Bearer itself (401 no token, 403 non-driver role, 404 deleted) |
| GET `/drivers/me` | - | see 2.2 | many |
| POST `/drivers/fcm-token` | `{token, platform}` (`platform` in web/browser/pwa -> web; android/ios/mobile -> mobile; token >=20 chars) | `data.platform, field, role` | `registrationService.saveDriverFcmToken` called from `shared/push/nativeFcmBridge.js` and `browserFcmRegistration.js`; `allowPending` on server |
| (Flutter only) POST `[root]/fcm-tokens/mobile/save` | `{token}` (platform field FORBIDDEN, 400 if present) | - | F: `lib/services/api_service.dart`. Maps role `driver` -> same `Driver.fcmTokenMobile` field (`Backend/src/core/notifications/fcm.routes.js`, `firebase.service.js`) |

### 2.2 `GET /drivers/me` response (fields actually read)
`id,name,phone,email,salary,profileImage,gender,vehicleType,vehicleTypeId,vehicleIconType,vehicleIconUrl,vehicleMake,vehicleModel,registerFor,vehicleNumber,vehicleColor,vehicleImage,city,approve,status,rating,wallet{balance,cashLimit,minimumBalanceForOrders,availableForOrders,minimumTopUpAmount,minimumTransferAmount,isBlocked,isWalletEnabled,isTransferEnabled},bankDetails{accountHolderName,upiId,qrCodeImage,accountNumber,ifsc,branchName,updatedAt},referralCode,deletionRequest{status},isOnline,isOnRide,onlineSelfie{imageUrl,capturedAt,forDate},location{coordinates},zone{id,name},routeBooking{enabled,coordinates,label,updatedAt},documents{[key]:{...,approvalStatus|reviewStatus|status,comment|remarks|reason,expiryDate,previewUrl|secureUrl|url}},emergencyContacts,onboarding{role},todaySummary{activeSeconds,...},owner_id?,vehicleApprovalRequested?`. (Backend: `Backend/src/modules/taxi/driver/controllers/driverController.js` `getCurrentDriver` ~969.) Also de-duplicated client-side for 2.5 s. Note: server also clears stale active ride and syncs today summary on this call.

### 2.3 Home (`pages/DriverHome.jsx`)
| Call | Payload | Response read |
|---|---|---|
| GET `/drivers/me` (hydrate + `refreshTodaySummary` every 30 s online / 120 s offline, on visibility) | - | 2.2 |
| GET `/drivers/document-templates?role=driver` | - | expiry / rejected doc checks gate going online |
| GET `/rides/active/me?t=<ts>&type=ride` (called twice with identical params on mount/recovery; server ignores `type`) | - | `data` ride or `null`: `rideId,otp,type/serviceType,status,liveStatus,fare,paymentMethod,pickupAddress,pickupLocation,dropAddress,dropLocation,estimatedDistanceMeters,lastDriverLocation.coordinates,user{name,phone},pricingSnapshot{...},arrivedAt,startedAt,commissionAmount,driverEarnings,driverPaymentCollection,messages[]` (`Backend/src/modules/taxi/services/rideService.js serializeRideRealtime`) |
| PATCH `/drivers/online` | `{location:[lng,lat], selfieImageUrl?}` | `data{isOnline,location.coordinates,zoneId,vehicleTypeId,vehicleIconUrl,onlineSelfie}`; 400 "A selfie is required before going online today" triggers selfie prompt |
| PATCH `/drivers/offline` | none | `data{isOnline}` |
| POST `/common/upload/image` (no auth needed) | `{image:<data URL base64>, folder:'driver-online-selfies'}` | `data{url|secureUrl,publicId,format}` (`shared/services/uploadService.js`) |
| GET `/drivers/notifications` | `{page,limit}` (ignored by server) | `data.results[]` (count for badge, uses local read-state) |
| GET `/drivers/scheduled-rides` | `{limit:20}` | `data.results[]` with `scheduledAt,rideId,...` |
| POST `/drivers/scheduled-rides/:rideId/cancel` | `{}` | success/error message |

### 2.4 Active trip (`pages/ActiveTrip.jsx`)
| Call | Payload | Notes |
|---|---|---|
| GET `/rides/active/me` | - | hydrate (retry with delay), re-read before OTP check |
| PATCH `/rides/:rideId/status` | `{status:'started'}` or `{status:'completed', paymentMethod:'cash'|'online', driverPaymentCollection?}` | Allowed statuses server-side: accepted, arriving, started, arrived, completed. Errors swallowed; socket publish also sent |
| POST `/drivers/payments/qr` | `{rideId, amount}` | `data{id,imageUrl,providerMode('razorpay_qr' => UPI scannable),status,...}` |
| GET `/drivers/payments/qr/status?rideId=` | - | poll every 3 s: `paid`, `status`, `paidAt` |
| (REST fallback) none for location | location goes over socket only | see section 4 |

### 2.5 Wallet (`pages/DriverWallet.jsx`)
| Call | Payload | Response read |
|---|---|---|
| GET `/drivers/wallet` | - | `data{wallet,transactions[],withdrawalRequests[],settings{driver_wallet_minimum_amount_to_get_an_order,minimum_amount_added_to_wallet,minimum_wallet_amount_for_transfer,show_wallet_feature_for_driver,enable_wallet_transfer_driver}}` |
| GET `/drivers/me` | - | `salary`, owner-managed flag |
| GET `/users/bootstrap` (via `SettingsContext`) | - | `data.settings.paymentGateway{label,supportsWalletTopUp,walletTopUpMode:'razorpay_checkout'|'phonepe_redirect'}`, `settings.general.app_name`, modules |
| POST `/drivers/wallet/top-up/razorpay/order` | `{amount}` | `{orderId,keyId,amount,currency,callbackUrl?,checkoutUrl?}` |
| POST `/drivers/wallet/top-up/razorpay/verify` | `{razorpay_order_id,razorpay_payment_id,razorpay_signature}` | `{wallet,transaction}` |
| GET/POST `/drivers/wallet/top-up/razorpay/callback` | server-side only (redirect flow); then 302 to `<frontend>/razorpay/status?flow=driver-wallet&status=...` | |
| POST `/drivers/wallet/top-up/phonepe/order` | `{amount}` | `{checkoutUrl,merchantTransactionId}` -> external browser |
| GET `/drivers/wallet/top-up/phonepe/status/:merchantTransactionId` | - | used by `PhonePeStatusPage` (unrouted) |
| POST `/drivers/wallet/withdrawals` | `{amount, payment_method:'bank_transfer'}` | `{request{_id,...}}` |
| POST `/drivers/wallet/top-up` | - | defined in backend, not called by web |

### 2.6 Profile / settings
| Call | Payload | Used by |
|---|---|---|
| PATCH `/drivers/me` | `{name,phone,email,profileImage}` (EditProfile; phone is sent but backend ignores it) / `{routeBooking:{enabled,coordinates:[lng,lat],label}}` (Profile toggle) / `{bankDetails:{accountHolderName,upiId,qrCodeImage,accountNumber,ifsc,branchName}}` (Bank page) | `EditProfile`, `DriverProfile`, `DriverBankDetailsPage` |
| POST `/common/upload/image` | `{image:base64, folder:'driver-bank-qr'|<others>}` | bank QR, profile image (`useImageUpload`, folder per page), vehicle image |
| PATCH `/drivers/vehicle` | `{vehicleTypeId,vehicleMake,vehicleModel,vehicleNumber,vehicleColor,vehicleImage}` | `VehicleFleet`; response `data.vehicleApprovalRequested?`, `status`, `approve`, `message` |
| PATCH `/drivers/documents/:documentKey` | `{document:{...existing, key, previewUrl|secureUrl, expiryDate, expiry_date, expiresAt, uploaded:true, uploadedAt}}` | `DriverDocuments`; response read `data.documents` |
| GET `/drivers/emergency-contacts` | - | `data.contacts[]` (limit 5) |
| POST `/drivers/emergency-contacts` | `{name, phone, source:'manual'|'device'}` (name alphabets only, 10-digit phone) | `SecuritySOS` |
| DELETE `/drivers/emergency-contacts/:contactId` | - | `SecuritySOS` |
| POST `/drivers/sos` | `{rideId,deliveryId,serviceType,tripCode,pickupAddress,dropAddress,vehicleLabel,locationLabel,location:{coordinates:[lng,lat]}}` (built from `localStorage.driverActiveTripSnapshot`, falls back to geolocation) | `SecuritySOS` via `shared/services/safetyAlertService.js triggerDriverSosAlert`; then `tel:112` after ~delay |
| GET `/drivers/incentives` | - | `data{summary,milestones[{id,isClaimed,...}],features[{key,...}],claimedRewards[{amount}],referralRewardAmount}` |
| POST `/drivers/incentives/claim` | `{rewardType, rewardKey}` | `data.claimedReward.amount` |
| GET `/rides?limit=100` | - | `data.results[]`: `rideId|_id,serviceType,status,liveStatus,fare,commissionAmount,driverEarnings,paymentMethod,driverPaymentCollection{status,providerMode},user.name,pickupAddress/Location,dropAddress/Location,estimatedDistanceMeters,completedAt|startedAt|acceptedAt|createdAt` (also supports `page`, `category`) |
| GET `/common/referrals/settings?type=driver` | - | referral banner texts (`driver_referral.*`) |
| POST `/drivers/me/delete-request`, DELETE `/drivers/me` | `{reason}` (DELETE has body) | DeleteAccount uses DELETE `/drivers/me` after OTP re-verify (soft delete: status inactive, sessions removed) |

### 2.7 Support / chat
| Call | Payload | Response read |
|---|---|---|
| GET `/support/titles?userType=driver` | - | ticket titles |
| POST `/support/tickets` | create payload (title id, message...; see `SupportTickets.jsx` ~line 75) | `ticketCode` |
| GET `/support/tickets/my?page=1&limit=100` | - | list with `ticketCode` |
| GET `/support/tickets/:ticketCode` | - | detail with replies |
| POST `/support/tickets/:ticketCode/reply` | `{message}` | - |
| GET `/chats/conversations` | - | conversations (key format `driver:<adminId>:<driverId>`) |
| GET `/chats/messages/:conversationKey` | - | messages |
| POST `/chats/messages` | `{message, conversationKey}` (REST fallback when socket disconnected) | `data.message` |
| PATCH `/chats/messages/:conversationKey/read` | - | |
| DELETE `/chats/messages/:conversationKey` | - | |
Chat-token selection: `localStorage.chatRole` ('driver') + `shared/chat/chatIdentity.js`; interceptor routes `/chats` calls using `chatRole`.

### 2.8 Public / misc
`GET /users/bootstrap` (app settings, payment gateway), `GET [root]/platform/settings` (brand name, support phone/email via `usePlatformSettings`), `GET [root]/legal/...` (legal viewer). Firebase RTDB (`taxiRides/<id>.json` via `rideRealtime.js`) is NOT used by driver screens (only user `RideTracking.jsx`); backend mirrors ride state to Firebase itself.

---------------------------------------------------------------------------------------------------

## 3. Auth

Login (actual behaviour, web):
1. `PhoneRegistration` -> `POST /drivers/onboarding/send-otp {phone}`. Backend (`onboardingService.startDriverOnboarding`) looks up `Driver` by phone: exists -> creates login OTP (`createOrUpdateOtp(phone,'taxi-driver')`) and returns `{loginMode:true, existingAccount:true, detectedRole, session:{phone,status:'otp_sent',debugOtp,role:'driver',loginMode,existingAccount,availableRoles}}`; new phone -> creates `DriverRegistrationSession` and returns `{message, session:{registrationId,phone,role,status:'otp_sent',otpVerified:false,debugOtp}}` (HTTP 201). `debugOtp` is returned whenever `NODE_ENV!=='production'`.
2. `OTPVerification` (4 digits, autosubmit):
   - Login mode: `POST /api/v1/auth/otp/verify {audience:'taxi-driver', phone, otp}`. Success body has `token` (= `accessToken`), `role:'driver'`, `availableRoles`, `user`. Web calls `persistDriverAuthSession({token, role:'driver'})`, flushes FCM token, clears registration session, then navigates `isDriverApproved(payload.driver) ? /home : /registration-status`. `payload.driver` does not exist in this response -> always goes to `/registration-status`, which polls `/drivers/approval-status` and redirects to `/home` when approved (extra hop; port may call `/drivers/me` instead).
   - Onboarding mode: `POST /drivers/onboarding/verify-otp {registrationId, phone, otp}` -> `/step-personal`.
   - Shared audience data: `Backend/src/modules/taxi/auth/audiences.js` (`taxi-driver`, `onNewAccount: 'onboarding'`, blocks `isBlocked`/`isActive===false` with "Your account is not active"). `nextStep` values (`Frontend/src/services/auth/otpAuthClient.js NEXT_STEP`): `authenticated`, `collect_name`, `onboarding` (the driver client never reads `nextStep`; it relies on `loginMode` from step 1).
3. New driver: personal -> vehicle -> documents -> `POST /drivers/onboarding/complete` returns `token` immediately (driver is created `approve:false, status:'pending'`); web stores it and goes to `/registration-status`.
4. Rate limits: `/auth/otp/*` uses `authRateLimiter`; OTP generation rate-limited in `core/otp/otp.service.js`. OTP length: 4 (enforced by onboarding/login services; the generic verify does not check length).

Stored data (web):
| Key | Where | Content |
|---|---|---|
| `token`, `driverToken` | localStorage AND sessionStorage | JWT |
| `role`, `driverRole` | both | `'driver'` |
| `chatRole` | both | `'driver'` |
| `driverInfo` | localStorage | JSON cache `{owner_id,vehicleIconType,vehicleType,vehicleIconUrl,location{coordinates},coordinates,phone,name}` |
| `driverRegistrationSession` | localStorage | onboarding draft: phone, registrationId, otpVerified, personal/vehicle fields, `documents` (data-URLs stripped), `loginMode`, `entryPath`, `referralCode` |
| `driver_route_booking_preferences` | localStorage | route-booking cache |
| `driver_vehicle_reapproval_pending`, `driver_vehicle_fleet_draft`, `driver_vehicle_fleet_editing` | local/sessionStorage | vehicle-update flow |
| `driverActiveTripSnapshot`, `driverActiveTripPhase:<rideId>`, `driverActiveTripUiState:<rideId>` | localStorage | trip restore |
| `driverNotificationHiddenIds`, `driverNotificationReadIds`, `driverLocalNotifications` | localStorage | notification read/hidden state (client-only) |
| `pendingNativeFcmRegistration`, `lastNativeFcmRegistration`, `lastNativeFcmDebugState`, `lastBrowserFcmRegistration` | localStorage | push token bookkeeping |
Reading order for the token (`axiosInstance.getStoredTokenByRole`): sessionStorage `driverToken`, sessionStorage `token`, localStorage `driverToken`, localStorage `token`; a token is accepted only if its JWT `role` claim is a driver-portal role and not expired (client decodes `exp`).

Token facts: JWT claims `{sub:<driverId>, role:'driver', exp}`; signed with `JWT_ACCESS_SECRET`; lifetime = env `JWT_ACCESS_EXPIRES` (default `15m` if unset; local `Backend/.env` sets a very long value `7y`; production value unknown). NO refresh token is issued for driver login (`audiences.js issueSession` returns only token/accessToken); no refresh call exists in the driver web code. So the effective session expiry = JWT `exp`.

Logout: purely client-side. `DriverProfile.jsx handleLogout` -> `clearDriverAuthState()` (removes `token, driverToken, driverInfo, role, driverRole, chatRole` from both storages + `driverRegistrationSession`) -> `navigate('/taxi/driver/login')`. No API call, does NOT call `PATCH /drivers/offline` and does NOT disconnect the socket; a driver who logs out while online stays `isOnline:true` server-side until the socket disconnects (disconnect handler only nulls `socketId`, it does not set offline). Port should call `PATCH /drivers/offline` first.

401/403 handling:
- Interceptor (`shared/api/axiosInstance.js`): on 401, or message `jwt expired` / `Invalid authorization token`, or 403 with `Authenticated account no longer exists`, and a Bearer token was sent: it clears generic + driver tokens from storage and dispatches `window` event `app:auth-stale {role, message, token}`. There is no listener that handles `driver`/`owner` roles (only `user` and `admin` in `TaxiApp.jsx UserAccountInvalidationListener`, which is explicitly disabled for `/taxi/driver`). Net effect for drivers: tokens vanish and the next `DriverLayout` check (route change) redirects to login; mid-screen the UI just shows errors.
- Server messages: 401 `Authorization token is required`, `Invalid authorization token`, `jwt expired`, `Authenticated account no longer exists`, `User account is not active` (deleted/inactive driver); 403 `Driver account is pending approval` (middleware `Backend/src/modules/taxi/middlewares/authMiddleware.js`, bypassed with `allowPending` for `/me`, `/fcm-token`, `/documents/:key`, `/chats/*`), 403 `Insufficient permissions for this resource`.
- Approval gating: only `/drivers/me`, `/drivers/fcm-token`, `/drivers/documents/:key`, `/chats/*`, `/drivers/approval-status`, and onboarding routes work while `approve===false` or `status==='pending'`. Everything else (wallet, online, notifications, ride endpoints...) returns 403 -> `DriverLayout` already redirects before they are called. Support endpoints `/support/*` use `authenticate(['user','driver','owner'])` WITHOUT `allowPending` -> 403 for pending drivers even though the UI allows `support/tickets` (see section 9).

---------------------------------------------------------------------------------------------------

## 4. Socket.IO, polling, geolocation, online/offline

Client: `Frontend/src/modules/Taxi/shared/api/socket.js` (`socketService` singleton). `io(origin, {auth:{token}, transports:['websocket','polling'], upgrade:true, withCredentials:true, reconnection:true, reconnectionDelay:750, reconnectionDelayMax:2500, timeout:10000})`. Token = driver JWT (also accepted via `Authorization` header / `query.token` by the delivery handler). Server: `Backend/src/config/socket.js` (auth middleware sets `socket.auth={sub, role}` from `verifyAccessToken` using `JWT_ACCESS_SECRET`) then `Backend/src/modules/taxi/socket/index.js registerTaxiSocketIntegration`. Driver is auto-joined to its driver room; server stores `Driver.socketId`.

### 4.1 Events the driver app EMITS
| Event | Payload | File |
|---|---|---|
| `locationUpdate` | `{coordinates:[lng,lat]}` | `DriverHome.jsx` (online only). Throttle: >= 25 m moved OR >= 12 s since last emit; forced on go-online/reconnect; poll via `getCurrentPosition` every 10 s while online (`setInterval` 10000, `enableHighAccuracy:true, timeout:6000, maximumAge:10000`). Server writes to DB if moved >=25 m or >=15 s |
| `acceptRide` | `{rideId}` | `DriverHome.jsx`, `DriverRideRequestListener.jsx` |
| `rejectRide` | `{rideId}` | same (also auto on request timer expiry in `IncomingRideRequest`) |
| `submitRideBid` | `{rideId, bidFare}` | same - NOT implemented in backend (dead) |
| `ride:join` | `{rideId}` | `ActiveTrip.jsx` (on mount, on socket `connect`) |
| `ride:status:update` | `{rideId, status:'accepted'|'arriving'|'started'|'arrived'|'completed', paymentMethod?, driverPaymentCollection?}` | `ActiveTrip.jsx` (see mapping below) |
| `ride:driver-location:update` | `{rideId, coordinates:[lng,lat], heading, speed, simulated}` | `ActiveTrip.jsx`; throttle >= 12 m or >= 3 s; GPS via `watchPosition({enableHighAccuracy:true, maximumAge:5000, timeout:15000})` plus one `getCurrentPosition` |
| `ride:message:send` | `{rideId, message}` | `Chat.jsx` |
| `joinRide` | `{rideId}` | `Chat.jsx` (legacy duplicate of `ride:join`) |
| `chat:join`, `chat:read`, `chat:send` | `{conversationKey}` / `{conversationKey}` / `{message, conversationKey}` | `UserSupportChatPanel.jsx` |
Status mapping used by the web (quirk, replicate): tapping "Arrived at pickup" emits `arriving` (phase otp_verification); "Go back" emits `accepted`; OTP ok -> `started` (+ REST PATCH); reaching destination emits `arrived` (phase payment_confirm); finishing emits `completed` (+ REST PATCH first). Server `driverLifecycleStatuses` accepts those five.

### 4.2 Events the driver app LISTENS to
| Event | Payload keys read | File |
|---|---|---|
| `rideRequest` | `rideId,type|serviceType,user{id,name,phone},pickupLocation{coordinates},pickupAddress,dropLocation,dropAddress,scheduledAt,estimatedDistanceMeters,estimatedDurationMinutes,vehicleTypeId,vehicleIconType,vehicleIconUrl,fare,baseFare,paymentMethod,intercity,radius,attempt,maxAttempts,acceptRejectDurationSeconds,expiresInSeconds,requestExpiresAt,zoneId,bookingMode,bidding` | `DriverHome.jsx`, `DriverRideRequestListener.jsx` |
| `rideRequestClosed` | `{rideId, reason('user-cancelled'|'deleted-by-admin'|'unmatched'|'accepted-by-another-driver'...), message}` | Home, Listener, ActiveTrip |
| `rideAccepted` | `{rideId,room,status,liveStatus,acceptedAt,otp?,scheduledAt?}` | Home, Listener (then fetch `/rides/active/me` and navigate to active-trip) |
| `rideCancelled` | `{rideId, message}` | ActiveTrip |
| `ride:status:updated` | `{rideId,status,liveStatus,acceptedAt,arrivedAt,startedAt,completedAt}` | ActiveTrip (cancel detection) |
| `ride:state` | full `serializeRideRealtime` or `null` (null = no active ride) | ActiveTrip, Chat |
| `ride:joined` | `{rideId,room}` | Chat |
| `ride:message:new` | `{id,rideId,senderRole,senderId,message,sentAt}` | Chat |
| `driver:wallet:updated` | `{wallet, transaction?, notification?{id,title,body,sentAt}}` | Home (banner, blocks requests if blocked), Wallet |
| `errorMessage` | `{message}` | all (message containing "no longer available" clears the request) |
| `rideBidSubmitted`, `rideBiddingUpdated` | `{rideId,...}` | Home, Listener - NOT emitted by backend (dead) |
| `chat:message`, `chat:conversation-updated`, `chat:conversation-deleted` | support chat | `UserSupportChatPanel.jsx` |
| socket lifecycle `connect`, `disconnect`, `connect_error`, manager `reconnect_attempt` | - | Home (status pill + recovery) |
Server emits not consumed by the driver app: `ride:driver-route:updated`, `ride:driver-location:updated`, `driverRejectedRide`, `ride:rejoin-current` (client may emit; unused).

### 4.3 Polling / timers (driver screens)
| Interval | Where | Purpose |
|---|---|---|
| 10 s | DriverHome (online) | GPS poll + throttled `locationUpdate` |
| 8 s | DriverHome (online, visible) | socket health check -> recovery burst (0/1.5/5/10 s retries: reconnect, emit location, re-fetch active ride) |
| 30 s / 120 s | DriverHome | refresh `/drivers/me` today summary (online / offline) + notifications + scheduled rides (30 s) |
| 1 s | DriverHome | countdown for scheduled rides; ActiveTrip waiting timer |
| 700/1500/3000/5000 ms | DriverHome after accept | `scheduleAcceptRecovery` re-fetches active ride until it opens |
| 2.5 s | RegistrationStatus | approval poll |
| 3 s | ActiveTrip | payment QR status poll |
| 2 s | `rideRequestAlertSound.js` | pulses native bridge `driverOrderAlert` while request open |
| 250 ms | `IncomingRideRequest.jsx` | request countdown |
Resume hooks: `focus`, `pageshow`, `visibilitychange`, `online` -> `scheduleRecoveryBurst`; global `window.__driverReconnectRealtime()` is defined while online (called by Flutter wrapper on resume? - not found in Flutter code, unsure).

### 4.4 Online/offline toggle
- Tap (debounced 600 ms). Pre-checks client-side: vehicle re-approval pending, wallet blocked (`balance < minimumBalanceForOrders` or cash limit exceeded, ignored for owner-managed drivers), expired documents, rejected documents. If `onlineSelfie.forDate` is not today a selfie flow is shown (getUserMedia front camera 1280x720, or `<input type="file" capture="user">` fallback; compress; upload to `/common/upload/image` folder `driver-online-selfies`; then `selfieImageUrl` sent with online).
- Online: get coords (last known or fresh GPS) -> `socketService.connect({role:'driver'})` -> `PATCH /drivers/online {location,selfieImageUrl?}` -> `emit locationUpdate`. Offline: `PATCH /drivers/offline` -> `socketService.disconnect()`.
- On mount, `isOnline` from `/drivers/me` is restored and the socket re-connects automatically.
- Route booking ("My Route Booking"): `PATCH /drivers/me {routeBooking}`, anchor coordinates reused as location when going online.
- Backend dispatch push for each ride request: FCM data `{type:'ride_request', rideId, serviceType, userId}` with title "New ride request", body "Pickup: <address>" (`dispatchService.js:~725`).
- Google Maps/Firebase RTDB: see section 5; RTDB not used by driver client.

---------------------------------------------------------------------------------------------------

## 5. Web-only APIs / libraries used by driver screens

| API / lib | Where | Native equivalent |
|---|---|---|
| `@react-google-maps/api` (`GoogleMap`, `MarkerF`, `OverlayView`, `PolylineF`), loader in `Frontend/src/modules/Taxi/modules/admin/utils/googleMaps.js` (id `appzeto-google-maps`, libs `drawing, places, routes`, v3.64, key `VITE_GOOGLE_MAPS_API_KEY`) | `DriverHome.jsx` (map, custom vehicle markers, `google.maps.Size/Point`), `ActiveTrip.jsx` (route polyline, `Geocoder`, `LatLngBounds`, `SymbolPath.CIRCLE`) | `react-native-maps` (PROVIDER_GOOGLE) + custom markers + `Polyline` |
| `google.maps.importLibrary('routes').Route.computeRoutes` + DirectionsService fallback | `Frontend/src/modules/Taxi/shared/utils/googleRoutes.js computeDrivingRoute` | Google Routes/Directions REST (server-side key) or `react-native-maps-directions` |
| `simplify-js` | `ActiveTrip.jsx` (route path simplification, tolerance 0.00008; off-path 45 m; refresh debounce 2.5 s; arrival radius 100 m) | keep (pure JS) |
| `navigator.geolocation.getCurrentPosition/watchPosition/clearWatch` | `DriverHome`, `ActiveTrip`, `DriverProfile` (route booking), `safetyAlertService` | `expo-location` (foreground + background task for online/active trip) |
| `navigator.mediaDevices.getUserMedia`, `<video>`, `canvas.toDataURL('image/jpeg',0.9)`, `<input type="file" capture="user">` | `DriverHome.jsx` selfie | `expo-camera` / `expo-image-picker` |
| `<input type="file">`, `FileReader.readAsDataURL`, canvas compression | `StepDocuments` (8 MB cap), `DriverDocuments`/`EditProfile`/`VehicleFleet`/`DriverBankDetailsPage` (via `useImageUpload`: validates `data:image/`), selfie | `expo-image-picker` + `expo-image-manipulator` (base64 data URL) |
| `new Audio(...)` looping `ride-request-alert.mp3`, `AudioContext` oscillator fallback, pointer-unlock | `utils/rideRequestAlertSound.js` (`volume 0.85`, loop) | `expo-av`/`expo-audio` + notification sound |
| `navigator.vibrate([400,180,400])` repeated | same | `Vibration` API (RN) |
| Native alert bridges: `window.__nativeDriverOrderAlert`, `flutter_inappwebview.callHandler('driverOrderAlert')`, `ReactNativeWebView.postMessage`, `Android.driverOrderAlert`, `webkit.messageHandlers.driverOrderAlert` with `{type:'driver_incoming_order_alert', action:'start'|'stop', timestamp}` every 2 s | same | Replace with native ringtone/foreground service |
| `window.open('tel:...','_self')`, `tel:112` | `ActiveTrip` (call rider, emergency), `SecuritySOS`, `Support` | `Linking.openURL('tel:')` |
| `window.open('https://wa.me/...')` | `Support`, `Referral` | `Linking` |
| `navigator.share`, `navigator.clipboard.writeText` | `Referral.jsx` | `Share.share`, `expo-clipboard` |
| `navigator.contacts.select(['name','tel'])` (Contact Picker API) | `SecuritySOS.jsx` | `expo-contacts` |
| Razorpay Checkout.js (`https://checkout.razorpay.com/v1/checkout.js`), redirect mode in WebView (`callback_url`, `redirect:true`), key from order response `keyId` | `DriverWallet.jsx` | `react-native-razorpay` SDK (needs order from `/drivers/wallet/top-up/razorpay/order`, verify via `/verify`) |
| PhonePe redirect checkout via external browser + bridge (`openExternalCheckout`, `window.openExternalUrl/ExternalNavigation/AppBridge/Android/FlutterBridge/Appzeto24Native` channels, intent URL) | `shared/utils/externalNavigation.js`, `phonePeResume.js` (localStorage `phonepe-pending:driver-wallet-topup`, TTL 2 h) | `Linking.openURL(checkoutUrl)` / `expo-web-browser`, then poll `/drivers/wallet/top-up/phonepe/status/:id` on app resume |
| `window.history.pushState` + `popstate` trap on Home | `DriverHome.jsx` (swallow back) | navigation back handler |
| `localStorage/sessionStorage` | everywhere (section 3) | `expo-secure-store` (token) + `AsyncStorage` |
| Service worker FCM (`/firebase-messaging-sw.js`), `Notification.requestPermission`, `firebase/messaging getToken` with VAPID | `shared/push/browserFcmRegistration.js` | `expo-notifications` + native FCM token (`getDevicePushTokenAsync`) |
| `framer-motion`, `lucide-react`, `react-hot-toast`, `react-router-dom` | UI | `react-native-reanimated`, `lucide-react-native`, a toast lib, `expo-router` |
| Page-visibility/`focus` lifecycle | recovery bursts | `AppState` |
No `html2canvas`, charts (recharts), QR-code generation lib, print, or wake-lock in driver screens (payment QR is an image URL from the server).

---------------------------------------------------------------------------------------------------

## 6. Design tokens

Load order: `TaxiApp.jsx` imports `Frontend/src/modules/Taxi/App.css` + `Frontend/src/modules/Taxi/index.css` (Tailwind v4 via `@tailwindcss/vite`, `@import "tailwindcss"`, no `tailwind.config.js`; tokens live in `@theme`). `DriverLayout` wraps everything in `.driver-theme`. Mobile shell: `max-w-lg` (512 px) centred, page bg `#EFF5FD` on outer `#0B172A` (`TaxiApp.jsx MainLayout`).

### 6.1 Fonts
- Google Fonts import (`Frontend/src/modules/Taxi/index.css` line 1): Plus Jakarta Sans 300-800, Inter 300-900, Outfit 300-900.
- Driver module body font: **Outfit** (`.driver-theme { font-family:'Outfit' }`, body in `index.css`). Onboarding screens (`.dh-onboarding`, `pages/registration/onboarding.css`) use **Plus Jakarta Sans** (weights up to 800).
- Heading weights are heavy: `font-black` (900) and `font-semibold`/`font-bold`; small labels are 8-11 px uppercase with wide tracking (`tracking-widest`, `0.08-0.22em`).

### 6.2 Colours
| Group | Token / value | Source |
|---|---|---|
| Taxi theme `@theme` | `--color-primary #E85D04`, `--color-secondary #F48C06`, `--radius-xl 1rem`, `--radius-2xl 1.5rem`, `--radius-3xl 2rem`, `--shadow-premium 0 10px 40px -10px rgba(0,0,0,.1)`, `--shadow-soft 0 4px 20px -2px rgba(0,0,0,.05)` | `Taxi/index.css` |
| `.driver-theme` override | `--color-primary #1C2833` (dark navy), `--color-secondary #334155`, `--driver-accent #FFD700`, `--driver-bg-soft #F8F9FA`, card `#FFFFFF`, text `#0F172A` | `Taxi/index.css` lines 71-85 |
| `driver.css` (NOT imported anywhere; dead) | black `#000`, gold `#FFD700`, success `#10B981`, error `#EF4444`, warning `#F59E0B`, border `#F1F5F9`, subtext `#64748B` | `driver/styles/driver.css` |
| Onboarding (Dima Hasao brand) `.dh-onboarding` | `--dh-primary #0a4d2b` (district green), `--dh-primary-strong #06381e`, `--dh-primary-soft #e8f2ec`, `--dh-accent #f59e0b`, `--dh-surface #fff`, `--dh-bg #faf6ed` (cream), `--dh-border #e5ddc3`, `--dh-text #1f1f24`, `--dh-muted #6b7280`, `--dh-danger #b91c1c`, `--dh-danger-soft #fef2f2`; disabled CTA `#d9d3c2`/`#93917f` | `registration/onboarding.css` |
| Hard-coded in screens | `#E85D04` (Razorpay theme, wallet), `#101521` (dark panels), `#000000` route stroke, `#f4b400`, `#1830b8`, `#88B04B` (profile accents), `#f8f9fb`/`#f5f7fb`/`#f5f1e8` backgrounds, `#ef4444` | DriverHome/ActiveTrip/Profile/Wallet |
| Flutter wrapper | primary `#6366F1` (generic template), launcher adaptive-icon bg `#FDD200`, status bar black, exit-dialog button `#FFD86F` | F: `lib/config/app_config.dart`, `pubspec.yaml` |
Radii: cards 16-24 px (`rounded-2xl/3xl`), onboarding fields 16, chips 14, cards 22, CTA height 56 (`h-14`), pill buttons. Shadows: soft `0 4px 20px rgba(15,23,42,.05)`, premium `0 10px 40px -10px rgba(0,0,0,.15)`, glass `rgba(255,255,255,.7) blur(12px)`. Scrollbars hidden globally.

### 6.3 Assets (all under `Frontend/src/modules/Taxi/assets/` unless noted)
| Asset | Path | Used by |
|---|---|---|
| Ride-request alert sound | `assets/sounds/ride-request-alert.mp3` | `utils/rideRequestAlertSound.js` |
| Vehicle icons | `assets/icons/{car,bike,auto,truck,ehcv,hcv,LCV,mcv,Luxury,Premium,SUV,scooty,Hatchback,bus,mini_bus}.png` (+ `premium_auto/bike/car.png`, `Delivery.png`) | `VehicleFleet`, `ActiveTrip` (car/bike/auto), `utils/iconMapping.jsx`; map markers also use server `vehicleIconUrl` |
| Map placeholder | `assets/premium_grid_map.png` (also `shared/assets/premium_grid_map.png`, `map_image.png`) | `DriverHome`/`ApplicationStatus` backgrounds |
| Driver hero | `shared/assets/driver_welcome_hero.png`, `assets/images/driver-login-bg.png` | login visuals (unsure which are still referenced) |
| Driver brand mark | `Frontend/public/assets/logos/driver-384.png` (const `DRIVER_BRAND_LOGO` in `Frontend/src/shared/constants/brandLogo.js`; fallback `/logo.png` via `logoFallback`) | all onboarding screens + Home header |
| Flutter equivalents | F: `assets/images/{logo,splashLogo}.png`, `assets/onboarding/onboarding{1,2,3}.png`, `assets/gif/app_gif.gif`, `android/app/src/main/res/raw/{order_ringtone.mp3,order_ringtone_.mp3,order_ringtone_pre.mp3,bell.mp3}`, `ios/Runner/order_ringtone.mp3` | wrapper |
Icon set: `lucide-react` throughout.

---------------------------------------------------------------------------------------------------

## 7. Flutter wrapper capabilities (reference only)

Wrapper = `flutter_inappwebview` loading `https://tourismdimahasao.in/taxi/driver` (F: `lib/config/app_config.dart webUrl`), Android package `com.dimahsao.taxidriver` (F: `android/app/build.gradle`, namespace + applicationId; minSdk = Flutter default; target/compile SDK 36). App label "Dima Hasao Tourism - driver". Almost all logic is generic "WebView Master" template code adapted from a restaurant/delivery app.

| Capability | What the wrapper does | Expo equivalent needed |
|---|---|---|
| Push registration | `firebase_messaging`; token captured natively then POSTed to `[root]/fcm-tokens/mobile/save` `{token}` with the access token it scraped from login responses (JS fetch/XHR interceptor `captureLoginResponse` stores `accessToken`/`token`/`refreshToken` in SharedPreferences `access_token`). Re-registers on `onTokenRefresh` and after login. It never calls the web bridge `window.__saveNativeFcmToken` | `expo-notifications` `getDevicePushTokenAsync()` (native FCM) -> `POST /drivers/fcm-token {token, platform:'android'|'ios'}` after login and on token refresh |
| FCM channels (Android) | Created at init: `webview_notifications` (low), `silent_notifications_v1` (high-ish/no sound; also the manifest `default_notification_channel_id`), `critical_order_alerts_v8` ("New Order Alerts", importance max, sound raw `order_ringtone`, vibration, lights). Channels are deleted/recreated every init | Create channels via `Notifications.setNotificationChannelAsync` (ride-request channel: MAX, custom sound `order_ringtone` placed in `app.json` `expo-notifications` sounds, vibration) |
| Foreground handler | `FirebaseMessaging.onMessage` -> `NotificationService._handleForegroundMessage`: dedupes by messageId for 5 min; if `isNewOrderNotification(data)` shows local critical notification and starts the background service; else silent local notification | `Notifications.setNotificationHandler` + in-app ride-request modal driven by socket |
| Background / terminated handler | `FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler)` (top-level isolate): merges `notification` into data; if new-order: waits 600 ms, cancels the OS auto-shown tray notification, shows critical-channel notification (`FLAG_INSISTENT` = looping sound, `Importance.max`, `Priority.max`, public, red colorized, BigText) and starts the background service; otherwise silent notification (skipped if payload has a `notification` block, since OS already showed it) | `expo-task-manager` background notification task (data-only/high priority needed), or a native FCM service module (config plugin) to ring + show full-screen UI |
| Payload shape expected | Order detection by `data.type|kind|notification_type|click_action|event` in `{new_order, new-order, new_booking_request, booking_offer, neworder, create_order, order_placed}` or title containing `new order/new delivery order/order received/naya order`; ids via `orderId|order_id|orderMongoId|id` | Backend ride push is `{notification:{title:'New ride request', body}, data:{type:'ride_request', rideId, serviceType, userId, click_action:'FLUTTER_NOTIFICATION_CLICK'}, android.priority:'high'}` (`pushNotificationService.js`, `dispatchService.js`). **`ride_request` is NOT in the wrapper whitelist** and the title does not match, so in the wrapper a ride-request push is treated as a silent notification (no ringtone). Port must key off `data.type === 'ride_request'` |
| Tap / deep-link handling | Tap (local notification, `onMessageOpenedApp`, cold start `getInitialMessage`) -> native `bringToFront` (MethodChannel `com.dimahsao.taxidriver/geolocation`) -> `window.dispatchEvent(new CustomEvent('flutterNewOrderTap',{detail:{orderId,orderData}}))` and tries globals `openOrderDetail/openOrderModal/...`. No web code listens for any of these (grep of `Frontend/src` finds none) -> tap just opens the app at the last page. No URL deep links | Handle `Notifications.addNotificationResponseReceivedListener`: route to `/home` (online) and fetch `/rides/active/me` + rely on socket `rideRequest`; consider `data.rideId` |
| New order alert (ringtone/full-screen) | Looping sound = Android insistent notification on critical channel with raw `order_ringtone.mp3` (477 KB; iOS copy in `ios/Runner`). Permission `USE_FULL_SCREEN_INTENT` declared but no `fullScreenIntent` set in code; overlay service (`system_overlay_service.dart`) is fully commented out; `SYSTEM_ALERT_WINDOW` not requested. `audioplayers` dependency and `assets/audio/*` are unused. Alert stops on app resume (`cancelAll`) or tap | In-app: `expo-av` looping + vibration while request visible (like `rideRequestAlertSound.js`). Background: notification channel sound (<=30 s) or custom foreground service + `fullScreenIntent` (needs config plugin) |
| Background service | `flutter_background_service`, `foregroundServiceType="location|mediaPlayback"`, notification id 888 on silent channel, text "Waiting for new orders...". Started: at app start only if pref `overlay_enabled` (default false, no UI toggles it) and when a new-order push arrives. Its 15 s `Timer` reads `Geolocator.getCurrentPosition` and only `service.invoke('update', {latitude,longitude})`; nothing listens or posts to the server. So there is NO real background location reporting to the backend | `expo-location` `startLocationUpdatesAsync` (foreground service notification) + post to socket/API while online; backend currently only accepts location over socket (`locationUpdate`) so background posting needs a token-authenticated socket or a new REST endpoint |
| Permissions asked | Startup (`main.dart`): notifications (`permission_handler`). WebViewScreen init (`_requestPermissionsSequence`): notifications then a blocking LOOP until location service ON (Google Play Services `requestService` dialog via `location` pkg) and location permission granted; denied-forever -> non-dismissable dialog "Open Settings". WebView `onPermissionRequest`: camera and microphone requested on demand (`permission_handler`); geolocation prompt auto-allowed (`retain:true`). Manifest also declares: INTERNET, ACCESS_NETWORK_STATE, CAMERA, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, ACCESS_FINE/COARSE_LOCATION, READ/WRITE_EXTERNAL_STORAGE (<=SDK32), POST_NOTIFICATIONS, USE_FULL_SCREEN_INTENT, SCHEDULE_EXACT_ALARM, FOREGROUND_SERVICE(+LOCATION/SPECIAL_USE/DATA_SYNC), VIBRATE, WAKE_LOCK, `com.google.android.c2dm.permission.RECEIVE`. **No ACCESS_BACKGROUND_LOCATION** | Ask: notifications + foreground location at launch, background location when going online, camera on selfie/doc capture. Add `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE_LOCATION` through `app.json` |
| Location | Web `navigator.geolocation` inside the WebView (foreground only, `geolocationEnabled:true`); native `geolocator`/`location` used only for the permission/GPS-enabled gate and the unused background timer; stream `getServiceStatusStream` re-triggers the gate if GPS is turned off | `expo-location` |
| Downloads | `onDownloadStartRequest` -> `DownloadService` (dio): http(s) and `blob:` URLs (blob captured via injected `URL.createObjectURL` hook + `onBlobCreated` handler to bypass CSP), saves to public Downloads (Android) / app dir, `open_file` to open, notifications on completion (receipt downloads). Driver web screens have no download feature, so this is not needed for parity | None required (optional `expo-file-system` + `expo-sharing`) |
| External links / schemes | `shouldOverrideUrlLoading` + `onCreateWindow`: `intent:`, `tel:`, `mailto:`, `sms:`, `whatsapp:`, `wa.me`, social domains, `upi:`/`tez:`/`phonepe:`/`paytm:`/`bhim:` (Razorpay UPI SVG detection) -> `url_launcher` external; navigation loop guard (same URL within 800 ms). Manifest `<queries>` list for those schemes and UPI apps | `Linking.openURL`; for UPI payments use Razorpay native SDK (no WebView hacks) |
| Auth/session bridge | Injected JS (document start/end): Firebase polyfills (`isSecureContext`), `captureLoginResponse` interceptor, `savePhoneNumber` handler, `nativeGoogleSignIn` handler (`google_sign_in`), `openCamera/openGallery/openMediaPicker` handlers (`image_picker`, returns base64 map) + file-input click interceptor, localStorage sync of native token (`accessToken`,`token`,`auth_token`) after load (note: web reads `driverToken`/`token` - `token` key matches) | n/a (native app owns auth) |
| Audio autoplay unlock | UserScript patches `AudioContext` and resumes on touch, `mediaPlaybackRequiresUserGesture:false` | n/a native audio |
| Offline screen | `connectivity_plus`; if offline show `OfflineScreen` (cloud_off icon, title, "Retry" button -> reload WebView) instead of the WebView | NetInfo-based offline screen with retry |
| Exit dialog | `PopScope`: WebView history back if possible, else animated "Exit App?" dialog (Cancel / Exit, light/dark styled, button `#FFD86F`, radius 20) -> `SystemNavigator.pop` | `BackHandler` + confirm dialog on root |
| Splash / onboarding | Splash widget shown as overlay while the WebView loads (logo `splashLogo.png`, fade+scale+pulse animation, config 2 s); onboarding screen (3 pages) exists but `main.dart` never routes to it | `expo-splash-screen` with `splashLogo`; onboarding not needed |
| In-app update | `in_app_update` (Android): check 3 s after launch and on resume, at most hourly; priority >= 4 -> immediate update, else flexible download + MaterialBanner "A new version is ready to install." (LATER / RESTART NOW) | `expo-updates` (OTA) and/or `react-native-in-app-update`/Play Core wrapper |
| Status bar / nav bar | Status bar black with light icons, nav bar white (light) / black (dark); splash transparent | `expo-status-bar` + `expo-navigation-bar` |
| Back button | see Exit dialog | `BackHandler` |
| Pull to refresh | `PullToRefreshController` reloads page | n/a |
| Theme | `ThemeMode.system` (unused by web, which is light-only) | light only |
| Native bridge to web | Wrapper expects web to call `window.flutter_inappwebview.callHandler('driverOrderAlert', ...)`, which `rideRequestAlertSound.js` does; the wrapper has NO handler named `driverOrderAlert` (handlers present: `onBlobCreated, nativeGoogleSignIn, openCamera, openGallery, openMediaPicker, savePhoneNumber, captureApiRequest, captureLoginResponse`) so these calls are no-ops | n/a |
Config issues: wrapper `AppConfig.appRole` returns `'delivery'` for any URL containing `/driver` (sent to `ApiService.saveFCMToken`, though that function does not put it in the body); the Kotlin `MainActivity.kt` sits under `kotlin/com/abhikaro/restaurant/` while its package line is `com.dimahsao.taxidriver` (works at compile time but stale path); cleartext traffic allowed; signing config in `android/key.properties` (secret, not read).

---------------------------------------------------------------------------------------------------

## 8. Credentials / config locations (names only, no values)

| Item | Where |
|---|---|
| Firebase (Android) | F: `android/app/google-services.json`: project id `dimahasao-0011`, project number `488274393057`; clients for `com.dimahsao.taxidriver` (TWO app ids: `...:android:84445c...`, `...:android:88897a...`), plus `com.dimahsao.{user,restaurant,hotelpartner,toursoperator}`. The Expo app must use package `com.dimahsao.taxidriver` with this file (same Firebase project as backend sender) |
| Firebase (iOS) | F: `ios/Runner/` has no `GoogleService-Info.plist` listed (only `Info.plist`, `order_ringtone.mp3`); iOS push not configured in the wrapper (unsure) |
| Firebase Web (not needed natively) | `Frontend/.env` / `.env.production.example`: `VITE_FIREBASE_{API_KEY,AUTH_DOMAIN,PROJECT_ID,STORAGE_BUCKET,MESSAGING_SENDER_ID,APP_ID,MEASUREMENT_ID,DATABASE_URL,VAPID_KEY}`; `Frontend/public/firebase-messaging-sw.js` |
| Firebase Admin (server) | `Backend/.env` names `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_SERVICE_ACCOUNT`; `Backend/src/config/firebase.js`, `firebaseServiceAccount.js` |
| Google Maps key | `Frontend/.env`: `VITE_GOOGLE_MAPS_API_KEY` (public browser key; used by `googleMaps.js`). The Android manifest has NO `com.google.android.geo.API_KEY` meta-data (wrapper uses JS maps). Expo needs a Maps SDK key for Android/iOS (restrict by package/SHA) and, if routes are computed client-side, Routes/Directions API enabled |
| API / socket origin | `Frontend/.env(.production.example)`: `VITE_API_BASE_URL` (prod `/api/v1` same-origin; dev `http://localhost:5000/api/v1`), `VITE_SOCKET_URL` (blank in prod = same origin proxy), `VITE_SOCKET_PORT` (5001), `VITE_ASSET_BASE_URL`; F: `AppConfig.apiBaseUrl = https://tourismdimahasao.in/api`, `webUrl = https://tourismdimahasao.in/taxi/driver` |
| Razorpay | Public key id arrives from the server in the order response (`keyId`); also `VITE_RAZORPAY_KEY_ID`; server credentials resolved from admin "payment gateway" settings (`resolveConfiguredGatewayCredentials('razor_pay')` in `driverController.js`) and `RAZORPAY_*` env (e.g. `RAZORPAY_ACCOUNT_NUMBER` in `Backend/.env.example`). Gateway selection exposed in `GET /users/bootstrap` -> `settings.paymentGateway` |
| PhonePe | Server-side only (credentials in admin settings / `paymentGatewayService.js`); client gets `checkoutUrl` |
| Image uploads | Cloudinary via backend `POST /common/upload/image` (`CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` server env); no client keys |
| JWT | `JWT_ACCESS_SECRET` (server only), `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_SECRET/EXPIRES` (refresh not used by driver) |
| OTP test helpers | `VITE_USE_DEFAULT_TEST_PHONE`, `VITE_DEFAULT_TEST_PHONE` (frontend); backend `useDefaultOtp`; non-production backend returns `debugOtp` / `otp` in responses |
| Map simulation | `VITE_ENABLE_MAP_SIMULATION` listed in env example; `ActiveTrip.jsx` does not read it (panel always rendered) |
| Flutter signing | F: `android/key.properties` (alias/password/store - secret, do not copy) |

---------------------------------------------------------------------------------------------------

## 9. Bugs / unfinished / dead things in the web driver module (match or fix deliberately)

1. Login always routes through `/registration-status` after OTP verify: `OTPVerification.jsx` checks `payload.driver`, which `/auth/otp/verify` does not return (it returns `token, accessToken, role, availableRoles, user`). Approved drivers still land on `/home` after the status poll.
2. Two OTP request endpoints for the same OTP scope: first request uses `/drivers/onboarding/send-otp` (returns `loginMode`); resend + delete-account use `/auth/otp/request`. They share scope `taxi-driver` and are interchangeable server-side. A port can use `/auth/otp/request` first and decide on `isRegistered` / `nextStepIfVerified`, but a NEW phone must still use `/drivers/onboarding/send-otp` to get a `registrationId`.
3. `DeleteAccount.jsx` reads `response.data.session.debugOtp` from `/auth/otp/request` (which returns `{otp}`), so the dev auto-fill never works; it also verifies the OTP via `/auth/otp/verify` and throws the new token away.
4. Bidding is dead: socket events `submitRideBid`, `rideBidSubmitted`, `rideBiddingUpdated` and `bookingMode/bidding` fields have no backend implementation (grep in `Backend/src` finds none). The UI path (`IncomingRideRequest.jsx` bid stepper, `pricingNegotiationMode==='driver_bid'`) will never trigger.
5. Dead/duplicate fetches: `fetchActiveJob('parcel')` ignores its argument and sends `type:'ride'` (called twice per hydrate); `/deliveries/active/me` appears only in the axios de-dupe regex. `GET /rides/active/me` ignores `type`.
6. `getDriverNotifications` sends `page/limit` but backend ignores them (max 100, no `totalCount`), so "load more" is always false. `deleteDriverNotification` / `clearAllDriverNotifications` helpers call routes that do not exist (`DELETE /drivers/notifications[/:id]`); hiding/reading is client-side localStorage only.
7. Owner/pooling/bus/service-centre API helpers in `registrationService.js` (`/drivers/fleet/*`, `/drivers/pooling/*`, `/drivers/service-center/*`) have no backend routes in `driverRoutes.js`; unused by driver screens. `DriverBottomNav` still carries owner menu entries (`manage-drivers`, `pooling-vehicles`, `bus-service`) with no routes.
8. Payment return pages not routed: `RazorpayStatusPage`, `PhonePeStatusPage`, `RazorpayLaunchPage` are not registered in `TaxiApp.jsx` or `app/routes.jsx`, while the backend callback (`handleDriverRazorpayWalletTopupCallback`) 302-redirects to `<frontend>/razorpay/status?flow=driver-wallet&status=...` and PhonePe redirect uses a status page too. In the web app the redirect lands on an unknown route. Native app should poll `GET /drivers/wallet` / PhonePe status after the checkout returns instead.
9. `PortalSupportPage.jsx`, `RegistrationDashboard.jsx`, `DriverDashboard.jsx` (0 bytes), `LowBalanceModal.jsx` are not imported anywhere (dead). `PortalSupportPage` links to `/taxi/driver/terms|privacy` which have no `<Route>` (the layout whitelists them anyway). `driver/styles/driver.css` is never imported.
10. `support/ticket/:id` is missing from `DriverLayout.isPendingAllowedRoute` while `support/tickets` is allowed; additionally `/support/*` endpoints reject pending drivers (403) because they lack `allowPending`. Pending drivers can open the screen but get errors.
11. `ActiveTrip.jsx`: Simulation panel (start/pause/reset fake driver movement; emits `simulated:true`, ignored by backend) is always rendered, not gated by `VITE_ENABLE_MAP_SIMULATION`. Omit in the port. `triggerEmergencySos` is only `tel:112` (no `/drivers/sos`); the `SecuritySOS` page calls `/drivers/sos` and then `tel:112`.
12. Status naming quirk: pickup arrival publishes `arriving`, drop arrival publishes `arrived` (see 4.1); `accepted` is re-published on "Go back".
13. `getDriverVehicleTypes` first calls the admin-only `/admin/types/vehicle-types` with the driver token; its rejection shape (`{status}` without `.response`) means the fallback guard never rethrows, so it always falls back to `/users/vehicle-types`.
14. Logout does not go offline nor disconnect the socket; account deletion likewise only clears storage (server side sets inactive/offline).
15. `app:auth-stale` has no driver handler; a revoked/expired token only clears storage silently (section 3).
16. Wallet top-up in a mobile WebView forces `callback_url` redirect mode (`isMobileOrWebView()`), which depends on the unrouted status page above and on `API_BASE_URL` being HTTPS.
17. `EditProfile` sends `phone` in `PATCH /drivers/me`; backend only reads `name`, `email`, `profileImage`, `routeBooking`, `bankDetails` (phone cannot be changed).
18. `window.__driverReconnectRealtime` is defined for the Flutter wrapper to call on resume, but nothing in the Flutter code calls it (unsure; grep found no reference).
19. Wrapper-side issue: ride-request FCM `data.type='ride_request'` is not recognised as a new-order alert (section 7).
20. Stale comments in `TaxiApp.jsx` ("Reached when one phone holds several portal roles") and role-picker leftovers (`availableRoles`) - only `driver` role exists now (`LOGIN_ROLE_PRIORITY=['driver']`, `normalizeRole` returns `'driver'` always in `Backend/.../loginOtpService.js`).

---------------------------------------------------------------------------------------------------

## 10. Out of scope (other roles in the same Taxi router / module)

Router: `Frontend/src/modules/Taxi/TaxiApp.jsx`.

| Routes | Role | Reason |
|---|---|---|
| `/taxi/user/*`, `/taxi/ride/*`, `user/ride/*`, `user/profile/*`, `user/safety/sos`, user wallet/activity/support pages (`modules/user/**`) | Rider/user | Different app (user Expo app at `mobile-user`); only `Chat`, `SupportTickets`, `SupportTicketDetail` are shared and listed in section 1 |
| `/taxi/admin/*` (login, dashboard, drivers, wallet, withdrawals, delete requests, documents, bulk upload, payment methods, ratings, reports, promotions, support, chat, settings...) incl. `/taxi/user-import/create`, `/taxi/driver-import/create` | Admin | Web admin console, not mobile |
| `owner/*` (fleet owner: manage drivers, fleet vehicles, zones, wallet) and `DriverBottomNav` owner tab set | Owner / fleet | Single driver role now; backend routes `/drivers/fleet/*` do not exist |
| `driver/role-signup/bus-builder*`, bus/pooling (`/drivers/pooling/*`, `/drivers/fleet/bus-*`, `pooling-vehicles`, `bus-service`) | Pooling / bus driver | Not implemented in backend router; only referenced by dead helpers |
| `/drivers/service-center/*`, `service_center`, `service_center_staff` roles, biometrics | Service centre | No backend routes; referenced by dead helpers and `DriverLayout.isDriverApproved` branch |
| `/taxi/terms`, `/taxi/privacy` redirects (to `/legal/:slug?module=taxi`), landing/marketing pages at `/taxi` | Public | Not part of driver app |
| Food/delivery (`/food/delivery/*`), hotel, tours, festivals | Other modules | Different roles/apps (the Flutter driver wrapper's role helper still says "delivery") |
| Admin Taxi API (`/api/v1/taxi/admin/*`) | Admin | Not called by driver (except the failing `/admin/types/vehicle-types` probe) |

---------------------------------------------------------------------------------------------------

## Appendix - Backend route map used by the driver (for the port)
Driver router: `Backend/src/modules/taxi/driver/routes/driverRoutes.js` (mounted `/drivers`). Authenticated (`authenticate(['driver'])`, pending blocked unless noted): `GET/PATCH/DELETE /me` (GET allowPending), `POST /me/delete-request`, `POST /sos`, `GET/POST /emergency-contacts`, `DELETE /emergency-contacts/:contactId`, `PATCH /documents/:documentKey` (allowPending), `GET /notifications`, `GET /scheduled-rides`, `POST /scheduled-rides/:rideId/cancel`, `POST /fcm-token` (allowPending), `GET /wallet`, `GET /incentives`, `POST /incentives/claim`, `POST /wallet/top-up`, `POST /wallet/top-up/{razorpay,phonepe}/order`, `POST /wallet/top-up/razorpay/verify`, `GET /wallet/top-up/phonepe/status/:merchantTransactionId`, `POST /wallet/withdrawals`, `POST /payments/qr`, `GET /payments/qr/status`, `PATCH /vehicle`, `PATCH /online`, `PATCH /offline`. Public: `POST /register`, `POST /login` (legacy, "sign-in now lives at /v1/auth/otp"), `GET /approval-status` (self-auth), `GET /service-locations`, `GET /document-templates`, `GET /vehicle-field-templates`, `POST /onboarding/{send-otp,verify-otp,complete}`, `PATCH /onboarding/{personal,referral,vehicle,documents}`, `GET /onboarding/session/:registrationId`, razorpay callback GET/POST.
Rides router: `Backend/src/modules/taxi/user/routes/rideRoutes.js` (mounted `/rides`): driver-allowed `GET /`, `GET /active/me`, `GET /:rideId`, `PATCH /:rideId/status`. Chat: `Backend/src/modules/taxi/chat/routes/chatRoutes.js` (`/chats/*`, roles admin/user/driver, allowPending). Support: `Backend/src/modules/taxi/support/routes/supportRoutes.js` (`/support/*`, roles user/driver/owner). Common: `Backend/src/modules/taxi/common/routes/commonRoutes.js` (`/common/upload/image`, `/common/referrals/settings`, `/common/payment-gateway`). OTP auth: `Backend/src/core/auth/otpAuth/otpAuth.routes.js` (`/api/v1/auth/otp/{request,verify,complete}`, `GET /audiences`).
