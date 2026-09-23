import multer from 'multer';

const storage = multer.memoryStorage();

/**
 * Ten megabytes per file.
 *
 * Multer had no limits at all. Files are buffered in memory, so an upload of
 * any size was an upload of any size into RAM — and the endpoint behind it took
 * no credentials, which made memory exhaustion something a stranger could do
 * from a terminal. Express's own 2MB JSON cap never applied here; multipart
 * bypasses it.
 *
 * Ten megabytes is what the frontend upload services already refuse above, so
 * this refuses the same thing on the side that matters.
 */
export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024);

const DEFAULT_FIELD_SIZE = 100 * 1024;

/**
 * Build an uploader for what a route actually carries.
 *
 * The caps above were first written for the one-file upload endpoint and put on
 * a single shared instance, which every other route then inherited: one file
 * and twenty fields. That quietly broke every multipart route that carries
 * more — restaurant registration sends fourteen images and about fifty fields
 * and died on `Too many form fields`, and every `upload.array` in the codebase
 * was capped at a single file.
 *
 * So limits belong with the route that knows its own shape. A route that takes
 * more than one file, or more than a short form, says so here.
 */
export const createUploader = ({
    files = 1,
    fields = 20,
    fileSize = MAX_UPLOAD_BYTES,
    fieldSize = DEFAULT_FIELD_SIZE,
} = {}) =>
    multer({
        storage,
        limits: { fileSize, files, fields, fieldSize },
    });

/** One file alongside a short form — the generic upload endpoint's shape. */
export const upload = createUploader();

/**
 * A full onboarding submission: profile, PAN, GST and FSSAI images plus up to
 * ten menu photos, and every field of a three-step form.
 */
export const uploadOnboarding = createUploader({ files: 14, fields: 200 });

/** A gallery post: many files, little else. */
export const uploadGallery = createUploader({ files: 20, fields: 30 });

/** A handful of documents attached to a form. */
export const uploadDocuments = createUploader({ files: 6, fields: 100 });
