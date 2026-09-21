import mongoose from 'mongoose';

/**
 * One home for the documents every app shows: privacy, terms, refunds, about.
 *
 * These were written three times over. Food kept them inside its
 * `pageContent` singleton, hotel had its own `InfoPage` collection, and taxi
 * shipped them as two .txt files compiled into the bundle — so changing the
 * privacy policy meant editing two admin screens and a source file, and tours,
 * festivals and the customer app had no policy pages at all.
 *
 * Scoped by `module` so a module can legitimately differ where it has to — a
 * restaurant partner agreement is not a traveller's privacy notice — while
 * `platform` is the fallback every app falls back to when it has nothing of its
 * own. That keeps one document editable in one place for the common case,
 * without forcing the same words on five different audiences.
 */

/** The apps that can carry a document, plus the district-wide default. */
export const LEGAL_MODULES = ['platform', 'food', 'taxi', 'hotel', 'tours', 'festivals'];

/** Who the document is written for within a module. */
export const LEGAL_AUDIENCES = ['customer', 'partner'];

/** The documents themselves. */
export const LEGAL_SLUGS = ['privacy', 'terms', 'refund', 'about', 'contact'];

const legalDocumentSchema = new mongoose.Schema(
    {
        module: { type: String, enum: LEGAL_MODULES, default: 'platform', index: true },
        audience: { type: String, enum: LEGAL_AUDIENCES, default: 'customer', index: true },
        slug: { type: String, enum: LEGAL_SLUGS, required: true, index: true },

        title: { type: String, required: true, trim: true },
        /** HTML, as the existing editors already produce. */
        content: { type: String, default: '' },

        /** Lets a document be drafted without being served. */
        isActive: { type: Boolean, default: true },

        updatedBy: { type: mongoose.Schema.Types.ObjectId },
    },
    { timestamps: true, collection: 'legal_documents' },
);

// One document per module + audience + slug.
legalDocumentSchema.index({ module: 1, audience: 1, slug: 1 }, { unique: true });

/**
 * The document an app should show, falling back to the platform-wide copy.
 *
 * A module that has not written its own privacy notice still has one, which is
 * the whole point of centralising these — tours and festivals had none at all.
 */
legalDocumentSchema.statics.resolve = async function resolve(slug, { module = 'platform', audience = 'customer' } = {}) {
    const candidates = [
        { module, audience, slug },
        { module, audience: 'customer', slug },
        { module: 'platform', audience, slug },
        { module: 'platform', audience: 'customer', slug },
    ];

    for (const where of candidates) {
        const found = await this.findOne({ ...where, isActive: true }).lean();
        if (found) return found;
    }
    return null;
};

const LegalDocument = mongoose.model('LegalDocument', legalDocumentSchema);
export default LegalDocument;
