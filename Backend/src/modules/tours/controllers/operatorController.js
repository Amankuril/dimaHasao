/**
 * The operator's own profile.
 *
 * `GET /me` exists because approval status changes *after* sign-in: the token
 * is issued while the account is still pending, so a panel that trusted the
 * session payload would keep showing "waiting for approval" until the operator
 * signed out and back in.
 */
import TourOperator from '../models/TourOperator.js';

/** Everything the panel may see. Excludes the password hash by omission. */
const PUBLIC_FIELDS = [
  '_id', 'name', 'agencyName', 'email', 'phone', 'role',
  'isBlocked', 'isVerified', 'operatorApprovalStatus', 'rejectionReason', 'operatorSince',
  'ownerName', 'aadhaarNumber', 'aadhaarFront', 'aadhaarBack', 'panNumber', 'panCardImage',
  'gstNumber', 'address', 'termsAccepted', 'profileImage', 'createdAt',
];

/** Fields an operator may set on themselves. Approval is deliberately absent. */
const EDITABLE_FIELDS = [
  'name', 'agencyName', 'email',
  'ownerName', 'aadhaarNumber', 'aadhaarFront', 'aadhaarBack',
  'panNumber', 'panCardImage', 'gstNumber', 'profileImage', 'termsAccepted',
];

const present = (operator) => {
  const doc = operator.toObject ? operator.toObject() : operator;
  return Object.fromEntries(PUBLIC_FIELDS.filter((f) => doc[f] !== undefined).map((f) => [f, doc[f]]));
};

/** @route GET /v1/tours/operators/me */
export const getMe = async (req, res) => {
  try {
    const operator = await TourOperator.findById(req.user._id);
    if (!operator) return res.status(404).json({ success: false, message: 'Operator not found' });
    res.json({ success: true, operator: present(operator) });
  } catch (error) {
    console.error('Get operator profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to load your profile' });
  }
};

/** @route PUT /v1/tours/operators/me */
export const updateMe = async (req, res) => {
  try {
    const operator = await TourOperator.findById(req.user._id);
    if (!operator) return res.status(404).json({ success: false, message: 'Operator not found' });

    for (const key of EDITABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) operator[key] = req.body[key];
    }

    if (req.body.address && typeof req.body.address === 'object') {
      operator.address = { ...(operator.address?.toObject?.() || operator.address || {}), ...req.body.address };
    }

    await operator.save();
    res.json({ success: true, message: 'Profile saved', operator: present(operator) });
  } catch (error) {
    console.error('Update operator profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to save your profile' });
  }
};

export default { getMe, updateMe };
