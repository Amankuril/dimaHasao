/**
 * Re-run a Mongo transaction body when the server reports a transient conflict.
 *
 * Two transactions writing the same document (a driver's wallet, say, while a
 * ride settles and an admin approves a withdrawal) make one of them fail with a
 * write conflict labelled TransientTransactionError. MongoDB's guidance is to
 * retry the whole transaction. Without that, ride settlement failed after the
 * ride was already marked completed, so its commission was never collected.
 *
 * `fn` must start and finish its own session/transaction on each call.
 */
const isTransient = (error) =>
    typeof error?.hasErrorLabel === 'function'
    && (error.hasErrorLabel('TransientTransactionError') || error.hasErrorLabel('UnknownTransactionCommitResult'));

export const retryTransient = async (fn, { attempts = 4 } = {}) => {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (!isTransient(error) || attempt === attempts) throw error;
            await new Promise((resolve) => setTimeout(resolve, 20 * attempt + Math.random() * 30));
        }
    }
    throw lastError;
};
