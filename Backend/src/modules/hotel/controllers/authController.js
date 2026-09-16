import emailService from '../services/emailService.js';
import notificationService from '../services/notificationService.js';
import Admin, { findPlatformAdmins } from '../models/Admin.js';
import User from '../models/User.js';
import Partner from '../models/Partner.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// Aliased: this module exports its own `verifyOtp` HTTP controller.
import {
  createOrUpdateOtp,
  verifyOtp as verifyOtpCode,
  peekOtpMetadata,
} from '../../../core/otp/otp.service.js';
import referralService from '../services/referralService.js';
import { uploadToCloudinary, deleteFromCloudinary, uploadBase64ToCloudinary } from '../utils/cloudinary.js';

/** Hotel's namespace in the shared OTP store (6-digit, 10-minute codes). */
const OTP_SCOPE = 'hotel';

// Signed with the platform's canonical secret (this module arrived using
// JWT_SECRET, which this deployment does not define). The hotel auth middleware
// accepts tokens from either secret, so platform and partner sessions coexist.
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: '30d',
  });
};

export const sendOtp = async (req, res) => {
  try {
    const { phone, type, role = 'user' } = req.body; // type: 'login' or 'register'

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    let user;
    const isPartnerRole = ['partner', 'broker', 'agent', 'seller'].includes(role);
    let Model = isPartnerRole ? Partner : User;

    // FOR LOGIN: Check if user exists BEFORE sending OTP
    if (type === 'login') {
      user = await Model.findOne({ phone });
      if (!user) {
        // User doesn't exist - don't send OTP
        if (isPartnerRole) {
          return res.status(404).json({ message: 'Partner / Broker account not found. Please register first.' });
        }
        return res.status(404).json({
          message: 'Account not found. Please create an account first.',
          requiresRegistration: true
        });
      }
    }

    // FOR REGISTER: Check if user already exists
    if (type === 'register') {
      user = await Model.findOne({ phone });
      if (user) {
        return res.status(409).json({
          message: 'Account already exists. Please login instead.',
          requiresLogin: true
        });
      }
    }

    // OTP generation, storage, rate limiting and SMS delivery all live in
    // core/otp under the 'hotel' scope (6-digit, 10-minute codes). The pending
    // role/type rides along as metadata until the code is verified.
    //
    // This replaces a hardcoded test-number list plus `role === 'user'`, which
    // together meant every hotel customer received the fixed code 123456 — in
    // production. Static codes are now governed by the same USE_DEFAULT_OTP /
    // DEFAULT_TEST_PHONE settings the rest of the app uses.
    await createOrUpdateOtp(phone, OTP_SCOPE, { metadata: { role, type } });

    res.status(200).json({
      message: 'OTP sent successfully',
      expiresIn: 600 // 10 minutes in seconds
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ message: 'Server error sending OTP' });
  }
};

