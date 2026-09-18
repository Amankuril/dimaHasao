import User from '../models/User.js';
import Partner from '../models/Partner.js';
import InfoPage from '../models/InfoPage.js';
import ContactMessage from '../models/ContactMessage.js';
import PlatformSettings from '../models/PlatformSettings.js';
import Withdrawal from '../models/Withdrawal.js';
import Property from '../models/Property.js';
import RoomType from '../models/RoomType.js';
import Booking from '../models/Booking.js';
import PropertyDocument from '../models/PropertyDocument.js';
import Review from '../models/Review.js';
import AvailabilityLedger from '../models/AvailabilityLedger.js';
import Notification from '../models/Notification.js';
import emailService from '../services/emailService.js';
import notificationService from '../services/notificationService.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import { searchRegex } from '../../../utils/searchRegex.js';



export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    // Helper for percentage change
    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    /*
     * Every read below is independent, so they go out together.
     *
     * This handler used to issue nine queries in a Promise.all and then twelve
     * more one line at a time. None of the twelve read another's result — they
     * were sequential only because they were written on consecutive lines, and
     * at roughly 40ms per round trip that accounted for the endpoint's 511ms
     * against a nearly empty database.
     *
     * Three of the original queries were dead: usersLastMonth and
     * bookingsLastMonth were destructured and never read, and
     * lastMonthRevenueData fed only `prevRevenue`, which nothing used. They are
     * gone rather than parallelised.
     */
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const PAID_STAY = { bookingStatus: { $in: ['confirmed', 'checked_out', 'checked_in'] }, paymentStatus: 'paid' };
    const revenueIn = (createdAt) => Booking.aggregate([
      { $match: createdAt ? { ...PAID_STAY, createdAt } : PAID_STAY },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    const [
      totalUsers,
      totalPartners,
      totalHotels,
      pendingHotels,
      totalBookings,
      currentRevenueData,
      usersNewThisMonth,
      usersNewLastMonth,
      bookingsThisMonth,
      bookingsLastMonthCount,
      revThisMonthAgg,
      revLastMonthAgg,
      monthlyRevenue,
      bookingStatusStats,
      recentBookings,
      recentPropertyRequests,
    ] = await Promise.all([
      User.countDocuments({}),
      Partner.countDocuments({}),
      Property.countDocuments({}),
      Property.countDocuments({ status: 'pending' }),
      Booking.countDocuments({}),
      revenueIn(null),
      User.countDocuments({ createdAt: { $gte: startOfThisMonth } }),
      User.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      Booking.countDocuments({ createdAt: { $gte: startOfThisMonth } }),
      Booking.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      revenueIn({ $gte: startOfThisMonth }),
      revenueIn({ $gte: startOfLastMonth, $lte: endOfLastMonth }),
      Booking.aggregate([
        { $match: { ...PAID_STAY, createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            amount: { $sum: '$totalAmount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Booking.aggregate([
        { $group: { _id: '$bookingStatus', count: { $sum: 1 } } },
      ]),
      // Read-only and serialised straight to JSON, so no need for full documents.
      Booking.find()
        .populate('userId', 'name email')
        .populate('propertyId', 'propertyName address')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Property.find({ status: 'pending' })
        .populate('partnerId', 'name email')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const totalRevenue = currentRevenueData[0]?.total || 0;
    const incomeThisMonth = revThisMonthAgg[0]?.total || 0;
    const incomeLastMonth = revLastMonthAgg[0]?.total || 0;

    const trends = {
      users: calculateGrowth(usersNewThisMonth, usersNewLastMonth),
      bookings: calculateGrowth(bookingsThisMonth, bookingsLastMonthCount),
      revenue: calculateGrowth(incomeThisMonth, incomeLastMonth),
    };

    const revenueChart = monthlyRevenue.map((item) => {
      const [year, month] = item._id.split('-');
      const date = new Date(year, month - 1);
      return {
        name: date.toLocaleString('default', { month: 'short' }),
        value: item.amount,
      };
    });

    const statusChart = bookingStatusStats.map((item) => ({
      name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      value: item.count,
    }));

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalPartners,
        totalHotels,
        pendingHotels,
        totalBookings,
        totalRevenue,
        trends
      },
      charts: {
        revenue: revenueChart,
        status: statusChart
      },
      recentBookings,
      recentPropertyRequests
    });
  } catch (error) {
    console.error('Get Admin Dashboard Stats Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching dashboard stats' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { search, status } = req.query;

    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.isBlocked = status === 'blocked';
    }

    /*
     * The count does not inform the find, so they go out together.
     *
     * Deliberately NOT .lean() here, unlike the sibling list endpoints. The
     * User schema defines defaults for fields most stored documents do not
     * carry — `active`, `address.country`, `deletionRequest`, and several
     * nulls — and Mongoose materialises those during hydration. A lean read
     * returns the raw document, so those keys simply disappear from the
     * response. Measured: nine fields vanished from this endpoint's payload.
     * The parallel count is the safe half of the optimisation; the lean is not.
     */
    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ]);

    res.status(200).json({ success: true, users, total, page, limit });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching users' });
  }
};

