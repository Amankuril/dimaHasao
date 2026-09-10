import Property from '../models/Property.js';
import RoomType from '../models/RoomType.js';
import Booking from '../models/Booking.js';
import Offer from '../models/Offer.js';
import PlatformSettings from '../models/PlatformSettings.js';
import AvailabilityLedger from '../models/AvailabilityLedger.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import Razorpay from 'razorpay';
import PaymentConfig from '../config/payment.config.js';
import mongoose from 'mongoose';
import emailService from '../services/emailService.js';
import notificationService from '../services/notificationService.js';
import referralService from '../services/referralService.js';
import User from '../models/User.js';

// Helper: Trigger Notifications
const triggerBookingNotifications = async (booking) => {
  try {
    const fullBooking = await Booking.findById(booking._id)
      .populate('userId')
      .populate('propertyId');

    if (!fullBooking) return;

    const user = fullBooking.userId;
    const property = fullBooking.propertyId;

    // 1. User Email
    if (user && user.email) {
      emailService.sendBookingConfirmationEmail(user, fullBooking).catch(err => console.error('Email trigger failed:', err));
    }

    // 2. User Push
    if (user) {
      notificationService.sendToUser(user._id, {
        title: 'Booking Confirmed!',
        body: `You are going to ${property ? property.propertyName : 'Hotel'}.`
      }, { type: 'booking', bookingId: fullBooking._id }, 'user').catch(err => console.error('User Push failed:', err));
    }

    // 3. Partner Notifications
    if (property && property.partnerId) {
      // Push
      notificationService.sendToUser(property.partnerId, {
        title: 'New Booking Alert!',
        body: `${fullBooking.totalNights} Night, ${fullBooking.guests.adults} Guests. Check App.`
      }, { type: 'new_booking', bookingId: fullBooking._id }, 'partner').catch(err => console.error('Partner Push failed:', err));

      // SMS
      // Need to find Partner Phone. Property has partnerId, need to fetch Partner User.
      try {
        const Partner = (await import('../models/Partner.js')).default;
        const partner = await Partner.findById(property.partnerId);
        if (partner && partner.phone) {
          smsService.sendSMS(partner.phone, `New Booking Alert! ${fullBooking.totalNights} Night, ${fullBooking.guests.adults} Guests. Check App.`)
            .catch(e => console.error('Partner SMS failed:', e));
        }
      } catch (smsErr) {
        console.error('Partner SMS Lookup Error:', smsErr);
      }
    }

  } catch (err) {
    console.error('Trigger Notification Error:', err);
  }
};