export const registerPartner = async (req, res) => {
  try {
    const {
      full_name,
      email,
      phone,
      owner_name,
      aadhaar_number,
      aadhaar_front,
      aadhaar_back,
      pan_number,
      pan_card_image,
      owner_address,
      termsAccepted
    } = req.body;

    // Extract URLs if fields are objects (for backward and forward compatibility)
    const getUrl = (val) => (val && typeof val === 'object' ? val.url : val);

    const aadhaarFrontUrl = getUrl(aadhaar_front);
    const aadhaarBackUrl = getUrl(aadhaar_back);
    const panImageUrl = getUrl(pan_card_image);

    // Validation
    if (!full_name || !email || !phone) {
      return res.status(400).json({ message: 'Name, email, and phone are required' });
    }

    if (!owner_name || !aadhaar_number || !aadhaarFrontUrl || !aadhaarBackUrl) {
      return res.status(400).json({ message: 'Owner details and Aadhaar documents are required' });
    }

    if (!pan_number || !panImageUrl) {
      return res.status(400).json({ message: 'PAN details are required' });
    }

    if (!owner_address || !owner_address.street || !owner_address.city || !owner_address.state || !owner_address.zipCode) {
      return res.status(400).json({ message: 'Complete address is required' });
    }

    if (!termsAccepted) {
      return res.status(400).json({ message: 'You must accept terms and conditions' });
    }

    // Check if partner already exists
    const existingPartner = await Partner.findOne({ $or: [{ email }, { phone }] });
    if (existingPartner) {
      return res.status(409).json({ message: 'Partner with this email or phone already exists' });
    }

    // Generate random password for partner (they'll login via OTP)
    const randomPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    // Create Partner directly with pending approval
    const newPartner = new Partner({
      name: full_name,
      email,
      phone,
      password: passwordHash,
      role: 'partner',
      isPartner: true,
      partnerApprovalStatus: 'pending',
      isVerified: false,
      ownerName: owner_name,
      aadhaarNumber: aadhaar_number,
      aadhaarFront: aadhaarFrontUrl,
      aadhaarBack: aadhaarBackUrl,
      panNumber: pan_number,
      panCardImage: panImageUrl,
      address: {
        street: owner_address.street,
        city: owner_address.city,
        state: owner_address.state,
        zipCode: owner_address.zipCode,
        country: owner_address.country || 'India',
        coordinates: owner_address.coordinates || {}
      },
      termsAccepted
    });

    await newPartner.save();

    // Send notification to admins
    const admins = await findPlatformAdmins();
    for (const admin of admins) {
      notificationService.sendToUser(
        admin._id,
        {
          title: 'New Partner Registration',
          body: `${full_name} has registered as a partner and is pending approval.`
        },
        { type: 'partner_registration', partnerId: newPartner._id },
        'admin'
      ).catch(err => console.error('Failed to notify admin:', err));
    }

    // Send welcome email to partner
    if (email) {
      emailService.sendPartnerRegistrationEmail(newPartner).catch(err =>
        console.error('Failed to send partner registration email:', err)
      );
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Your account is pending admin approval. You can login once approved.',
      partner: {
        id: newPartner._id,
        name: newPartner.name,
        email: newPartner.email,
        phone: newPartner.phone,
        partnerApprovalStatus: newPartner.partnerApprovalStatus
      }
    });

  } catch (error) {
    console.error('Register Partner Error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Email or Phone already exists' });
    }
    res.status(500).json({ message: 'Server error during registration' });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    // ... (existing verification logic)
    const { phone, otp, name, email, role = 'user', referralCode } = req.body;

    // ... (logic to verify OTP)
    // Select Model based on Role
    let Model = role === 'partner' ? Partner : User;

    // 1. Check if it's an existing user (Login Flow)
    let user = await Model.findOne({ phone });
    let isRegistration = false;

    if (user && user.isBlocked) {
      return res.status(403).json({
        message: 'Your account has been blocked by admin. Please contact support.',
        isBlocked: true
      });
    }

    // Read the pending role/type before consuming the code, then verify once.
    const pending = await peekOtpMetadata(phone, OTP_SCOPE);

    if (pending?.role && pending.role !== role) {
      return res.status(400).json({ message: 'Invalid role context.' });
    }

    const otpResult = await verifyOtpCode(phone, String(otp || '').trim(), OTP_SCOPE);

    if (!otpResult.valid) {
      const status = otpResult.reason === 'OTP expired' ? 400 : 400;
      return res.status(status).json({
        message:
          otpResult.reason === 'OTP expired'
            ? 'OTP has expired'
            : otpResult.reason === 'OTP not found'
              ? 'Invalid request or OTP expired. Please request OTP again.'
              : 'Invalid OTP'
      });
    }

    if (!user) {
      if (role === 'partner') {
        return res.status(404).json({ message: 'Partner not found. Please use partner registration.' });
      }

      // A login attempt against a number with no account.
      if (pending?.type === 'login') {
        return res.status(404).json({
          message: 'Account not found. Please create an account first.',
          requiresRegistration: true
        });
      }

      // REGISTRATION FLOW - Name is required
      if (!name) {
        return res.status(400).json({ message: 'Name is required for registration.' });
      }
      if (email) {
        const emailExists = await Model.findOne({ email });
        if (emailExists) return res.status(409).json({ message: 'Email already exists.' });
      }

      user = new User({
        name,
        phone,
        email,
        role: 'user',
        isVerified: true,
        password: await bcrypt.hash(Math.random().toString(36), 10)
      });
      isRegistration = true;
    }

    // Save/Update User
    if (isRegistration || (role === 'user' && (name || email))) {
      // ... (update name/email logic)
      if (name) user.name = name;
      if (email) {
        if (email !== user.email) {
          const emailExists = await Model.findOne({ email, _id: { $ne: user._id } });
          if (emailExists) return res.status(409).json({ message: 'Email already in use.' });
          user.email = email;
        }
      }
      user.isVerified = true;
    }

    // ... (partner check logic)

    await user.save();

    // NOTIFICATION & EMAIL TRIGGERS (USER REGISTRATION)
    if (isRegistration && role === 'user') {
      // Send Welcome Email
      if (user.email) {
        emailService.sendUserWelcomeEmail(user).catch(err => console.error('Failed to send welcome email:', err));
      }

      // Send Welcome Notification (Stored + Push if token exists later)
      notificationService.sendToUser(user._id, {
        title: 'Welcome aboard!',
        body: 'Find your perfect stay today.'
      }, { type: 'welcome' }, 'user').catch(err => console.error('Failed to send welcome notification:', err));

      // REFERRAL: Process Signup Referral
      if (referralCode) {
        // Run in background to not block response
        referralService.processReferralSignup(user, referralCode).catch(err => console.error('Referral Signup Error:', err));
      }

      // REFERRAL: Auto-generate code for new user
      referralService.generateCodeForUser(user).catch(err => console.error('Code Gen Error:', err));

    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      message: isRegistration ? 'Registration successful' : 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isPartner: user.isPartner || (role === 'partner'),
        partnerApprovalStatus: user.partnerApprovalStatus,
        profileImage: user.profileImage
      }
    });

  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ message: 'Server error verifying OTP' });
  }
};

