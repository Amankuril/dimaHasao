import User from '../models/User.js';
import Partner from '../models/Partner.js';
import InfoPage from '../models/InfoPage.js';
import ContactMessage from '../models/ContactMessage.js';
import PlatformSettings from '../models/PlatformSettings.js';
import { validateReelDurationTiers, validateRolePricingPayload } from '../utils/reelDurationPricing.js';
import ReelDurationPayment from '../models/ReelDurationPayment.js';
import Property from '../models/Property.js';
import RoomType from '../models/RoomType.js';
import Booking from '../models/Booking.js';
import PropertyDocument from '../models/PropertyDocument.js';
import Review from '../models/Review.js';
import AvailabilityLedger from '../models/AvailabilityLedger.js';
import Notification from '../models/Notification.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import emailService from '../services/emailService.js';
import notificationService from '../services/notificationService.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import Reel from '../models/Reel.js';



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

    // 1. KPI Counts & Trends
    const [
      totalUsers, usersLastMonth,
      totalPartners,
      totalHotels,
      pendingHotels,
      totalBookings, bookingsLastMonth,
      currentRevenueData, lastMonthRevenueData
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ createdAt: { $lt: startOfThisMonth } }), // Approximation for trend base
      Partner.countDocuments({}),
      Property.countDocuments({}),
      Property.countDocuments({ status: 'pending' }),
      Booking.countDocuments({}),
      Booking.countDocuments({ createdAt: { $lt: startOfThisMonth } }), // trend base
      Booking.aggregate([
        { $match: { bookingStatus: { $in: ['confirmed', 'checked_out', 'checked_in'] }, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Booking.aggregate([ // Revenue before this month
        {
          $match: {
            bookingStatus: { $in: ['confirmed', 'checked_out', 'checked_in'] },
            paymentStatus: 'paid',
            createdAt: { $lt: startOfThisMonth }
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    const totalRevenue = currentRevenueData[0]?.total || 0;
    const prevRevenue = lastMonthRevenueData[0]?.total || 0;

    // Calculate trends (Simple approx based on total vs total-this-month isn't perfect for "vs last month", 
    // but better: Calculate created in THIS month vs created in LAST month)

    const usersNewThisMonth = await User.countDocuments({ createdAt: { $gte: startOfThisMonth } });
    const usersNewLastMonth = await User.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } });

    const bookingsThisMonth = await Booking.countDocuments({ createdAt: { $gte: startOfThisMonth } });
    const bookingsLastMonthCount = await Booking.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } });

    // Revenue This Month vs Last Month
    const revThisMonthAgg = await Booking.aggregate([
      {
        $match: {
          bookingStatus: { $in: ['confirmed', 'checked_out', 'checked_in'] },
          paymentStatus: 'paid',
          createdAt: { $gte: startOfThisMonth }
        }
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const revLastMonthAgg = await Booking.aggregate([
      {
        $match: {
          bookingStatus: { $in: ['confirmed', 'checked_out', 'checked_in'] },
          paymentStatus: 'paid',
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        }
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const incomeThisMonth = revThisMonthAgg[0]?.total || 0;
    const incomeLastMonth = revLastMonthAgg[0]?.total || 0;

    const trends = {
      users: calculateGrowth(usersNewThisMonth, usersNewLastMonth),
      bookings: calculateGrowth(bookingsThisMonth, bookingsLastMonthCount),
      revenue: calculateGrowth(incomeThisMonth, incomeLastMonth)
    };

    // --- SUBSCRIPTION REVENUE TRACKING ---
    // Calculate total subscription revenue from all active subscriptions
    const subscriptionStats = await Partner.aggregate([
      {
        $match: {
          'subscription.status': 'active',
          'subscription.planId': { $exists: true }
        }
      },
      {
        $lookup: {
          from: 'subscriptionplans',
          localField: 'subscription.planId',
          foreignField: '_id',
          as: 'planDetails'
        }
      },
      {
        $unwind: '$planDetails'
      },
      {
        $group: {
          _id: '$subscription.planId',
          planName: { $first: '$planDetails.name' },
          planPrice: { $first: '$planDetails.price' },
          subscriberCount: { $sum: 1 },
          totalRevenue: { $sum: '$planDetails.price' }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      }
    ]);

    const totalSubscriptionRevenue = subscriptionStats.reduce((sum, stat) => sum + stat.totalRevenue, 0);
    const totalActiveSubscribers = subscriptionStats.reduce((sum, stat) => sum + stat.subscriberCount, 0);

    // 2. Charts Data

    // Revenue Chart (Last 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyRevenue = await Booking.aggregate([
      {
        $match: {
          bookingStatus: { $in: ['confirmed', 'checked_out', 'checked_in'] },
          paymentStatus: 'paid',
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          amount: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Booking Status Distribution
    const bookingStatusStats = await Booking.aggregate([
      { $group: { _id: "$bookingStatus", count: { $sum: 1 } } }
    ]);

    // Format for frontend
    const revenueChart = monthlyRevenue.map(item => {
      const [year, month] = item._id.split('-');
      const date = new Date(year, month - 1);
      return {
        name: date.toLocaleString('default', { month: 'short' }),
        value: item.amount
      };
    });

    const statusChart = bookingStatusStats.map(item => ({
      name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
      value: item.count
    }));

    // 3. Lists
    const recentBookings = await Booking.find()
      .populate('userId', 'name email')
      .populate('propertyId', 'propertyName address')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentPropertyRequests = await Property.find({ status: 'pending' })
      .populate('partnerId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalPartners,
        totalHotels,
        pendingHotels,
        totalBookings,
        totalRevenue,
        totalSubscriptionRevenue,
        totalActiveSubscribers,
        trends
      },
      charts: {
        revenue: revenueChart,
        status: statusChart
      },
      subscriptionRevenue: {
        total: totalSubscriptionRevenue,
        activeSubscribers: totalActiveSubscribers,
        planBreakdown: subscriptionStats
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

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

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

    const total = await Partner.countDocuments(query);
    const partners = await Partner.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

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

    const total = await Property.countDocuments(query);

    const hotels = await Property.find(query)
      .populate('partnerId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

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

    const total = await Booking.countDocuments(query);
    const bookings = await Booking.find(query)
      .populate('userId', 'name email phone')
      .populate('propertyId', 'propertyName address')
      .populate('roomTypeId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

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
      reelCouponTarget,
      reelCouponDiscount,
      reelFreeDurationSec,
      reelMaxDurationSec,
      reelPaidDurationEnabled,
      reelDurationTiers,
      reelPricing,
    } = req.body;

    const settings = await PlatformSettings.getSettings();

    if (typeof platformOpen === 'boolean') settings.platformOpen = platformOpen;
    if (typeof maintenanceMode === 'boolean') settings.maintenanceMode = maintenanceMode;
    if (typeof bookingDisabledMessage === 'string') settings.bookingDisabledMessage = bookingDisabledMessage;
    if (typeof maintenanceTitle === 'string') settings.maintenanceTitle = maintenanceTitle;
    if (typeof maintenanceMessage === 'string') settings.maintenanceMessage = maintenanceMessage;

    if (defaultCommission !== undefined) settings.defaultCommission = Number(defaultCommission);
    if (taxRate !== undefined) settings.taxRate = Number(taxRate);
    if (reelCouponTarget !== undefined) settings.reelCouponTarget = Number(reelCouponTarget);
    if (reelCouponDiscount !== undefined) settings.reelCouponDiscount = Number(reelCouponDiscount);

    // Role-based Reel pricing (Users vs Vendors/Partners)
    if (reelPricing && typeof reelPricing === 'object') {
      if (!settings.reelPricing) settings.reelPricing = {};

      if (reelPricing.user) {
        const userVal = validateRolePricingPayload('user', reelPricing.user);
        if (!userVal.valid) {
          return res.status(400).json({ success: false, message: userVal.message });
        }
        settings.reelPricing.user = userVal.config;
        // Keep legacy fields in sync with User config for older readers
        settings.reelFreeDurationSec = userVal.config.freeDurationSec;
        settings.reelMaxDurationSec = userVal.config.maxDurationSec;
        settings.reelPaidDurationEnabled = userVal.config.paidDurationEnabled;
        settings.reelDurationTiers = userVal.config.durationTiers;
      }

      if (reelPricing.vendor) {
        const vendorVal = validateRolePricingPayload('vendor', reelPricing.vendor);
        if (!vendorVal.valid) {
          return res.status(400).json({ success: false, message: vendorVal.message });
        }
        settings.reelPricing.vendor = vendorVal.config;
      }

      settings.markModified('reelPricing');
    } else {
      // Legacy single-config payload still supported
      const nextFree =
        reelFreeDurationSec !== undefined
          ? Number(reelFreeDurationSec)
          : Number(settings.reelFreeDurationSec);
      const nextMax =
        reelMaxDurationSec !== undefined
          ? Number(reelMaxDurationSec)
          : Number(settings.reelMaxDurationSec);
      const nextTiers =
        reelDurationTiers !== undefined ? reelDurationTiers : settings.reelDurationTiers || [];

      if (
        reelFreeDurationSec !== undefined ||
        reelMaxDurationSec !== undefined ||
        reelDurationTiers !== undefined
      ) {
        const validation = validateReelDurationTiers(nextTiers, nextFree, nextMax);
        if (!validation.valid) {
          return res.status(400).json({ success: false, message: validation.message });
        }
        settings.reelFreeDurationSec = nextFree;
        settings.reelMaxDurationSec = nextMax;
        settings.reelDurationTiers = validation.tiers;
        if (!settings.reelPricing) settings.reelPricing = {};
        if (!settings.reelPricing.user) settings.reelPricing.user = {};
        settings.reelPricing.user.freeDurationSec = nextFree;
        settings.reelPricing.user.maxDurationSec = nextMax;
        settings.reelPricing.user.durationTiers = validation.tiers;
      }

      if (typeof reelPaidDurationEnabled === 'boolean') {
        settings.reelPaidDurationEnabled = reelPaidDurationEnabled;
        if (!settings.reelPricing) settings.reelPricing = {};
        if (!settings.reelPricing.user) settings.reelPricing.user = {};
        settings.reelPricing.user.paidDurationEnabled = reelPaidDurationEnabled;
      }
    }

    await settings.save();
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Update platform settings error:', error);
    res.status(500).json({ success: false, message: 'Server error updating platform settings' });
  }
};

/**
 * GET /api/admin/reel-duration-payments
 * Admin history of Reel duration surcharge payments
 */
export const getReelDurationPayments = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const status = req.query.status;

    const query = {};
    if (status && status !== 'all') query.paymentStatus = status;
    if (req.query.uploaderType === 'user' || req.query.uploaderType === 'vendor') {
      query.uploaderType = req.query.uploaderType;
    }

    const [items, total] = await Promise.all([
      ReelDurationPayment.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user', 'name phone email profileImage')
        .populate('reel', 'caption thumbnailUrl videoUrl durationSec category')
        .lean(),
      ReelDurationPayment.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      payments: items,
      page,
      limit,
      total,
      hasMore: page * limit < total,
    });
  } catch (error) {
    console.error('Get reel duration payments error:', error);
    res.status(500).json({ success: false, message: 'Failed to load reel duration payments' });
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
    // Oh, adminController functions usually don't manipulate Admin self profile except maybe unrelated?
    // I need to import Admin model if I want to update Admin's token.

    // The previous view_file of adminController didn't show Admin import. I should add it.

    // But first, let's write the function logic assuming I will fix imports.
    const Admin = (await import('../models/Admin.js')).default;

    const admin = await Admin.findById(req.user._id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Initialize fcmTokens object if it doesn't exist
    if (!admin.fcmTokens) {
      admin.fcmTokens = { app: null, web: null };
    }

    // Update the specific platform token
    admin.fcmTokens[targetPlatform] = fcmToken;

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

    const financialsOr = await Booking.aggregate([
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
    ]);

    const financials = financialsOr[0] || {
      totalGross: 0,
      totalCommission: 0,
      totalTax: 0,
      totalPayout: 0
    };

    // 3. Fetch Transaction List (Bookings Breakdown)
    const transactions = await Booking.find(matchStage)
      .select('bookingId createdAt totalAmount adminCommission taxes partnerPayout bookingStatus paymentStatus userId propertyId')
      .populate('userId', 'name email')
      .populate({
        path: 'propertyId',
        select: 'propertyName partnerId',
        populate: { path: 'partnerId', select: 'name email' } // Get Partner Info
      })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to last 50 for now

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

export const getReelAnalysis = async (req, res) => {
  try {
    const totalReels = await Reel.countDocuments();

    const userStats = await Reel.aggregate([
      {
        $group: {
          _id: '$user',
          reelCount: { $sum: 1 },
          totalLikes: { $sum: '$likesCount' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: '$userDetails'
      },
      {
        $project: {
          _id: 1,
          userName: '$userDetails.name',
          userPhone: '$userDetails.phone',
          reelCount: 1,
          totalLikes: 1
        }
      },
      {
        $sort: { reelCount: -1 }
      }
    ]);

    const settings = await PlatformSettings.getSettings();

    res.status(200).json({
      success: true,
      totalReels,
      userStats,
      settings: {
        reelCouponTarget: settings.reelCouponTarget,
        reelCouponDiscount: settings.reelCouponDiscount
      }
    });
  } catch (error) {
    console.error('Get Reel Analysis Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching reel analysis' });
  }
};

/**
 * GET /api/admin/reels
 * Admin fetch all reels with status/featured filter
 */
export const getAdminReels = async (req, res) => {
  try {
    const { status, isFeatured, search, limit = 50, page = 1 } = req.query;
    let query = {};

    if (status && status !== 'all') query.status = status;
    if (isFeatured !== undefined && isFeatured !== '') query.isFeatured = isFeatured === 'true';

    if (search) {
      query.caption = { $regex: search, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reels, total] = await Promise.all([
      Reel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('user', 'name phone email profileImage role')
        .populate('property', 'propertyName propertyType address coverImage')
        .lean(),
      Reel.countDocuments(query),
    ]);

    res.json({
      success: true,
      reels,
      total,
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('Get Admin Reels Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin reels' });
  }
};

/**
 * PATCH /api/admin/reels/:id/status
 * Admin update status (pending, published, rejected, blocked)
 */
export const updateReelStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['pending', 'published', 'rejected', 'blocked'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const reel = await Reel.findByIdAndUpdate(
      id,
      { status, publishedAt: status === 'published' ? new Date() : undefined },
      { new: true }
    );

    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

    res.json({ success: true, reel, message: `Reel status updated to ${status}` });
  } catch (error) {
    console.error('Update Reel Status Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update reel status' });
  }
};

/**
 * PATCH /api/admin/reels/:id/feature
 * Admin toggle isFeatured boolean
 */
export const toggleFeatureReel = async (req, res) => {
  try {
    const { id } = req.params;
    const reel = await Reel.findById(id);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

    reel.isFeatured = !reel.isFeatured;
    await reel.save();

    res.json({
      success: true,
      isFeatured: reel.isFeatured,
      message: `Reel ${reel.isFeatured ? 'featured' : 'unfeatured'} successfully`,
    });
  } catch (error) {
    console.error('Toggle Feature Reel Error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle reel featured status' });
  }
};