export const createBooking = async (req, res) => {
  try {
    const {
      propertyId,
      roomTypeId,
      checkInDate,
      checkOutDate,
      guests,
      paymentMethod,
      paymentDetails,
      bookingUnit,
      couponCode,
      useWallet,
      walletDeduction
    } = req.body;

    // Fetch Property
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    const pType = property.propertyType.toLowerCase();
    const isInquiry = ['buy', 'plot', 'rent'].includes(pType);

    // Basic Validation - different for inquiries
    if (!isInquiry) {
      if (!roomTypeId || !checkInDate || !checkOutDate) {
        return res.status(400).json({ message: 'Missing required booking details' });
      }
    }

    const roomType = roomTypeId ? await RoomType.findById(roomTypeId) : null;
    if (!isInquiry && !roomType) return res.status(404).json({ message: 'Room type not found' });

    // --- HANDLE INQUIRY FLOW (BUY/PLOT) ---
    if (isInquiry) {
      const bookingId = `INQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const userModel = req.user.constructor.modelName;

      const inquiry = new Booking({
        bookingId,
        userModel,
        userId: req.user._id,
        propertyId,
        propertyType: pType,
        roomTypeId: roomTypeId || null,
        isInquiry: true,
        bookingStatus: 'pending',
        inquiryMetadata: {
          preferredDate: checkInDate ? new Date(checkInDate) : new Date(),
          message: req.body.message || 'I am interested in this property.',
          budget: req.body.budget || (pType === 'buy' ? property.buyDetails?.expectedPrice : (pType === 'rent' ? property.rentDetails?.monthlyRent : property.plotDetails?.expectedPrice)),
          status: 'new'
        }
      });

      await inquiry.save();

      // Notify Partner
      if (property.partnerId) {
        notificationService.sendToUser(property.partnerId, {
          title: 'New Property Inquiry!',
          body: `You have a new inquiry for ${property.propertyName}.`
        }, { type: 'new_inquiry', bookingId: inquiry._id }, 'partner').catch(e => console.error(e));
      }

      return res.status(201).json({
        success: true,
        message: 'Inquiry submitted successfully',
        booking: inquiry
      });
    }

    // --- CONTINUE STANDARD BOOKING FLOW ---
    // Fetch Settings
    const settings = await PlatformSettings.getSettings();
    const gstRate = settings.taxRate || 12;

    // Default commission from global settings
    let commissionRate = settings.defaultCommission || 10;

    // --- REVENUE STRATEGY: Dynamic Commission ---
    // Check Partner's Subscription Plan
    // We need to fetch the Partner to see their plan
    if (property.partnerId) {
      try {
        // Dynamic import to avoid circular dependency if any, though Partner model is safe here
        const Partner = (await import('../models/Partner.js')).default;
        const partner = await Partner.findById(property.partnerId).populate('subscription.planId');

        if (partner && partner.subscription && partner.subscription.status === 'active' && partner.subscription.planId) {
          const plan = partner.subscription.planId;
          const isExpired = partner.subscription.expiryDate && new Date(partner.subscription.expiryDate) < new Date();

          if (!isExpired && plan.commissionPercentage !== undefined) {
            // Use the Plan's confidential commission rate
            commissionRate = plan.commissionPercentage;
          }
        }
        // If no plan or expired, we stick to 'settings.defaultCommission' (Higher rate for non-subscribers)
      } catch (err) {
        console.error('Error fetching partner subscription for commission:', err);
      }
    }

    // Calculate Nights
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const totalNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    if (totalNights <= 0) {
      return res.status(400).json({ message: 'Invalid check-in/check-out dates' });
    }

    // Check Availability
    const requiredUnits = guests.rooms || 1;
    const ledgerEntries = await AvailabilityLedger.aggregate([
      {
        $match: {
          propertyId: new mongoose.Types.ObjectId(propertyId),
          roomTypeId: new mongoose.Types.ObjectId(roomTypeId),
          startDate: { $lt: checkOut },
          endDate: { $gt: checkIn }
        }
      },
      {
        $group: {
          _id: null,
          blockedUnits: { $sum: '$units' }
        }
      }
    ]);

    const blockedUnits = ledgerEntries.length > 0 ? ledgerEntries[0].blockedUnits : 0;
    const totalInventory = roomType.totalInventory || 0;

    if (totalInventory - blockedUnits < requiredUnits) {
      return res.status(400).json({ message: `Only ${Math.max(0, totalInventory - blockedUnits)} rooms available for selected dates` });
    }

    // Calculate Base Amount
    const units = requiredUnits; // Use validated units
    const pricePerNight = roomType.pricePerNight || 0;
    const baseAmount = pricePerNight * totalNights * units;

    // Calculate Extra Charges
    const extraAdults = guests.extraAdults || 0;
    const extraChildren = guests.extraChildren || 0;
    const extraAdultPrice = (roomType.extraAdultPrice || 0) * extraAdults * totalNights;
    const extraChildPrice = (roomType.extraChildPrice || 0) * extraChildren * totalNights;
    const extraCharges = extraAdultPrice + extraChildPrice;

    // Gross Amount
    const grossAmount = baseAmount + extraCharges;

    // Calculate Discount
    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const offer = await Offer.findOne({ code: couponCode, isActive: true });
      if (offer) {
        // Validate Offer Constraints
        const isValidDate = (!offer.startDate || new Date() >= offer.startDate) &&
          (!offer.endDate || new Date() <= offer.endDate);
        const isValidAmount = grossAmount >= (offer.minBookingAmount || 0);

        // User Usage Limit
        const userUsageCount = await Booking.countDocuments({
          userId: req.user._id,
          couponCode: offer.code,
          bookingStatus: { $nin: ['cancelled', 'rejected'] }
        });
        const isUnderUserLimit = userUsageCount < (offer.userLimit || 1);

        // --- ENFORCE PROPERTY TYPE RESTRICTION ---
        const isAllowedType = !offer.allowedPropertyType ||
          offer.allowedPropertyType === 'all' ||
          offer.allowedPropertyType === pType;

        if (isValidDate && isValidAmount && isUnderUserLimit && isAllowedType) {
          if (offer.discountType === 'percentage') {
            discountAmount = (grossAmount * offer.discountValue) / 100;
            if (offer.maxDiscount) {
              discountAmount = Math.min(discountAmount, offer.maxDiscount);
            }
          } else {
            discountAmount = offer.discountValue;
          }
          discountAmount = Math.floor(discountAmount);
          discountAmount = Math.min(discountAmount, grossAmount); // Cannot exceed gross
          appliedCoupon = offer.code;
        } else if (!isAllowedType) {
          console.log(`Coupon ${couponCode} not allowed for property type ${pType}`);
        }
      }
    }

    // Calculate Tax (On Gross Amount as per Frontend logic)
    const commissionableAmount = grossAmount;
    const taxes = Math.round((commissionableAmount * gstRate) / 100);

    // Calculate Total Amount (User Pays)
    // User Pays = (Gross - Discount) + Tax
    const taxableAmount = grossAmount - discountAmount;
    const totalAmount = taxableAmount + taxes;

    // Calculate Commission (On Gross Amount)
    let adminCommission = Math.round((grossAmount * commissionRate) / 100);
    if (adminCommission < PaymentConfig.minCommission) {
      adminCommission = PaymentConfig.minCommission;
    }

    // Calculate Partner Payout
    // Partner Payout = (Gross - Discount) - Commission
    // Verification: TotalAmount - Tax - Commission = ((Gross - Discount) + Tax) - Tax - Commission = Gross - Discount - Commission.
    const partnerPayout = Math.floor(totalAmount - taxes - adminCommission);

    const bookingId = `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Determine User Model based on mongoose document model name
    const userModel = req.user.constructor.modelName;

    // Create Booking Object
    const booking = new Booking({
      bookingId,
      userModel,
      userId: req.user._id,
      propertyId,
      propertyType: property.propertyType.toLowerCase(),
      roomTypeId,
      bookingUnit: bookingUnit || 'room',
      checkInDate,
      checkOutDate,
      totalNights,
      guests: {
        adults: guests.adults || 1,
        children: guests.children || 0
      },
      pricePerNight,
      baseAmount,
      extraAdultPrice,
      extraChildPrice,
      extraCharges,
      taxes,
      adminCommission,
      partnerPayout,
      discount: discountAmount,
      couponCode: appliedCoupon,
      totalAmount,
      paymentMethod,
      bookingStatus: 'confirmed', // Default confirmed for pay_at_hotel/wallet, pending for razorpay
      paymentStatus: paymentMethod === 'pay_at_hotel' ? 'pending' : 'paid'
    });

    // Handle Wallet Payment (Partial or Full)
    if (paymentMethod === 'wallet' || (useWallet && walletDeduction > 0)) {
      const wallet = await Wallet.findOne({ partnerId: req.user._id, role: 'user' });
      const deductionAmount = walletDeduction || totalAmount;

      if (!wallet || wallet.balance < deductionAmount) {
        return res.status(400).json({ message: 'Insufficient wallet balance' });
      }

      await wallet.debit(deductionAmount, `Booking #${bookingId}`, bookingId, 'booking');

      if (paymentMethod === 'wallet' || (['online', 'razorpay'].includes(paymentMethod) && (totalAmount - (walletDeduction || 0) <= 0))) {
        booking.paymentStatus = 'paid';

        // --- DISTRIBUTE TO PARTNER & ADMIN (Immediate Settlement for Wallet Payment) ---

        // 1. Credit Partner
        if (partnerPayout > 0 && property.partnerId) {
          let partnerWallet = await Wallet.findOne({ partnerId: property.partnerId, role: 'partner' });
          if (!partnerWallet) {
            // Auto-create if missing (Safe-guard)
            partnerWallet = await Wallet.create({
              partnerId: property.partnerId,
              role: 'partner',
              balance: 0
            });
          }

          await partnerWallet.credit(partnerPayout, `Payment for Booking #${bookingId}`, bookingId, 'booking_payment');

          // NOTIFICATION: Wallet Credit
          notificationService.sendToUser(property.partnerId, {
            title: 'Wallet Credited',
            body: `Wallet Credited: ₹${partnerPayout} for Booking #${bookingId}`
          }, { type: 'wallet_credit', bookingId: booking._id }, 'partner').catch(e => console.error(e));
        }

        // 2. Credit Admin (Commission + Tax)
        const totalAdminCredit = (adminCommission || 0) + (taxes || 0);
        if (totalAdminCredit > 0) {
          // Find Admin Wallet (assuming single admin wallet or specific logic)
          let adminWallet = await Wallet.findOne({ role: 'admin' });

          // If no admin wallet exists, we might need to find an admin user to create one
          if (!adminWallet) {
            const AdminUser = mongoose.model('User');
            const adminUser = await AdminUser.findOne({ role: { $in: ['admin', 'superadmin'] } }).sort({ createdAt: 1 });
            if (adminUser) {
              adminWallet = await Wallet.create({
                partnerId: adminUser._id,
                role: 'admin',
                balance: 0
              });
            }
          }

          if (adminWallet) {
            await adminWallet.credit(totalAdminCredit, `Commission & Tax for Booking #${bookingId}`, bookingId, 'commission_tax');
          }
        }

        // REFERRAL: Trigger Referral Reward (Immediate Wallet Payment)
        referralService.processBookingCompletion(req.user._id, booking._id).catch(e => console.error('Referral Trigger Error (Wallet):', e));
      }
    }

    // Handle Online Payment (Razorpay)
    let razorpayOrder = null;
    if (paymentMethod === 'razorpay' || paymentMethod === 'online') {
      if (paymentDetails && paymentDetails.paymentId) {
        // Already paid (Legacy check)
        booking.paymentStatus = 'paid';
        booking.paymentId = paymentDetails.paymentId;
      } else {
        // Initiate New Payment
        booking.bookingStatus = 'pending'; // Pending until payment
        booking.paymentStatus = 'pending';

        // Calculate amount to pay via Gateway
        const amountToPay = totalAmount - (useWallet ? (walletDeduction || 0) : 0);

        if (amountToPay > 0) {
          try {
            const instance = new Razorpay({
              key_id: PaymentConfig.razorpayKeyId,
              key_secret: PaymentConfig.razorpayKeySecret,
            });

            const options = {
              amount: Math.round(amountToPay * 100), // amount in paisa
              currency: PaymentConfig.currency || "INR",
              receipt: bookingId,
              notes: {
                bookingId: booking._id.toString(),
                userId: req.user._id.toString(),
                propertyId: propertyId.toString(),
                roomTypeId: roomTypeId.toString(),
                bookingUnit: (bookingUnit || 'room').toString(),
                rooms: units.toString(), // Pass rooms count for ledger
                // Store financial info for verification consistency
                adminCommission: adminCommission.toString(),
                partnerPayout: partnerPayout.toString(),
                taxes: taxes.toString(),
                discount: discountAmount.toString(),
                totalAmount: totalAmount.toString(),
                type: 'booking_init'
              }
            };

            razorpayOrder = await instance.orders.create(options);

            // Set status to awaiting_payment so it doesn't show in user's list until paid
            booking.bookingStatus = 'awaiting_payment';
            booking.paymentStatus = 'pending';
          } catch (error) {
            console.error("Razorpay Order Creation Failed:", error);
            return res.status(500).json({ message: "Failed to initiate payment gateway" });
          }
        } else {
          // Fully paid by wallet (Covered by loop above, but double check status)
          booking.paymentStatus = 'paid';
          booking.bookingStatus = 'confirmed';
        }
      }
    }

    // Handle Pay at Hotel (Partner Deduction)
    if (paymentMethod === 'pay_at_hotel') {
      const deductionAmount = (taxes || 0) + (adminCommission || 0);

      if (deductionAmount > 0 && property.partnerId) {
        // 1. Debit Partner
        let partnerWallet = await Wallet.findOne({ partnerId: property.partnerId, role: 'partner' });
        if (!partnerWallet) {
          partnerWallet = await Wallet.create({
            partnerId: property.partnerId,
            role: 'partner',
            balance: 0
          });
        }

        // Check balance (Optional: enforce positive balance?)
        // We will proceed with debit, which might throw if insufficient balance 
        // depending on Wallet implementation. 
        // If we want to allow overdraft, we should check Wallet.js.
        // Assuming standard debit for now.
        try {
          await partnerWallet.debit(deductionAmount, `Commission & Tax for Booking #${bookingId}`, bookingId, 'commission_deduction');

          // 2. Credit Admin
          let adminWallet = await Wallet.findOne({ role: 'admin' });
          if (!adminWallet) {
            const AdminUser = mongoose.model('User');
            const adminUser = await AdminUser.findOne({ role: { $in: ['admin', 'superadmin'] } }).sort({ createdAt: 1 });
            if (adminUser) {
              adminWallet = await Wallet.create({
                partnerId: adminUser._id,
                role: 'admin',
                balance: 0
              });
            }
          }

          if (adminWallet) {
            await adminWallet.credit(deductionAmount, `Commission & Tax for Booking #${bookingId}`, bookingId, 'commission_tax');
          }
        } catch (err) {
          console.error("Pay at Hotel Wallet Deduction Failed:", err.message);
          // Optionally: revert booking? Or just log? 
          // For now, we log.
        }
      }
    }

    await booking.save();

    // Update Inventory (Block Room) - Only if confirmed (Pay at Hotel or Paid)
    // If Razorpay pending, we still block inventory to avoid race conditions? 
    // Usually yes, with a timeout. For now, we block it.
    await AvailabilityLedger.create({
      propertyId,
      roomTypeId,
      inventoryType: booking.bookingUnit || 'room',
      source: 'platform',
      referenceId: booking._id,
      startDate: new Date(checkInDate),
      endDate: new Date(checkOutDate),
      units: units, // Use 'units' here (rooms count)
      createdBy: 'system'
    });

    // Increment Offer Usage if applied and confirmed
    if (appliedCoupon && booking.bookingStatus === 'confirmed') {
      await Offer.findOneAndUpdate({ code: appliedCoupon }, { $inc: { usageCount: 1 } });
    }

    // Trigger Notifications (only if confirmed)
    if (booking.bookingStatus === 'confirmed') {
      triggerBookingNotifications(booking);
    }

    // Populate booking details for frontend confirmation page
    const populatedBooking = await Booking.findById(booking._id)
      .populate('propertyId')
      .populate('roomTypeId');

    res.status(201).json({
      success: true,
      booking: populatedBooking,
      paymentRequired: !!razorpayOrder,
      order: razorpayOrder,
      key: PaymentConfig.razorpayKeyId
    });
  } catch (error) {
    console.error('Create Booking Error:', error);
    res.status(500).json({ message: 'Server error creating booking' });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const { type } = req.query; // 'upcoming', 'ongoing', 'completed', 'cancelled'
    const query = { userId: req.user._id };

    if (type === 'upcoming') {
      // Upcoming: Confirmed. NOT checked-in.
      // Hiding 'pending'/'awaiting_payment' to ensure only finalized bookings appear
      query.bookingStatus = { $in: ['confirmed'] };
    } else if (type === 'ongoing') {
      // Ongoing: Checked In
      query.bookingStatus = 'checked_in';
    } else if (type === 'completed') {
      // Completed: Checked Out (and legacy completed)
      query.bookingStatus = { $in: ['completed', 'checked_out'] };
    } else if (type === 'cancelled') {
      // Cancelled, No Show, Rejected
      query.bookingStatus = { $in: ['cancelled', 'no_show', 'rejected'] };
    }

    const bookings = await Booking.find(query)
      .populate('propertyId', 'propertyName address location coverImage avgRating')
      .populate('roomTypeId', 'name')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (e) {
    console.error('Get My Bookings Error:', e);
    res.status(500).json({ message: e.message });
  }
};

export const getBookingDetail = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('propertyId')
      .populate('roomTypeId');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Allow User (Owner) or Admin/Partner (if needed, but separate endpoints exist usually)
    // For this specific 'user' endpoint, strictly check ownership
    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this booking' });
    }

    res.json(booking);
  } catch (e) {
    console.error('Get Booking Detail Error:', e);
    res.status(500).json({ message: e.message });
  }
};