// ... (registerPartner)

export const verifyPartnerOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP are required' });
    }

    // 1. Verify against the shared OTP store (consumes the code on success).
    const otpResult = await verifyOtpCode(phone, String(otp).trim(), OTP_SCOPE);

    if (!otpResult.valid) {
      return res.status(400).json({
        message:
          otpResult.reason === 'OTP expired'
            ? 'OTP has expired'
            : otpResult.reason === 'OTP not found'
              ? 'Invalid request or OTP expired. Please register again.'
              : 'Invalid OTP'
      });
    }

    // 2. Find existing Partner (they were saved during registration)
    const partner = await Partner.findOne({ phone });
    if (!partner) {
      return res.status(404).json({ message: 'Partner registration not found. Please register again.' });
    }

    if (partner.isBlocked) {
      return res.status(403).json({
        message: 'Your account has been blocked by admin. Please contact support.',
        isBlocked: true
      });
    }

    if (partner.isVerified) {
      // Optional: allow re-verification or just proceed
    }

    // 3. Update Partner as Verified
    partner.isVerified = true;
    await partner.save();

    // (the code was already consumed by verifyOtp above)

    // NOTIFICATION & EMAIL TRIGGERS (PARTNER REGISTRATION)
    if (partner.email) {
      emailService.sendPartnerRegistrationEmail(partner).catch(err => console.error('Failed to send partner confirmation email:', err));
    }

    // Notify Admins
    const admins = await findPlatformAdmins();
    for (const admin of admins) {
      notificationService.sendToUser(
        admin._id,
        {
          title: `New Partner Registration: ${partner.name}`,
          body: 'Review needed.'
        },
        { type: 'partner_registration', partnerId: partner._id },
        'admin' // Assuming sendToUser handles 'admin' type correctly
      ).catch(err => console.error('Failed to notify admin:', err));
    }

    const token = generateToken(partner._id, partner.role);

    res.status(200).json({
      success: true,
      message: 'Partner registration completed successfully.',
      token,
      user: {
        id: partner._id,
        name: partner.name,
        email: partner.email,
        phone: partner.phone,
        role: partner.role,
        isPartner: partner.isPartner,
        partnerApprovalStatus: partner.partnerApprovalStatus,
        profileImage: partner.profileImage
      }
    });

  } catch (error) {
    console.error('Verify Partner OTP Error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Email or Phone already exists for this role.' });
    }
    res.status(500).json({ message: 'Server error verifying partner OTP' });
  }
};

