/**
 * Run tasks that share a key one at a time, in arrival order.
 *
 * For check-then-write money paths (is there enough balance? then insert a
 * withdrawal), where two requests fired together would both pass the check.
 * Each namespace keeps its own queue so unrelated paths never wait on each other.
 *
 * This is an in-process lock. It is sufficient because the API runs as a single
 * fork-mode process (ecosystem.config.cjs; Socket.IO rooms already depend on
 * that). If the API is ever clustered this needs a database-side guard instead.
 */
const queues = new Map();

export const runExclusive = (namespace, key, task) => {
    const id = `${namespace}:${String(key)}`;
    const previous = queues.get(id) || Promise.resolve();
    const current = previous.catch(() => {}).then(task);
    const tail = current.catch(() => {});
    queues.set(id, tail);
    tail.then(() => {
        if (queues.get(id) === tail) queues.delete(id);
    });
    return current;
};