export const getAllPartners = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { search, approvalStatus, status } = req.query;

    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (approvalStatus) {
      query.partnerApprovalStatus = approvalStatus;
    }

    if (status) {
      if (status === 'blocked') {
        query.isBlocked = true;
      } else if (status === 'active') {
        query.isBlocked = false;
      }
    }

    /*
     * The count does not inform the find, so they go out together; and the rows
     * are serialised straight to JSON, so they do not need to be full Mongoose
     * documents. Nothing here is saved back.
     */
    const [total, partners] = await Promise.all([
      Partner.countDocuments(query),
      Partner.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    res.status(200).json({ success: true, partners, total, page, limit });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching partners' });
  }
};

export const getAllHotels = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { search, status, type } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { propertyName: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.state': { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (type) {
      query.propertyType = String(type).toLowerCase();
    }

    /*
     * The count does not inform the find, so they go out together; and the rows
     * are serialised straight to JSON, so they do not need to be full Mongoose
     * documents. Nothing here is saved back.
     */
    const [total, hotels] = await Promise.all([
      Property.countDocuments(query),
      Property.find(query)
        .populate('partnerId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.status(200).json({ success: true, hotels, total, page, limit });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error fetching hotels' });
  }
};

export const getAllBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, search } = req.query;

    const query = {};

    if (status) {
      query.bookingStatus = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');

      // 1. Find matching Users
      const users = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }]
      }).select('_id');
      const userIds = users.map(u => u._id);

      // 2. Find matching Properties
      const properties = await Property.find({ propertyName: searchRegex }).select('_id');
      const propertyIds = properties.map(p => p._id);

      // 3. Construct OR query
      const searchConditions = [
        { bookingId: searchRegex },
        { userId: { $in: userIds } },
        { propertyId: { $in: propertyIds } }
      ];

      // Merge with existing query
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    /*
     * The count does not inform the find, so they go out together; and the rows
     * are serialised straight to JSON, so they do not need to be full Mongoose
     * documents. Nothing here is saved back.
     */
    const [total, bookings] = await Promise.all([
      Booking.countDocuments(query),
      Booking.find(query)
        .populate('userId', 'name email phone')
        .populate('propertyId', 'propertyName address')
        .populate('roomTypeId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.status(200).json({ success: true, bookings, total, page, limit });
  } catch (e) {
    console.error('Get All Bookings Error:', e);
    res.status(500).json({ success: false, message: 'Server error fetching bookings' });
  }
};

export const getPropertyRequests = async (req, res) => {
  try {
    const hotels = await Property.find({ status: 'pending' })
      .populate('partnerId', 'name email phone')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, hotels });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error fetching property requests' });
  }
};

export const updateHotelStatus = async (req, res) => {
  try {
    const { propertyId, hotelId, status, isLive } = req.body;

    const id = propertyId || hotelId;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Property id is required' });
    }

    const update = {};
    if (status) {
      update.status = status;
      if (status === 'approved') {
        update.isLive = true;
      }
      if (status === 'rejected' || status === 'suspended' || status === 'draft') {
        update.isLive = false;
      }
    }

    if (typeof isLive === 'boolean') {
      update.isLive = isLive;
    }

    const hotel = await Property.findByIdAndUpdate(id, update, { new: true });
    if (!hotel) return res.status(404).json({ success: false, message: 'Property not found' });
    res.status(200).json({ success: true, hotel });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error updating hotel status' });
  }
};

export const verifyPropertyDocuments = async (req, res) => {
  try {
    const { propertyId, action, adminRemark } = req.body;
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    const docs = await PropertyDocument.findOne({ propertyId });
    if (!docs) return res.status(404).json({ success: false, message: 'Documents not found' });

    if (action === 'approve') {
      docs.verificationStatus = 'verified';
      docs.adminRemark = undefined;
      docs.verifiedAt = new Date();
      property.status = 'approved';
      property.isLive = true;

      // NOTIFICATION: Property Live
      notificationService.sendToUser(property.partnerId, {
        title: 'Property Live!',
        body: `Your property ${property.propertyName} is LIVE now!`
      }, { type: 'property_verified', propertyId: property._id }, 'partner').catch(e => console.error(e));

    } else if (action === 'reject') {
      docs.verificationStatus = 'rejected';
      docs.adminRemark = adminRemark;
      docs.verifiedAt = new Date();
      property.status = 'rejected';
      property.isLive = false;

      // Notify Rejection?
      notificationService.sendToUser(property.partnerId, {
        title: 'Property Documents Rejected',
        body: `Your property ${property.propertyName} documents were rejected. reason: ${adminRemark || 'Review needed'}`
      }, { type: 'property_rejected', propertyId: property._id }, 'partner').catch(e => console.error(e));

    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }
    await docs.save();
    await property.save();
    res.status(200).json({ success: true, property, documents: docs });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error verifying documents' });
  }
};

