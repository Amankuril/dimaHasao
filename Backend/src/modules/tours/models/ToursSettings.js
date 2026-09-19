import mongoose from 'mongoose';

/**
 * Module-wide rates and kill switches, as a singleton.
 *
 * Deliberately separate from the hotel module's PlatformSettings — that model
 * has a generic name but is hotel's own collection, and tours needs to be able
 * to run a different commission and tax rate.
 *
 * The tax rate defaults to 5% because that is what the approved v1 booking
 * screen shows; confirm against the real GST treatment before launch.
 */
const toursSettingsSchema = new mongoose.Schema({
  platformOpen: { type: Boolean, default: true },
  bookingDisabledMessage: {
    type: String,
    default: 'Tour bookings are temporarily disabled. Please try again later.',
  },
  taxRate: { type: Number, default: 5 },
}, { timestamps: true });

toursSettingsSchema.statics.getSettings = async function () {
  return (await this.findOne()) || this.create({});
};

const ToursSettings = mongoose.model('ToursSettings', toursSettingsSchema);
export default ToursSettings;