export const getPartnerBookings = async (req, res) => {
  try {
    // 1. Find all properties owned by this partner
    const properties = await Property.find({ partnerId: req.user._id }).select('_id');
    const propertyIds = properties.map(p => p._id);

    // 2. Find bookings for these properties
    const { status } = req.query;
    const query = { propertyId: { $in: propertyIds } };

    if (status) {
      if (status === 'upcoming') {
        // Upcoming: Confirmed guests arriving or New Inquiries
        query.$or = [
          { bookingStatus: 'confirmed', isInquiry: false },
          { bookingStatus: 'pending', isInquiry: true }, // New Inquiries
          { 'inquiryMetadata.status': 'new' }
        ];
      } else if (status === 'in_house') {
        // In-House: Active guests or Negotiating Inquiries
        query.$or = [
          { bookingStatus: 'checked_in' },
          { 'inquiryMetadata.status': { $in: ['scheduled', 'negotiating'] } }
        ];
      } else if (status === 'completed') {
        // Completed: Guests checked out or Sold Properties
        query.$or = [
          { bookingStatus: { $in: ['completed', 'checked_out'] } },
          { 'inquiryMetadata.status': { $in: ['closed', 'sold', 'rented'] } }
        ];
      } else if (status === 'cancelled') {
        query.$or = [
          { bookingStatus: { $in: ['cancelled', 'no_show', 'rejected'] } },
          { 'inquiryMetadata.status': 'dropped' }
        ];
      } else {
        // Direct status match fallback
        query.bookingStatus = status;
      }
    }

    const bookings = await Booking.find(query)
      .populate('userId', 'name email phone avatar')
      .populate('propertyId', 'propertyName address location coverImage')
      .populate('roomTypeId', 'name')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error('Get Partner Bookings Error:', error);
    res.status(500).json({ message: 'Server error fetching bookings' });
  }
};