/**
 * @desc    Admin Login with Email & Password
 * @route   POST /api/auth/admin/login
 * @access  Public
 */
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    if (!admin.isActive) {
      return res.status(403).json({ message: 'Admin account is deactivated' });
    }

    const isMatched = await bcrypt.compare(password, admin.password);
    if (!isMatched) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = generateToken(admin._id, admin.role);

    res.status(200).json({
      message: 'Admin login successful',
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        profileImage: admin.profileImage
      }
    });

  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ message: 'Server error during admin login' });
  }
};

/**
 * @desc    Get Current User/Admin/Partner Profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  try {
    // req.user is already populated by authMiddleware (which checks User, Partner, Admin)
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isPartner: user.isPartner || false,
        partnerApprovalStatus: user.partnerApprovalStatus,
        address: user.address,
        profileImage: user.profileImage,
        partnerSince: user.partnerSince,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get Me Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Update User Profile
 * @route   PUT /api/auth/update-profile
 * @access  Private
 */
export const updateProfile = async (req, res) => {
  try {
    const { name, email, phone, address, profileImage, profileImagePublicId } = req.body;
    const currentUser = req.user; // From middleware

    // Determine Model based on role
    let Model = currentUser.role === 'partner' ? Partner : User;
    if (['admin', 'superadmin'].includes(currentUser.role)) {
      // Admins use updateAdminProfile usually, but if they hit this:
      Model = Admin;
    }

    let user = await Model.findById(currentUser._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (email) {
      if (email !== user.email) {
        const existingUser = await Model.findOne({ email, _id: { $ne: user._id } });
        if (existingUser) {
          return res.status(409).json({ message: 'Email already in use' });
        }
        user.email = email;
      }
    }
    if (phone) {
      if (phone !== user.phone) {
        const existingUser = await Model.findOne({ phone, _id: { $ne: user._id } });
        if (existingUser) {
          return res.status(409).json({ message: 'Phone number already in use' });
        }
        user.phone = phone;
      }
    }

    if (address) {
      user.address = {
        street: address.street || user.address?.street || '',
        city: address.city || user.address?.city || '',
        state: address.state || user.address?.state || '',
        zipCode: address.zipCode || user.address?.zipCode || '',
        country: address.country || user.address?.country || 'India',
        coordinates: {
          lat: address.coordinates?.lat || user.address?.coordinates?.lat,
          lng: address.coordinates?.lng || user.address?.coordinates?.lng
        }
      };
    }

    if (profileImage !== undefined) user.profileImage = profileImage;
    if (profileImagePublicId !== undefined) user.profileImagePublicId = profileImagePublicId;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isPartner: user.isPartner || false,
        address: user.address,
        profileImage: user.profileImage,
        partnerSince: user.partnerSince,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

/**
 * @desc    Update Admin Profile
 * @route   PUT /api/auth/admin/update-profile
 * @access  Private (Admin/Superadmin)
 */
export const updateAdminProfile = async (req, res) => {
  // ... (Keep existing implementation)
  try {
    if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admins can update this profile' });
    }

    const { name, email, phone } = req.body;

    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (name) {
      admin.name = name;
    }

    if (email && email !== admin.email) {
      const existingEmail = await Admin.findOne({ email, _id: { $ne: admin._id } });
      if (existingEmail) {
        return res.status(409).json({ message: 'Email already in use' });
      }
      admin.email = email;
    }

    if (phone && phone !== admin.phone) {
      const existingPhone = await Admin.findOne({ phone, _id: { $ne: admin._id } });
      if (existingPhone) {
        return res.status(409).json({ message: 'Phone number already in use' });
      }
      admin.phone = phone;
    }

    await admin.save();

    res.status(200).json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        profileImage: admin.profileImage
      }
    });
  } catch (error) {
    console.error('Update Admin Profile Error:', error);
    res.status(500).json({ message: 'Server error updating admin profile' });
  }
};


