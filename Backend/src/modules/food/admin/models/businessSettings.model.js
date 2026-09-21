import mongoose from 'mongoose';

const businessSettingsSchema = new mongoose.Schema(
    {
        companyName: { type: String, required: true, default: 'Dima Hasao' },
        /*
         * Blank by default. This used to default to an address at the product
         * this was built on top of, which then showed up as the district's own
         * contact on public pages. The real one is set in Global Settings →
         * Brand & Contact, and a blank field simply hides the contact rather
         * than advertising somebody else's.
         */
        email: { type: String, default: '' },
        phone: {
            countryCode: { type: String, default: '+91' },
            number: { type: String, default: '' }
        },
        address: { type: String, default: '' },
        state: { type: String, default: '' },
        pincode: { type: String, default: '' },
        region: { type: String, default: 'India' },
        logo: {
            url: { type: String, default: '' },
            publicId: { type: String, default: '' }
        },
        favicon: {
            url: { type: String, default: '' },
            publicId: { type: String, default: '' }
        }
    },
    { timestamps: true }
);

export const FoodBusinessSettings = mongoose.model('FoodBusinessSettings', businessSettingsSchema);