export const getReviewModeration = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;
    const total = await Review.countDocuments(query);
    const reviews = await Review.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    res.status(200).json({ success: true, reviews, total, page, limit });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error fetching reviews' });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.body;
    const review = await Review.findByIdAndDelete(reviewId);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    const agg = await Review.aggregate([
      { $match: { propertyId: review.propertyId, status: 'approved' } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    const stats = agg[0];
    if (stats) {
      await Property.findByIdAndUpdate(review.propertyId, { avgRating: stats.avg, totalReviews: stats.count });
    } else {
      await Property.findByIdAndUpdate(review.propertyId, { avgRating: 0, totalReviews: 0 });
    }
    res.status(200).json({ success: true, message: 'Review deleted successfully' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error deleting review' });
  }
};

export const updateReviewStatus = async (req, res) => {
  try {
    const { reviewId, status } = req.body;
    const review = await Review.findByIdAndUpdate(reviewId, { status }, { new: true });
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    const agg = await Review.aggregate([
      { $match: { propertyId: review.propertyId, status: 'approved' } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    const stats = agg[0];
    if (stats) {
      await Property.findByIdAndUpdate(review.propertyId, { avgRating: stats.avg, totalReviews: stats.count });
    } else {
      await Property.findByIdAndUpdate(review.propertyId, { avgRating: 0, totalReviews: 0 });
    }
    res.status(200).json({ success: true, message: `Review status updated to ${status}`, review });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error updating review status' });
  }
};

export const updatePartnerStatus = async (req, res) => {
  try {
    const { userId, isBlocked } = req.body;
    const partner = await Partner.findByIdAndUpdate(userId, { isBlocked }, { new: true });
    if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });
    res.status(200).json({ success: true, message: `Partner ${isBlocked ? 'blocked' : 'unblocked'} successfully`, partner });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating partner status' });
  }
};

export const deletePartner = async (req, res) => {
  try {
    const { userId } = req.body;
    const partner = await Partner.findByIdAndDelete(userId);
    if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });

    // Also consider deleting associated properties or marking them as suspended?
    // For now, just delete the partner. 
    // Ideally, we should check if they have active bookings/properties.

    res.status(200).json({ success: true, message: 'Partner deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error deleting partner' });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { userId, isBlocked } = req.body;
    const user = await User.findByIdAndUpdate(userId, { isBlocked }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating user status' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error deleting user' });
  }
};

export const deleteHotel = async (req, res) => {
  try {
    const { propertyId, hotelId } = req.body;
    const id = propertyId || hotelId;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Property id is required' });
    }

    const del = await Property.findByIdAndDelete(id);
    if (!del) return res.status(404).json({ success: false, message: 'Property not found' });

    await PropertyDocument.deleteMany({ propertyId: id });
    await RoomType.deleteMany({ propertyId: id });

    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error deleting property' });
  }
};

export const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId, status } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    booking.bookingStatus = status;
    await booking.save();

    if (status === 'cancelled') {
      await AvailabilityLedger.deleteMany({
        source: 'platform',
        referenceId: booking._id
      });
    }

    res.status(200).json({ success: true, booking });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error updating booking status' });
  }
};

export const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const bookings = await Booking.find({ userId: id })
      .populate('propertyId', 'propertyName name address')
      .sort({ createdAt: -1 })
      .lean();

    const wallet = await Wallet.findOne({ partnerId: id, role: 'user' });
    let walletTransactions = wallet
      ? await Transaction.find({ walletId: wallet._id }).sort({ createdAt: -1 }).lean()
      : [];

    const bookingTransactions = bookings
      .filter(b => ['paid', 'refunded', 'partial'].includes(b.paymentStatus))
      .map(b => ({
        _id: b._id,
        bookingId: b.bookingId,
        type: b.paymentStatus === 'refunded' ? 'credit' : 'debit',
        amount: b.totalAmount,
        description: `Booking: ${b.propertyId?.propertyName || b.propertyId?.name || 'Hotel Stay'}`,
        status: b.bookingStatus,
        paymentStatus: b.paymentStatus,
        isBooking: true,
        createdAt: b.createdAt
      }));

    const transactions = [...walletTransactions, ...bookingTransactions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ success: true, user, bookings, wallet, transactions });
  } catch (error) {
    console.error('Get User Details Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching user details' });
  }
};

export const getPartnerDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const partner = await Partner.findById(id);
    if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });

    const properties = await Property.find({ partnerId: id });
    res.status(200).json({ success: true, partner, properties });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching partner details' });
  }
};

