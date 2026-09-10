import ReferralCode from '../models/ReferralCode.js';
import ReferralProgram from '../models/ReferralProgram.js';
import ReferralTracking from '../models/ReferralTracking.js';
import Wallet from '../models/Wallet.js';
import Notification from '../models/Notification.js';
import notificationService from './notificationService.js';
import mongoose from 'mongoose';

class ReferralService {

    /**
     * Generates a unique referral code for a user/partner
     * format: NAME + Random Numbers (e.g., JOHN402)
     */
    async generateCodeForUser(user) {
        try {
            // Check if already exists
            const existing = await ReferralCode.findOne({
                ownerId: user._id,
                ownerType: user.role === 'partner' ? 'Partner' : 'User'
            });
            if (existing) return existing;

            // Find active program
            const program = await ReferralProgram.findOne({ isActive: true, eligibleRoles: user.role });

            // Sanitized name prefix (first 4 chars of name or 'USER')
            const prefix = (user.name || 'USER').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4);
            let uniqueCode;
            let isUnique = false;

            // Try 5 times to generate unique code
            for (let i = 0; i < 5; i++) {
                const randomNum = Math.floor(1000 + Math.random() * 9000); // 4 digit random
                const candidate = `${prefix}${randomNum}`;
                const check = await ReferralCode.findOne({ code: candidate });
                if (!check) {
                    uniqueCode = candidate;
                    isUnique = true;
                    break;
                }
            }

            if (!isUnique) {
                // Fallback to timestamp if name collision is high
                uniqueCode = `${prefix}${Date.now().toString().slice(-6)}`;
            }

            const newCode = await ReferralCode.create({
                code: uniqueCode,
                ownerId: user._id,
                ownerType: user.role === 'partner' ? 'Partner' : 'User',
                referralProgramId: program?._id
            });

            return newCode;
        } catch (error) {
            console.error("Generate Referral Code Error:", error);
            throw error;
        }
    }

    /**
     * Called during Signup.
     * Tracks the referral as PENDING.
     */
    async processReferralSignup(newUser, referralCodeString) {
        try {
            if (!referralCodeString) return null;

            const code = await ReferralCode.findOne({ code: referralCodeString.toUpperCase(), isActive: true });
            if (!code) {
                console.warn(`Invalid referral code used: ${referralCodeString}`);
                return null;
            }

            // Self-referral check
            if (code.ownerId.toString() === newUser._id.toString()) {
                console.warn(`Self-referral attempted by ${newUser._id}`);
                return null;
            }

            // Check if already referred (should be unique per user)
            const existing = await ReferralTracking.findOne({ referredUserId: newUser._id });
            if (existing) return null;

            // Get Active Program
            // Note: We use the program linked to the code, or global active backup
            let program = await ReferralProgram.findById(code.referralProgramId);
            if (!program || !program.isActive) {
                program = await ReferralProgram.findOne({ isActive: true });
            }

            if (!program) {
                console.warn("No active referral program found.");
                return null;
            }

            // Create Tracking Record
            await ReferralTracking.create({
                referrerId: code.ownerId,
                referrerModel: code.ownerType,
                referredUserId: newUser._id,
                referralCodeId: code._id,
                referralProgramId: program._id,
                status: 'pending',
                rewardAmount: program.rewardAmount,
                triggerType: program.triggerType || 'first_booking'
            });

            // Increment usage count
            code.usageCount += 1;
            await code.save();

            // Notify Referrer (Optional: "Someone joined using your code!")
            // implement notification logic here if needed

            return true;
        } catch (error) {
            console.error("Process Referral Signup Error:", error);
            // Don't block signup if referral fails
            return null;
        }
    }

    /**
     * Called when a booking is completed.
     * Checks if this triggers a reward unlock.
     */
    async processBookingCompletion(userId, bookingId) {
        try {
            // Find pending referral for this user
            const referral = await ReferralTracking.findOne({
                referredUserId: userId,
                status: 'pending'
            });

            if (!referral) return;

            // Check Program Trigger
            const program = await ReferralProgram.findById(referral.referralProgramId);
            if (program.triggerType !== 'first_booking') return;

            // Unlock Reward
            referral.status = 'completed';
            referral.completedAt = new Date();
            referral.triggerBookingId = bookingId;
            await referral.save();

            // Credit Wallet of Referrer
            const wallet = await this.getOrCreateWallet(referral.referrerId, referral.referrerModel);
            await wallet.credit(
                referral.rewardAmount,
                `Referral Reward for ${referral.referredUserId}`,
                referral._id.toString(),
                'referral_bonus'
            );

            // ALSO Credit Referee (User who booked) - Prompt said "You Both Earn" in the UI Text
            // The UI says "You Both Earn ₹200". So we should credit the new user too.
            const refereeWallet = await this.getOrCreateWallet(referral.referredUserId, 'User');
            await refereeWallet.credit(
                referral.rewardAmount,
                `Referral Bonus (Welcome Gift)`,
                referral._id.toString(),
                'referral_bonus'
            );

            // Send Notifications
            await notificationService.sendToUser(referral.referrerId, {
                title: 'Referral Reward Unlocked! ',
                body: `You earned ₹${referral.rewardAmount} because your friend completed their first stay!`
            }, { type: 'referral_reward' }, referral.referrerModel === 'Partner' ? 'partner' : 'user');

            await notificationService.sendToUser(referral.referredUserId, {
                title: 'Welcome Bonus Unlocked! 🎉',
                body: `You earned ₹${referral.rewardAmount} for completing your first stay!`
            }, { type: 'referral_reward' }, 'user');

        } catch (error) {
            console.error("Process Booking Completion Error:", error);
        }
    }

    /**
     * Helper to get wallet
     */
    async getOrCreateWallet(userId, modelType) {
        let role = modelType.toLowerCase();
        // Map 'Partner' modelType to 'partner' role, 'User' to 'user'
        if (role === 'admin') role = 'admin';

        let wallet = await Wallet.findOne({ partnerId: userId, role });
        if (!wallet) {
            wallet = await Wallet.create({
                partnerId: userId,
                role,
                balance: 0
            });
        }
        return wallet;
    }

    /**
     * Get User Stats for UI
     */
    async getReferralStats(userId) {
        // 1. Get My Code
        let myCode = await ReferralCode.findOne({ ownerId: userId });

        // Lazy generate if not exists
        if (!myCode) {
            // Need to fetch user details to get name
            const user = await mongoose.model('User').findById(userId); // Assuming User
            if (user) {
                myCode = await this.generateCodeForUser(user);
            }
        }

        // 2. Stats
        const invited = await ReferralTracking.countDocuments({ referrerId: userId });
        const joined = await ReferralTracking.countDocuments({ referrerId: userId }); // Typically same as invited in this model unless we track sent links separately
        // Actually, "Invited" usually means link clicks, which we can't track easily without a click tracker.
        // For now, let's say "Invited" = Sent? No, we don't know who they sent to.
        // Let's map: 
        // Invited = Signed up (Pending + Completed)
        // Joined = Signed up (Pending + Completed) - Maybe duplicate concept?
        // Let's say "Invited" = Total referrals
        // "Joined" = Total referrals who verified (if we tracked verification, but here assume all signed up are joined)
        // "Bookings" = Completed referrals

        // Better Mapping for the UI:
        // Invited -> Total Referrals (Pending + Completed)
        // Joined -> Same as Invited (since we only track when they maintain the code)
        // OR "Invited" could be hardcoded mock if we don't track shares.
        // Let's stick to Usage Count of code for "Invited"? No, usage count is signup count.

        const bookings = await ReferralTracking.countDocuments({ referrerId: userId, status: 'completed' });

        const stats = {
            invited: myCode ? myCode.usageCount : 0,
            joined: myCode ? myCode.usageCount : 0,
            bookings
        };

        // 3. Earnings
        const wallet = await Wallet.findOne({ partnerId: userId, role: 'user' });
        // Aggregation for specific referral income
        // Can do aggregation on Transaction collection
        /*
        const earnings = await Transaction.aggregate([ ... match type: 'referral_bonus' ... ])
        */

        // 4. History
        const history = await ReferralTracking.find({ referrerId: userId })
            .populate('referredUserId', 'name')
            .sort({ createdAt: -1 })
            .limit(20);

        const formattedHistory = history.map(h => ({
            id: h._id,
            name: h.referredUserId ? h.referredUserId.name : 'Unknown User',
            status: h.status, // 'pending' | 'completed'
            reward: h.rewardAmount,
            date: h.createdAt,
            avatar: h.referredUserId && h.referredUserId.name ? h.referredUserId.name.substring(0, 2).toUpperCase() : '??'
        }));

        return {
            code: myCode ? myCode.code : '',
            link: myCode ? `https://rukkoo.in/r/${myCode.code}` : '',
            stats,
            history: formattedHistory,
            earningsTotal: wallet ? wallet.totalEarnings : 0 // Note: This includes other earnings too potentially? But for User it's mostly referrals.
        };
    }

}

export default new ReferralService();