/**
 * @desc    Update FCM Token for Push Notifications
 * @route   PUT /api/auth/update-fcm
 * @access  Private
 */
export const updateFcmToken = async (req, res) => {
  try {
    const { fcmToken, platform = 'web' } = req.body; // Default platform to 'web'
    if (!fcmToken) return res.status(400).json({ message: 'fcmToken is required' });

    const user = req.user; // From middleware (User, Partner, or Admin)

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Ensure fcmTokens object exists
    if (!user.fcmTokens) {
      user.fcmTokens = { app: null, web: null };
    }

    // Determine platform and update (default to 'web' if not 'app')
    const targetPlatform = platform === 'app' ? 'app' : 'web';
    user.fcmTokens[targetPlatform] = fcmToken;

    // Use markModified if user is a Mongoose document to ensure nested object update is tracked
    if (typeof user.markModified === 'function') {
      user.markModified('fcmTokens');
    }

    await user.save();

    res.json({
      success: true,
      message: `FCM Token updated successfully for ${targetPlatform}`,
      platform: targetPlatform
    });
  } catch (error) {
    console.error('Update FCM Token Error:', error);
    res.status(500).json({ message: 'Server error updating FCM token' });
  }
};

/**
 * @desc    Upload Documents (Partner Registration)
 * @route   POST /api/auth/partner/upload-docs
 * @access  Public
 */
export const uploadDocs = async (req, res) => {
  try {
    console.log(`[Upload Docs] Received ${req.files ? req.files.length : 0} files`);

    if (!req.files || !req.files.length) {
      return res.status(400).json({ message: 'No documents provided' });
    }

    const uploadPromises = req.files.map(file =>
      uploadToCloudinary(file.path, 'partner-documents')
    );

    const results = await Promise.all(uploadPromises);

    const files = results.map(result => ({
      url: result.url,
      publicId: result.publicId
    }));

    console.log(`[Upload Docs] Successfully uploaded ${files.length} documents`);

    res.json({ success: true, files });
  } catch (error) {
    console.error('Upload Docs Error:', error);
    res.status(500).json({ message: error.message || 'Upload failed' });
  }
};

/**
 * @desc    Delete Document from Cloudinary
 * @route   POST /api/auth/partner/delete-doc
 * @access  Public
 */
export const deleteDoc = async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({ message: 'Public ID is required' });
    }

    const result = await deleteFromCloudinary(publicId);
    res.json(result);
  } catch (error) {
    console.error('Delete Doc Error:', error);
    res.status(500).json({ message: error.message || 'Delete failed' });
  }
};

/**
 * @desc    Upload Documents via Base64 (Flutter Camera)
 * @route   POST /api/auth/partner/upload-docs-base64
 * @access  Public
 */
export const uploadDocsBase64 = async (req, res) => {
  try {
    const { images } = req.body; // Array of {base64, mimeType, fileName}

    console.log(`[Upload Docs Base64] Received ${images ? images.length : 0} images`);

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ message: 'No images provided' });
    }

    const uploadPromises = images.map(async (img, index) => {
      if (!img.base64) {
        throw new Error(`Image ${index + 1} missing base64 data`);
      }

      // Generate unique publicId if fileName provided
      const publicId = img.fileName
        ? `${Date.now()}-${img.fileName.replace(/\.[^/.]+$/, '')}`
        : null;

      return uploadBase64ToCloudinary(img.base64, 'partner-documents', publicId);
    });

    const results = await Promise.all(uploadPromises);

    const files = results.map(result => ({
      url: result.url,
      publicId: result.publicId
    }));

    console.log(`[Upload Docs Base64] Successfully uploaded ${files.length} documents`);

    res.json({ success: true, files });
  } catch (error) {
    console.error('Upload Docs Base64 Error:', error);
    res.status(500).json({ message: error.message || 'Upload failed' });
  }
};
