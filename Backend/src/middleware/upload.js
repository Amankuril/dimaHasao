import multer from 'multer';

const storage = multer.memoryStorage();

/**
 * Ten megabytes, one file.
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

export const upload = multer({
    storage,
    limits: {
        fileSize: MAX_UPLOAD_BYTES,
        files: 1,
        // Form fields alongside the file (folder, replaceUrl) are short.
        fields: 20,
        fieldSize: 100 * 1024,
    },
});