export const getHotelDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.findById(id).populate('partnerId', 'name email phone');
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const roomTypes = await RoomType.find({ propertyId: id });
    const documents = await PropertyDocument.findOne({ propertyId: id });

    res.status(200).json({
      success: true,
      hotel: {
        ...property.toObject(),
        rooms: roomTypes
      },
      bookings: [],
      documents
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error fetching hotel details' });
  }
};

export const getBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id)
      .populate('userId', 'name email phone avatar')
      .populate('propertyId', 'propertyName name address location coverImage')
      .populate('roomTypeId', 'name type');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.status(200).json({ success: true, booking });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error fetching booking details' });
  }
};

export const updatePartnerApprovalStatus = async (req, res) => {
  try {
    const { userId, status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid partner approval status' });
    }
    const partner = await Partner.findById(userId);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }
    partner.partnerApprovalStatus = status;
    if (status === 'approved') {
      partner.isPartner = true;
      if (!partner.partnerSince) {
        partner.partnerSince = new Date();
      }

      // NOTIFICATION: Approved
      if (partner.email) emailService.sendPartnerApprovedEmail(partner).catch(e => console.error(e));
      notificationService.sendToUser(partner._id, {
        title: 'You are approved!',
        body: 'You are approved! Start listing your properties.'
      }, { type: 'partner_approved' }, 'partner').catch(e => console.error(e));

    } else if (status === 'rejected') { // Explicit 'rejected' check or else clause
      partner.isPartner = false;

      // NOTIFICATION: Rejected
      const reason = req.body.reason || 'Criteria not met';
      if (partner.email) emailService.sendPartnerRejectedEmail(partner, reason).catch(e => console.error(e));
      // Optionally push? Users can't login if rejected usually, or limited access.
    } else {
      partner.isPartner = false;
    }

    await partner.save();
    res.status(200).json({ success: true, message: `Partner status updated to ${status}`, partner });
  } catch (error) {
    console.error('Update Partner Status Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating partner approval status' });
  }
};

export const getLegalPages = async (req, res) => {
  try {
    const { audience } = req.query;
    const query = {};

    if (audience) {
      query.audience = audience;
    }

    const pages = await InfoPage.find(query).sort({ audience: 1, slug: 1 });

    res.status(200).json({ success: true, pages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching legal pages' });
  }
};

export const upsertLegalPage = async (req, res) => {
  try {
    const { audience, slug, title, content, isActive } = req.body;

    if (!['user', 'partner'].includes(audience)) {
      return res.status(400).json({ success: false, message: 'Invalid audience' });
    }

    if (!['terms', 'privacy', 'about', 'contact'].includes(slug)) {
      return res.status(400).json({ success: false, message: 'Invalid page type' });
    }

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const update = {
      audience,
      slug,
      title,
      content
    };

    if (typeof isActive === 'boolean') {
      update.isActive = isActive;
    }

    const page = await InfoPage.findOneAndUpdate(
      { audience, slug },
      update,
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, page });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error saving legal page' });
  }
};

export const getContactMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { audience, status } = req.query;

    const query = {};

    if (audience) {
      query.audience = audience;
    }

    if (status) {
      query.status = status;
    }

    const total = await ContactMessage.countDocuments(query);
    const messages = await ContactMessage.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({ success: true, messages, total, page, limit });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching contact messages' });
  }
};

export const updateContactStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['new', 'in_progress', 'resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const message = await ContactMessage.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    res.status(200).json({ success: true, message: 'Status updated successfully', contact: message });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating contact status' });
  }
};

export const getPlatformSettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    res.status(200).json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching platform settings' });
  }
};

export const updatePlatformSettings = async (req, res) => {
  try {
    const {
      platformOpen,
      maintenanceMode,
      bookingDisabledMessage,
      maintenanceTitle,
      maintenanceMessage,
      defaultCommission,
      taxRate,
    } = req.body;

    const settings = await PlatformSettings.getSettings();

    if (typeof platformOpen === 'boolean') settings.platformOpen = platformOpen;
    if (typeof maintenanceMode === 'boolean') settings.maintenanceMode = maintenanceMode;
    if (typeof bookingDisabledMessage === 'string') settings.bookingDisabledMessage = bookingDisabledMessage;
    if (typeof maintenanceTitle === 'string') settings.maintenanceTitle = maintenanceTitle;
    if (typeof maintenanceMessage === 'string') settings.maintenanceMessage = maintenanceMessage;

    if (defaultCommission !== undefined) settings.defaultCommission = Number(defaultCommission);
    if (taxRate !== undefined) settings.taxRate = Number(taxRate);

    await settings.save();
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Update platform settings error:', error);
    res.status(500).json({ success: false, message: 'Server error updating platform settings' });
  }
};


