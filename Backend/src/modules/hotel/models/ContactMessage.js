import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema(
  {
    audience: {
      type: String,
      enum: ['user', 'partner'],
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['new', 'in_progress', 'resolved'],
      default: 'new'
    },
    meta: {
      type: Object
    }
  },
  { timestamps: true }
);

const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);
export default ContactMessage;

