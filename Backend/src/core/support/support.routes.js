import express from 'express';
import { authMiddleware } from '../auth/auth.middleware.js';
import { requireRoles } from '../roles/role.middleware.js';
import { FoodUser } from '../users/user.model.js';
import { SUPPORT_MODULES } from './supportTicket.model.js';
import {
  raiseTicket,
  listMyTickets,
  listAllOwnTickets,
  getMyTicket,
  replyToMyTicket,
} from './support.controller.js';

/**
 * A module's support routes.
 *
 * The module and the caller's role are fixed here rather than read from the
 * request, so nobody can raise a ticket as someone else by sending a field.
 *
 * @param {string}   module      which module's desk this is
 * @param {Function} protect     that module's auth middleware
 * @param {Function} resolveRole req => the requester role ('user', 'partner', …)
 */
export const createSupportRouter = ({ module, protect, resolveRole }) => {
  const router = express.Router();

  router.use(protect, (req, res, next) => {
    const role = resolveRole(req);
    if (!role) {
      return res.status(403).json({ success: false, message: 'This account cannot raise support tickets' });
    }
    req.support = { module, role };
    next();
  });

  router.post('/', raiseTicket);
  router.get('/', listMyTickets);
  router.get('/:id', getMyTicket);
  router.post('/:id/messages', replyToMyTicket);

  return router;
};

/**
 * The consumer help desk, for the one Help & Support screen in /app.
 *
 * A customer picks which service they need help with, so the module comes from
 * the request here rather than the mount — the opposite of the module routers
 * above, which exist for partners and operators who only ever have one.
 *
 * The shared auth middleware decodes a token into `{ userId, role }` and
 * nothing more, so the account is loaded before a ticket records who raised it.
 */
export const consumerSupportRouter = express.Router();

consumerSupportRouter.use(authMiddleware, requireRoles('USER'), async (req, res, next) => {
  try {
    const user = await FoodUser.findById(req.user.userId);
    if (!user) return res.status(401).json({ success: false, message: 'Account not found' });
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
});

consumerSupportRouter.post('/', (req, res, next) => {
  const module = String(req.body.module || '').toLowerCase();
  if (!SUPPORT_MODULES.includes(module)) {
    return res.status(400).json({ success: false, message: 'Pick which service you need help with' });
  }
  req.support = { module, role: 'user' };
  next();
}, raiseTicket);

/**
 * Every ticket the customer has raised, across services — the help screen shows
 * one history, not one per module.
 */
consumerSupportRouter.get('/', listAllOwnTickets);

// Reading or replying to one of the customer's own tickets — whichever service
// it belongs to, which is why no module is pinned.
const asOwnTicket = (req, _res, next) => { req.support = { role: 'user' }; next(); };

consumerSupportRouter.get('/:id', asOwnTicket, getMyTicket);
consumerSupportRouter.post('/:id/messages', asOwnTicket, replyToMyTicket);

export default createSupportRouter;
