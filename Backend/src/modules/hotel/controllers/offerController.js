import Offer from '../models/Offer.js';
import Booking from '../models/Booking.js';

/**
 * @desc    Get active offers for users
 * @route   GET /api/offers
 * @access  Public (Optional Auth)
 */
export const getActiveOffers = async (req, res) => {
  try {
    const offers = await Offer.find({
      isActive: true,
      startDate: { $lte: new Date() },
      $or: [
        { endDate: { $exists: false } },
        { endDate: { $gte: new Date() } }
      ]
    }).sort({ createdAt: -1 });

    // Seed default if empty
    if (offers.length === 0) {
      // ... same seed logic ...
      const seedOffers = [
        {
          title: "New User Special",
          subtitle: "Flat ₹100 Off on your first booking",
          description: "Applicable on all hotels for new users.",
          code: "NEWRUKKO",
          discountType: "flat",
          discountValue: 100,
          minBookingAmount: 500,
          image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80",
          bg: "bg-[#004F4D]",
          btnText: "Apply Now",
          userLimit: 1
        },
        {
          title: "Winter Wonderland",
          subtitle: "Get 15% Off up to ₹500",
          description: "Special winter discount for premium stays.",
          code: "WINTER15",
          discountType: "percentage",
          discountValue: 15,
          maxDiscount: 500,
          minBookingAmount: 1000,
          image: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&q=80",
          bg: "bg-[#1A1A1A]",
          btnText: "Grab Deal",
          userLimit: 2
        }
      ];

      for (const so of seedOffers) {
        const exists = await Offer.findOne({ code: so.code });
        if (!exists) {
          await Offer.create(so);
        }
      }

      const freshOffers = await Offer.find({ isActive: true });
      return res.json(freshOffers);
    }

    // Filter by userLimit if user is logged in
    if (req.user) {
      const filteredOffers = [];
      for (const offer of offers) {
        const userUsageCount = await Booking.countDocuments({
          userId: req.user._id,
          couponCode: offer.code,
          bookingStatus: { $nin: ['cancelled', 'rejected'] }
        });

        if (userUsageCount < (offer.userLimit || 1)) {
          filteredOffers.push(offer);
        }
      }
      return res.json(filteredOffers);
    }

    res.json(offers);
  } catch (error) {
    console.error('Get Offers Error:', error);
    res.status(500).json({ message: 'Server error fetching offers' });
  }
};

/**
 * @desc    Validate an offer code
 * @route   POST /api/offers/validate
 * @access  Private
 */
export const validateOffer = async (req, res) => {
  try {
    const { code, bookingAmount } = req.body;

    if (!code) return res.status(400).json({ message: "Coupon code is required" });

    const offer = await Offer.findOne({
      code: code.toUpperCase(),
      isActive: true
    });

    if (!offer) {
      return res.status(404).json({ message: "Invalid coupon code or expired" });
    }

    // 1. Date Check
    const now = new Date();
    if (offer.startDate > now || (offer.endDate && new Date(offer.endDate).setHours(23, 59, 59, 999) < now.getTime())) {
      return res.status(400).json({ message: "Coupon has expired or is not yet active" });
    }

    // 2. Min Amount Check
    if (bookingAmount < offer.minBookingAmount) {
      return res.status(400).json({ message: `Minimum booking amount should be ₹${offer.minBookingAmount}` });
    }

    // 3. Overall Usage Limit
    if (offer.usageCount >= offer.usageLimit) {
      return res.status(400).json({ message: "Coupon limit reached" });
    }

    // 4. User Usage Limit
    const userUsageCount = await Booking.countDocuments({
      userId: req.user._id,
      couponCode: offer.code,
      bookingStatus: { $nin: ['cancelled', 'rejected'] }
    });

    if (userUsageCount >= (offer.userLimit || 1)) {
      return res.status(400).json({ message: `You have reached the usage limit for this coupon (${offer.userLimit || 1} time(s))` });
    }

    // Calculate Discount
    let discount = 0;
    if (offer.discountType === 'percentage') {
      discount = (bookingAmount * offer.discountValue) / 100;
      if (offer.maxDiscount && discount > offer.maxDiscount) {
        discount = offer.maxDiscount;
      }
    } else {
      discount = offer.discountValue;
    }

    res.json({
      success: true,
      offerCode: offer.code,
      discount: Math.floor(discount),
      finalAmount: Math.floor(bookingAmount - discount),
      description: offer.description || offer.subtitle
    });

  } catch (error) {
    console.error('Validate Offer Error:', error);
    res.status(500).json({ message: 'Server error validating offer' });
  }
};

/**
 * @desc    Create an offer (Admin)
 */
export const createOffer = async (req, res) => {
  try {
    const offerData = { ...req.body };

    // If a file was uploaded via multer/cloudinary
    if (req.file) {
      offerData.image = req.file.path;
    }

    const offer = new Offer(offerData);
    await offer.save();
    res.status(201).json(offer);
  } catch (error) {
    console.error('Create Offer Error:', error);
    res.status(400).json({ message: error.message || 'Error creating offer' });
  }
};

/**
 * @desc    Get all offers for Admin
 */
export const getAllOffers = async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching offers' });
  }
};

/**
 * @desc    Update an offer (Admin)
 */
export const updateOffer = async (req, res) => {
  try {
    const offerData = { ...req.body };
    if (req.file) {
      offerData.image = req.file.path;
    }

    const offer = await Offer.findByIdAndUpdate(req.params.id, offerData, { new: true });
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    res.json(offer);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Error updating offer' });
  }
};

/**
 * @desc    Delete an offer (Admin)
 */
export const deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) return res.status(404).json({ message: "Offer not found" });
    res.json({ message: "Offer deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting offer' });
  }
};