export const updateFcmToken = async (req, res) => {
  try {
    const { fcmToken, platform } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'Please provide FCM token'
      });
    }

    const targetPlatform = platform === 'app' ? 'app' : 'web';

    // We are in admin controller, assuming req.user is set by admin auth middleware
    // However, Admin model import might be needed if not present, but usually req.user is the document or plain object.
    // If req.user is populated from token, check if it's admin.

    // Checking where Admin is imported? Line 1: User.. 
    // Wait, Admin model is NOT imported in adminController based on view_file output. 
    // It seems admin controller uses User model a lot but where does it get Admin?
    const Admin = (await import('../models/Admin.js')).default;

    const admin = await Admin.findById(req.user._id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // The platform admin schema keeps tokens as arrays, split by surface:
    // `fcmTokens` is web, `fcmTokenMobile` is the app. Hotel used to write a
    // { app, web } object here, which does not survive an array field.
    const field = targetPlatform === 'app' ? 'fcmTokenMobile' : 'fcmTokens';
    const existing = Array.isArray(admin[field]) ? admin[field] : [];
    admin[field] = [...new Set([...existing, fcmToken])].filter(Boolean);

    await admin.save();

    res.json({
      success: true,
      message: `FCM token updated successfully for ${targetPlatform} platform`,
      data: {
        platform: targetPlatform,
        tokenUpdated: true
      }
    });

  } catch (error) {
    console.error('Update Admin FCM Token Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==========================================
// NOTIFICATION CONTROLLERS
// ==========================================

export const getAdminNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {
      userId: req.user._id,
      userType: 'admin'
    };

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ ...filter, isRead: false });

    res.status(200).json({
      success: true,
      notifications,
      meta: {
        total,
        page,
        limit,
        unreadCount
      }
    });
  } catch (error) {
    console.error('Get Admin Notifications Error:', error);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
};

export const createBroadcastNotification = async (req, res) => {
  try {
    const { title, body, targetAudience, type = 'general' } = req.body; // targetAudience: 'users', 'partners', 'all' || 'everyone'

    if (!title || !body || !targetAudience) {
      return res.status(400).json({ message: 'Title, Body and Target Audience are required' });
    }

    let recipients = [];

    // 1. Fetch Users
    if (targetAudience === 'users' || targetAudience === 'everyone' || targetAudience === 'all') {
      const users = await User.find({ isBlocked: { $ne: true } }).select('_id');
      recipients.push(...users.map(u => ({ id: u._id, type: 'user' })));
    }

    // 2. Fetch Partners
    if (targetAudience === 'partners' || targetAudience === 'everyone' || targetAudience === 'all') {
      // Typically approved partners only? Or all? Let's say all active ones.
      const partners = await Partner.find({ isBlocked: { $ne: true } }).select('_id');
      recipients.push(...partners.map(p => ({ id: p._id, type: 'partner' })));
    }

    if (recipients.length === 0) {
      return res.status(404).json({ message: 'No active recipients found for this audience' });
    }

    console.log(`Sending Broadcast: "${title}" to ${recipients.length} recipients.`);

    // 3. Send via Notification Service (Handles DB Save + FCM Push)
    // Using simple loop to avoid excessive parallel load if many recipients
    let sentCount = 0;

    // Helper function to process in chunks to avoid overwhelming the server/firebase
    const chunkSize = 50;
    for (let i = 0; i < recipients.length; i += chunkSize) {
      const chunk = recipients.slice(i, i + chunkSize);
      await Promise.all(chunk.map(async (recipient) => {
        try {
          await notificationService.sendToUser(
            recipient.id,
            { title, body },
            { type: 'broadcast', broadcastId: Date.now().toString() },
            recipient.type
          );
          sentCount++;
        } catch (err) {
          console.error(`Failed to send broadcast to ${recipient.type} ${recipient.id}:`, err);
        }
      }));
    }

    // 4. Log for Admin (Sent Tab)
    await Notification.create({
      userId: req.user._id,
      userType: 'admin',
      userModel: 'Admin', // Assuming Admin model handles this
      title: `Broadcast Sent: ${title}`,
      body: `Sent to ${targetAudience} (${sentCount}/${recipients.length} recipients). Content: ${body}`,
      type: 'broadcast_log',
      isRead: true,
      data: { originalTitle: title, originalBody: body, targetAudience, recipientCount: sentCount }
    });

    res.status(201).json({
      success: true,
      message: `Notification broadcasted to ${sentCount} recipients.`
    });

  } catch (error) {
    console.error('Create Broadcast Error:', error);
    res.status(500).json({ message: 'Server error sending broadcast' });
  }
};