export const getPartnerBookingDetail = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('propertyId') // Need full property for partnerId check
      .populate('roomTypeId');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify ownership
    // Ensure propertyId is populated and has partnerId
    if (!booking.propertyId || !booking.propertyId.partnerId) {
      // Fallback or error if data consistency issue
      return res.status(403).json({ message: 'Booking data invalid (property link missing)' });
    }

    if (booking.propertyId.partnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this booking' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Get Partner Booking Detail Error:', error);
    res.status(500).json({ message: 'Server error fetching booking details' });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Allow user to cancel or admin/partner
    if (booking.userId.toString() !== req.user._id.toString()) {
      // Add logic for partner/admin override if needed
      // return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.bookingStatus === 'cancelled') {
      return res.status(400).json({ message: 'Booking already cancelled' });
    }

    // Update Status
    booking.bookingStatus = 'cancelled';
    booking.cancellationReason = req.body.reason || 'User cancelled';
    booking.cancelledAt = new Date();
    await booking.save();

    // --- WALLET REVERSAL LOGIC ---
    // Pay at Hotel: Reverse Commission Deduction (Refund Partner, Debit Admin)
    if (booking.paymentMethod === 'pay_at_hotel') {
      const refundAmount = (booking.taxes || 0) + (booking.adminCommission || 0);

      // Fetch full booking for partnerId
      const fullBooking = await Booking.findById(booking._id).populate('propertyId').populate('userId');

      if (refundAmount > 0 && fullBooking.propertyId && fullBooking.propertyId.partnerId) {
        const partnerWallet = await Wallet.findOne({ partnerId: fullBooking.propertyId.partnerId, role: 'partner' });
        const adminWallet = await Wallet.findOne({ role: 'admin' });

        if (partnerWallet && adminWallet) {
          // Credit Partner (Refund)
          await partnerWallet.credit(refundAmount, `Refund (User Cancel) for Booking #${booking.bookingId}`, booking.bookingId, 'commission_refund');

          // Debit Admin (Refund)
          await adminWallet.debit(refundAmount, `Refund (User Cancel) for Booking #${booking.bookingId}`, booking.bookingId, 'commission_refund');
        }
      }

      // Release Inventory
      await AvailabilityLedger.deleteMany({ referenceId: booking._id });

      // Trigger Cancellation Notifications
      if (fullBooking) {
        if (fullBooking.userId && fullBooking.userId.email) {
          emailService.sendBookingCancellationEmail(fullBooking.userId, fullBooking, 0)
            .catch(e => console.error('Cancel Email failed', e));
        }

        if (fullBooking.propertyId && fullBooking.propertyId.partnerId) {
          notificationService.sendToUser(fullBooking.propertyId.partnerId, {
            title: 'Booking Cancelled',
            body: `Booking #${fullBooking.bookingId} Cancelled by User. Inventory released.`
          }, { type: 'booking_cancelled', bookingId: booking._id }, 'partner').catch(e => console.error('Cancel Push failed', e));
        }
      }

      return res.json({ success: true, message: 'Booking cancelled successfully (Pay at Hotel - Commission Refunded)', booking });
    }

    // 1. Refund User (If paid)
    if (booking.paymentStatus === 'paid') {
      let userWallet = await Wallet.findOne({ partnerId: booking.userId, role: 'user' });

      // Auto-create wallet if it doesn't exist
      if (!userWallet) {
        userWallet = await Wallet.create({
          partnerId: booking.userId,
          role: 'user',
          balance: 0
        });
      }

      await userWallet.credit(booking.totalAmount, `Refund for Booking #${booking.bookingId}`, booking.bookingId, 'refund');
    }

    // 2. Deduct Partner (If payout was credited)
    // We assume payout is credited on 'confirmed'/'paid'. 
    // Check if Partner Payout > 0
    if (booking.partnerPayout > 0 && booking.paymentStatus === 'paid') {
      const fullBooking = await Booking.findById(booking._id).populate('propertyId');
      if (fullBooking.propertyId && fullBooking.propertyId.partnerId) {
        const partnerWallet = await Wallet.findOne({ partnerId: fullBooking.propertyId.partnerId, role: 'partner' });
        if (partnerWallet) {
          try {
            await partnerWallet.debit(
              booking.partnerPayout,
              `Reversal for Booking #${booking.bookingId}`,
              booking.bookingId,
              'refund_deduction'
            );
          } catch (err) {
            console.error("Partner Refund Deduction Failed:", err.message);
          }
        }
      }
    }

    // 3. Deduct Admin (Commission + Tax)
    if (booking.paymentStatus === 'paid') {
      const adminDeduction = (booking.adminCommission || 0) + (booking.taxes || 0);
      if (adminDeduction > 0) {
        const adminWallet = await Wallet.findOne({ role: 'admin' });
        if (adminWallet) {
          try {
            await adminWallet.debit(
              adminDeduction,
              `Reversal for Booking #${booking.bookingId}`,
              booking.bookingId,
              'refund_deduction'
            );
          } catch (err) {
            console.error("Admin Refund Deduction Failed:", err.message);
          }
        }
      }
    }

    // Trigger Cancellation Notifications
    const fullBooking = await Booking.findById(booking._id).populate('userId').populate('propertyId');
    if (fullBooking) {
      if (fullBooking.userId && fullBooking.userId.email) {
        emailService.sendBookingCancellationEmail(fullBooking.userId, fullBooking, booking.paymentStatus === 'paid' ? booking.totalAmount : 0)
          .catch(e => console.error('Cancel Email failed', e));
      }

      if (fullBooking.propertyId && fullBooking.propertyId.partnerId) {
        notificationService.sendToUser(fullBooking.propertyId.partnerId, {
          title: 'Booking Cancelled',
          body: `Booking #${fullBooking.bookingId} Cancelled by User. Inventory released.`
        }, { type: 'booking_cancelled', bookingId: booking._id }, 'partner').catch(e => console.error('Cancel Push failed', e));
      }
    }

    // Release Inventory
    await AvailabilityLedger.deleteMany({ referenceId: booking._id });

    res.json({ success: true, message: 'Booking cancelled successfully', booking });
  } catch (e) {
    console.error('Cancel Booking Error:', e);
    res.status(500).json({ message: e.message });
  }
};

