import mongoose from 'mongoose';

const propertyCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    displayName: {
        type: String,
        required: true
    },
    description: String,

    // UI Configuration
    icon: {
        type: String,
        default: 'Building2'  // Lucide icon name
    },
    color: {
        type: String,
        default: '#004F4D'
    },
    badge: String,  // "BUSINESS & LEISURE", "VACATION", etc.
    bgImage: {
        type: String,
        default: ''
    },

    // Ordering
    order: {
        type: Number,
        default: 999  // Static tabs will be 0-6
    },

    // Status
    isActive: {
        type: Boolean,
        default: true
    },

    // Type identifier
    isDynamic: {
        type: Boolean,
        default: true
    },

    // Metadata
    metadata: {
        targetAudience: String,
        features: [String]
    }
}, { timestamps: true });

export default mongoose.model('PropertyCategory', propertyCategorySchema);