export const markAllAdminNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, userType: 'admin', isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteAdminNotifications = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No IDs provided' });
    }

    await Notification.deleteMany({
      _id: { $in: ids },
      userId: req.user._id,
      userType: 'admin'
    });

    res.status(200).json({ success: true, message: 'Notifications deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getFinanceStats = async (req, res) => {
  try {


    // 2. Aggregate Booking Financials
    // Include:
    // 1. Paid bookings (Online/Wallet) -> Commission & Tax settled.
    // 2. Pay At Hotel bookings (Confirmed) -> Commission & Tax deducted from Partner Wallet upfront.
    const matchStage = {
      $or: [
        {
          paymentStatus: 'paid',
          bookingStatus: { $in: ['confirmed', 'checked_out', 'checked_in'] }
        },
        {
          paymentMethod: 'pay_at_hotel',
          bookingStatus: { $in: ['confirmed', 'checked_out', 'checked_in'] }
        }
      ]
    };

    /*
     * The totals and the transaction list read the same set with the same
     * filter and neither needs the other's result, so they go out together
     * rather than one after the next.
     */
    const [financialsOr, transactions] = await Promise.all([
      Booking.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalGross: { $sum: '$totalAmount' },
          totalCommission: { $sum: '$adminCommission' },
          totalTax: { $sum: '$taxes' },
          totalPayout: { $sum: '$partnerPayout' }
        }
      }
      ]),
      // Read-only, serialised straight to JSON.
      Booking.find(matchStage)
        .select('bookingId createdAt totalAmount adminCommission taxes partnerPayout bookingStatus paymentStatus userId propertyId')
        .populate('userId', 'name email')
        .populate({
          path: 'propertyId',
          select: 'propertyName partnerId',
          populate: { path: 'partnerId', select: 'name email' } // Get Partner Info
        })
        .sort({ createdAt: -1 })
        .limit(50) // Limit to last 50 for now
        .lean(),
    ]);

    const financials = financialsOr[0] || {
      totalGross: 0,
      totalCommission: 0,
      totalTax: 0,
      totalPayout: 0
    };

    // Correct Admin Balance: Sum of Commission + Taxes from all valid financial transactions
    const derivedAdminBalance = (financials.totalCommission || 0) + (financials.totalTax || 0);

    res.status(200).json({
      success: true,
      stats: {
        adminBalance: derivedAdminBalance, // Derived from transactions
        totalRevenue: financials.totalGross, // Total Booking Value
        totalEarnings: financials.totalCommission, // Actual Platform Income
        totalTax: financials.totalTax,
        totalPayouts: financials.totalPayout
      },
      transactions
    });

  } catch (error) {
    console.error('Get Finance Stats Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching finance stats' });
  }
};

/* ------------------------------------------------------------------ *
 * Settlement
 *
 * A partner's withdrawal request debits their wallet straight away and
 * lands here as `pending`. Payouts are settled by hand (the automated
 * RazorpayX path is optional and often unconfigured), so an admin has to
 * be able to move a request through processing to completed — or fail it,
 * which puts the money back in the partner's wallet.
 * ------------------------------------------------------------------ */

/** Terminal states must not be re-opened; a paid-out request cannot be un-paid. */
const WITHDRAWAL_TRANSITIONS = {
  pending: ['processing', 'completed', 'failed', 'cancelled'],
  processing: ['completed', 'failed'],
  completed: [],
  failed: [],
  cancelled: [],
};

/** Failing or cancelling a request returns the money the wallet already gave up. */
const REFUNDING_STATUSES = ['failed', 'cancelled'];

export const getWithdrawals = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const { status, search } = req.query;

    const query = {};
    if (status && status !== 'all') query.status = status;

    if (search) {
      const regex = searchRegex(search);
      const partners = await Partner.find({
        $or: [{ name: regex }, { phone: regex }, { email: regex }],
      }).select('_id');
      query.$or = [
        { withdrawalId: regex },
        { partnerId: { $in: partners.map((p) => p._id) } },
      ];
    }

    const [items, total, totals] = await Promise.all([
      Withdrawal.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Withdrawal.countDocuments(query),
      Withdrawal.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
      ]),
    ]);

    // Withdrawal.partnerId is declared `ref: 'User'`, but a hotel partner is a
    // Partner document in a different collection, so populate() silently
    // returned nothing. Resolve across both rather than change a ref other code
    // may depend on.
    const requesterIds = items.map((w) => w.partnerId).filter(Boolean);
    const [partnerDocs, userDocs] = await Promise.all([
      Partner.find({ _id: { $in: requesterIds } }).select('name phone email').lean(),
      User.find({ _id: { $in: requesterIds } }).select('name phone email').lean(),
    ]);
    const requesterById = new Map(
      [...userDocs, ...partnerDocs].map((doc) => [String(doc._id), doc]),
    );

    res.json({
      success: true,
      withdrawals: items.map((w) => ({
        ...w,
        partner: requesterById.get(String(w.partnerId)) || null,
      })),
      page,
      limit,
      total,
      hasMore: page * limit < total,
      summary: totals.reduce((acc, row) => {
        acc[row._id] = { count: row.count, amount: row.amount };
        return acc;
      }, {}),
    });
  } catch (error) {
    console.error('Get Withdrawals Error:', error);
    res.status(500).json({ success: false, message: 'Failed to load withdrawals' });
  }
};