// Mark Booking as Paid (Pay at Hotel)
export const markBookingAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate('propertyId');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Auth Check
    if (booking.propertyId.partnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(200).json({ success: true, message: 'Booking is already marked as paid.', booking });
    }

    // Update Status
    booking.paymentStatus = 'paid';
    await booking.save();

    // Trigger Notification
    if (booking.userId) {
      notificationService.sendToUser(booking.userId, {
        title: 'Payment Received',
        body: `Your payment for booking #${booking.bookingId} has been confirmed by the hotel.`
      }, { type: 'payment_received', bookingId: booking._id }, 'user').catch(console.error);
    }

    // REFERRAL: Trigger Referral Reward (Pay At Hotel Marked Paid)
    if (booking.userId) {
      referralService.processBookingCompletion(booking.userId, booking._id).catch(e => console.error('Referral Trigger Error (PayAtHotel):', e));
    }

    res.json({ success: true, message: 'Marked as Paid', booking });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Mark as No Show
export const markBookingNoShow = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate('propertyId');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Auth Check
    if (booking.propertyId.partnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.bookingStatus === 'no_show') {
      return res.status(200).json({ success: true, message: 'Booking is already marked as No Show.', booking });
    }

    booking.bookingStatus = 'no_show';
    // If No Show, should we cancel payment status? 
    // Usually No Show means they didn't come.
    await booking.save();

    // REVERSE DEDUCTION (Pay At Hotel)
    // "partner ke wallet se tax and fees plus admin commission deduct hua h voh uske wallet me vps se credit ho jayega"
    if (booking.paymentMethod === 'pay_at_hotel') {
      const refundAmount = (booking.taxes || 0) + (booking.adminCommission || 0);

      if (refundAmount > 0 && booking.propertyId.partnerId) {
        const partnerWallet = await Wallet.findOne({ partnerId: booking.propertyId.partnerId, role: 'partner' });
        const adminWallet = await Wallet.findOne({ role: 'admin' });

        if (partnerWallet && adminWallet) {
          // Credit Partner
          await partnerWallet.credit(refundAmount, `Refund (No Show) for Booking #${booking.bookingId}`, booking.bookingId, 'commission_refund');

          // Debit Admin
          await adminWallet.debit(refundAmount, `Refund (No Show) for Booking #${booking.bookingId}`, booking.bookingId, 'commission_refund');
        }
      }
    }
    // HANDLE PAY NOW / ONLINE / WALLET (Partner Earning Deducted -> Admin Credit)
    else if (['online', 'razorpay', 'wallet'].includes(booking.paymentMethod) && booking.paymentStatus === 'paid') {
      const deductionAmount = booking.partnerPayout || 0;

      if (deductionAmount > 0 && booking.propertyId.partnerId) {
        let partnerWallet = await Wallet.findOne({ partnerId: booking.propertyId.partnerId, role: 'partner' });

        // Ensure Admin Wallet
        let adminWallet = await Wallet.findOne({ role: 'admin' });
        if (!adminWallet) {
          const AdminUser = mongoose.model('User');
          const adminUser = await AdminUser.findOne({ role: { $in: ['admin', 'superadmin'] } }).sort({ createdAt: 1 });
          if (adminUser) {
            adminWallet = await Wallet.create({
              partnerId: adminUser._id,
              role: 'admin',
              balance: 0
            });
          }
        }

        if (partnerWallet && adminWallet) {
          try {
            // Debit Partner (Earning Reversal/Penalty)
            await partnerWallet.debit(deductionAmount, `No Show Penalty for Booking #${booking.bookingId}`, booking.bookingId, 'no_show_penalty');

            // Credit Admin (Funds retained by platform)
            await adminWallet.credit(deductionAmount, `No Show Credit (from Partner) for Booking #${booking.bookingId}`, booking.bookingId, 'no_show_credit');

          } catch (err) {
            console.error("No Show Wallet Deduction Failed (Pay Now):", err.message);
          }
        }
      }
    }

    // Release Inventory
    await AvailabilityLedger.deleteMany({ referenceId: booking._id });

    res.json({ success: true, message: 'Marked as No Show. Inventory released and commission refunded.', booking });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Check-In Booking
export const markCheckIn = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate('propertyId');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.propertyId.partnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.bookingStatus !== 'confirmed') {
      return res.status(400).json({ message: 'Booking must be confirmed to check in.' });
    }

    booking.bookingStatus = 'checked_in';
    await booking.save();

    if (booking.userId) {
      notificationService.sendToUser(booking.userId, {
        title: 'Checked In Successfully',
        body: 'Welcome! Enjoy your stay.'
      }, { type: 'check_in', bookingId: booking._id }, 'user').catch(console.error);
    }

    res.json({ success: true, message: 'Checked In Successfully', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Check-Out Booking
export const markCheckOut = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate('propertyId');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.propertyId.partnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.bookingStatus !== 'checked_in') {
      return res.status(400).json({ message: 'Booking must be checked-in to check out.' });
    }

    // Determine if payment is required
    if (booking.paymentStatus !== 'paid') {
      // Allow Partner to override? Or strict? 
      // Let's go strict for now but allow if query param ?force=true
      if (req.query.force !== 'true') {
        return res.status(400).json({ message: 'Payment Pending. Please Mark Paid first.', requirePayment: true });
      }
    }

    booking.bookingStatus = 'checked_out';
    // booking.actualCheckOutDate = new Date(); // Ideally add to schema
    await booking.save();

    // --- RELEASE INVENTORY (Early Checkout) ---
    try {
      const ledger = await AvailabilityLedger.findOne({ referenceId: booking._id });
      if (ledger) {
        const now = new Date();
        // If checking out earlier than the blocked end date, free up the rest
        if (now < new Date(ledger.endDate)) {
          ledger.endDate = now;
          await ledger.save();
          console.log(`[Inventory] Released inventory for Booking ${booking.bookingId} (Early Checkout)`);
        }
      }
    } catch (invErr) {
      console.error('Inventory Release Failed during Check-out:', invErr);
    }

    if (booking.userId) {
      notificationService.sendToUser(booking.userId, {
        title: 'Checked Out Successfully',
        body: 'Thank you for staying with us!'
      }, { type: 'check_out', bookingId: booking._id }, 'user').catch(console.error);
    }

    // Referral Trigger (if not already done)
    if (booking.userId && booking.paymentStatus === 'paid') {
      referralService.processBookingCompletion(booking.userId, booking._id).catch(e => console.error('Referral Trigger Error:', e));
    }

    res.json({ success: true, message: 'Checked Out Successfully', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Inquiry Status (Buy/Plot)
export const updateInquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, message } = req.body;

    const inquiry = await Booking.findById(id).populate('propertyId');
    if (!inquiry) return res.status(404).json({ message: 'Inquiry not found' });

    // Auth Check
    if (inquiry.propertyId.partnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!inquiry.isInquiry) {
      return res.status(400).json({ message: 'This is not an inquiry' });
    }

    inquiry.inquiryMetadata.status = status;
    if (message) inquiry.inquiryMetadata.message = message;

    await inquiry.save();

    // Notify User
    if (inquiry.userId) {
      notificationService.sendToUser(inquiry.userId, {
        title: 'Inquiry Updated',
        body: `Your inquiry for ${inquiry.propertyId.propertyName} has been updated to ${status}.`
      }, { type: 'inquiry_update', bookingId: inquiry._id }, 'user').catch(console.error);
    }

    res.json({ success: true, message: 'Inquiry status updated', inquiry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