export const updateWithdrawalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, utrNumber, remarks } = req.body;

    const withdrawal = await Withdrawal.findById(id);
    if (!withdrawal) return res.status(404).json({ success: false, message: 'Withdrawal not found' });

    const allowed = WITHDRAWAL_TRANSITIONS[withdrawal.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot move a ${withdrawal.status} withdrawal to ${status}.`,
      });
    }

    if (status === 'completed' && !String(utrNumber || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'A bank reference (UTR) is required to mark a payout completed.',
      });
    }

    const now = new Date();
    withdrawal.status = status;
    withdrawal.processingDetails = withdrawal.processingDetails || {};
    if (remarks) withdrawal.processingDetails.remarks = remarks;
    if (utrNumber) withdrawal.processingDetails.utrNumber = String(utrNumber).trim();
    if (status === 'processing') withdrawal.processingDetails.processedAt = now;
    if (status === 'completed') withdrawal.processingDetails.completedAt = now;
    if (REFUNDING_STATUSES.includes(status)) withdrawal.processingDetails.failedAt = now;

    // The wallet was debited when the request was raised, so a payout that
    // never happened has to be credited back before the request is closed.
    if (REFUNDING_STATUSES.includes(status)) {
      const wallet = await Wallet.findById(withdrawal.walletId);
      if (wallet) {
        wallet.balance += withdrawal.amount;
        wallet.totalWithdrawals = Math.max(0, (wallet.totalWithdrawals || 0) - withdrawal.amount);
        await wallet.save();

        await Transaction.create({
          walletId: wallet._id,
          partnerId: withdrawal.partnerId,
          modelType: 'Partner',
          type: 'credit',
          category: 'refund',
          amount: withdrawal.amount,
          balanceAfter: wallet.balance,
          description: `Withdrawal ${withdrawal.withdrawalId} ${status} — amount returned`,
          reference: withdrawal.withdrawalId,
          status: 'completed',
          metadata: { withdrawalId: withdrawal.withdrawalId, reason: remarks || status },
        });
      }
    }

    if (withdrawal.transactionId) {
      await Transaction.findByIdAndUpdate(withdrawal.transactionId, {
        status: status === 'completed' ? 'completed' : REFUNDING_STATUSES.includes(status) ? 'failed' : 'pending',
      });
    }

    await withdrawal.save();

    notificationService
      .sendToUser(
        withdrawal.partnerId,
        {
          title: 'Payout update',
          body:
            status === 'completed'
              ? `₹${withdrawal.amount} has been paid out (ref ${withdrawal.processingDetails.utrNumber}).`
              : `Your withdrawal ${withdrawal.withdrawalId} is now ${status}.`,
        },
        { type: 'withdrawal_update', withdrawalId: String(withdrawal._id) },
        'partner',
      )
      .catch((err) => console.error('Withdrawal notification failed:', err));

    res.json({ success: true, withdrawal });
  } catch (error) {
    console.error('Update Withdrawal Status Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update withdrawal' });
  }
};

/* ------------------------------------------------------------------ *
 * Room categories, pricing and availability
 *
 * The scope of work puts these under the admin panel as well as the
 * partner panel, so support can correct a rate or free up inventory
 * without asking the partner to log in.
 * ------------------------------------------------------------------ */

export const getPropertyRoomTypes = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.findById(id).select('propertyName propertyType partnerId');
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const roomTypes = await RoomType.find({ propertyId: id }).sort({ createdAt: 1 }).lean();
    res.json({ success: true, property, roomTypes });
  } catch (error) {
    console.error('Get Property Room Types Error:', error);
    res.status(500).json({ success: false, message: 'Failed to load room types' });
  }
};

export const updateRoomTypeAsAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const roomType = await RoomType.findById(id);
    if (!roomType) return res.status(404).json({ success: false, message: 'Room type not found' });

    const { pricePerNight, totalInventory, isActive, seasonalRates, extraAdultPrice, extraChildPrice } = req.body;

    if (pricePerNight !== undefined) {
      const value = Number(pricePerNight);
      if (!Number.isFinite(value) || value < 0) {
        return res.status(400).json({ success: false, message: 'pricePerNight must be 0 or more' });
      }
      roomType.pricePerNight = value;
    }

    if (totalInventory !== undefined) {
      const value = Number(totalInventory);
      if (!Number.isInteger(value) || value < 0) {
        return res.status(400).json({ success: false, message: 'totalInventory must be a whole number' });
      }
      roomType.totalInventory = value;
    }

    if (extraAdultPrice !== undefined) roomType.extraAdultPrice = Number(extraAdultPrice) || 0;
    if (extraChildPrice !== undefined) roomType.extraChildPrice = Number(extraChildPrice) || 0;
    if (typeof isActive === 'boolean') roomType.isActive = isActive;

    if (seasonalRates !== undefined) {
      if (!Array.isArray(seasonalRates)) {
        return res.status(400).json({ success: false, message: 'seasonalRates must be a list' });
      }
      for (const season of seasonalRates) {
        const start = new Date(season?.startDate);
        const end = new Date(season?.endDate);
        if (!String(season?.name || '').trim() || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          return res.status(400).json({ success: false, message: 'Each season needs a name, a start date and an end date' });
        }
        if (end < start) {
          return res.status(400).json({ success: false, message: `Season "${season.name}" ends before it starts` });
        }
      }
      roomType.seasonalRates = seasonalRates;
    }

    await roomType.save();
    res.json({ success: true, roomType });
  } catch (error) {
    console.error('Update Room Type (admin) Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update room type' });
  }
};

/**
 * Occupancy for a property over a window, per room type and per day.
 *
 * The ledger stores date *ranges*, so a booking spanning a week is one row.
 * Expanding to days here is what makes a calendar view possible without the
 * client re-implementing the overlap arithmetic.
 */
export const getPropertyAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.findById(id).select('propertyName');
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const from = req.query.from ? new Date(req.query.from) : new Date();
    const to = req.query.to
      ? new Date(req.query.to)
      : new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
      return res.status(400).json({ success: false, message: 'Invalid from/to range' });
    }

    const [roomTypes, entries] = await Promise.all([
      RoomType.find({ propertyId: id }).select('name totalInventory isActive').lean(),
      AvailabilityLedger.find({
        propertyId: id,
        startDate: { $lt: to },
        endDate: { $gt: from },
      }).lean(),
    ]);

    const dayMs = 24 * 60 * 60 * 1000;
    const utcDay = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const windowStart = utcDay(from);
    const windowEnd = utcDay(to);

    const calendar = roomTypes.map((roomType) => {
      const days = [];
      for (let t = windowStart; t < windowEnd; t += dayMs) {
        const blocked = entries
          .filter((entry) => {
            if (String(entry.roomTypeId || '') !== String(roomType._id)) return false;
            return utcDay(new Date(entry.startDate)) <= t && utcDay(new Date(entry.endDate)) > t;
          })
          .reduce((sum, entry) => sum + (entry.units || 0), 0);

        days.push({
          date: new Date(t),
          blocked,
          available: Math.max(0, (roomType.totalInventory || 0) - blocked),
        });
      }
      return { roomTypeId: roomType._id, name: roomType.name, totalInventory: roomType.totalInventory, isActive: roomType.isActive, days };
    });

    res.json({ success: true, property, range: { from, to }, calendar });
  } catch (error) {
    console.error('Get Property Availability Error:', error);
    res.status(500).json({ success: false, message: 'Failed to load availability' });
  }
};

/**
 * @route PATCH /v1/hotel/admin/wallets/:walletId/bank-details/verify
 *
 * Confirm a partner's payout account, or withdraw that confirmation.
 *
 * Bank details used to be stored already marked verified, which made the flag
 * meaningless — it recorded that nobody had checked. A partner's withdrawals
 * now wait for this, and changing the account resets it, so the confirmation
 * always applies to the account the money would actually reach.
 */
export const verifyWalletBankDetails = async (req, res) => {
  try {
    const wallet = await Wallet.findById(req.params.walletId);
    if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });

    if (!wallet.bankDetails?.accountNumber) {
      return res.status(400).json({ success: false, message: 'This wallet has no bank details to verify' });
    }

    const verified = req.body.verified !== false;
    wallet.bankDetails.verified = verified;
    wallet.bankDetails.verifiedAt = verified ? new Date() : null;
    wallet.bankDetails.verifiedBy = verified ? req.user._id : null;
    await wallet.save();

    res.json({
      success: true,
      message: verified ? 'Bank details verified' : 'Verification withdrawn',
      bankDetails: wallet.bankDetails,
    });
  } catch (error) {
    console.error('Verify Bank Details Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update verification' });
  }
};

/**
 * @route GET /v1/hotel/admin/wallets/pending-verification
 * Partners waiting on someone to confirm their payout account.
 */
export const getWalletsPendingVerification = async (_req, res) => {
  try {
    const wallets = await Wallet.find({
      'bankDetails.accountNumber': { $exists: true, $ne: '' },
      'bankDetails.verified': { $ne: true },
    })
      .populate('partnerId', 'name phone email agencyName')
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ success: true, wallets, total: wallets.length });
  } catch (error) {
    console.error('Pending Verification Error:', error);
    res.status(500).json({ success: false, message: 'Failed to load pending verifications' });
  }
};
