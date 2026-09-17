/**
 * The support desk, from both sides.
 *
 * The consumer/vendor handlers are module-agnostic: the module and the caller's
 * role are decided at mount time by createSupportRouter, so hotel, tours and
 * anything added later share one implementation.
 */
import mongoose from 'mongoose';
import {
  SupportTicket,
  SUPPORT_MODULES,
  SUPPORT_STATUSES_BY_MODULE,
} from './supportTicket.model.js';
import { createTicket, addMessage, statusesInGroup } from './support.service.js';
import { searchRegex } from '../../utils/searchRegex.js';

/** Matches the cap on a message in the ticket schema. */
const MAX_MESSAGE_LENGTH = 4000;

const CATEGORIES_BY_MODULE = {
  hotel: ['booking', 'payment', 'property', 'refund', 'account', 'technical', 'other'],
  tours: ['booking', 'payment', 'package', 'refund', 'account', 'technical', 'other'],
  festivals: ['passes', 'payment', 'entry', 'refund', 'other'],
};

/* ------------------------------------------------------------------ *
 * Raised by whoever needs help
 * ------------------------------------------------------------------ */

/** @route POST <module>/support */
export const raiseTicket = async (req, res) => {
  try {
    const { module, role } = req.support;
    const { category, issueType, subject, description, priority, contextKind, contextId, contextLabel } = req.body;

    if (!String(description || '').trim() && !String(subject || '').trim()) {
      return res.status(400).json({ success: false, message: 'Tell us what went wrong' });
    }

    /*
     * The opening description also becomes the thread's first message, and that
     * field is capped at 4000 characters. Without this check an over-long one
     * reached mongoose and came back as a 500 "Could not raise this ticket",
     * which reads to the person typing as the server being broken rather than
     * their message being too long.
     */
    if (String(description || '').length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Please keep it under ${MAX_MESSAGE_LENGTH.toLocaleString('en-IN')} characters`,
      });
    }

    const allowed = CATEGORIES_BY_MODULE[module];
    if (allowed && category && !allowed.includes(category)) {
      return res.status(400).json({ success: false, message: 'Pick a valid category' });
    }

    const ticket = await createTicket({
      module,
      requesterRole: role,
      requester: req.user,
      category,
      issueType,
      subject,
      description,
      priority,
      context: contextId && mongoose.Types.ObjectId.isValid(contextId)
        ? { kind: contextKind || '', id: contextId, label: contextLabel || '' }
        : undefined,
    });

    res.status(201).json({ success: true, message: 'We have your request', ticket });
  } catch (error) {
    console.error('Raise support ticket error:', error);
    res.status(500).json({ success: false, message: 'Could not raise this ticket' });
  }
};

/** @route GET <module>/support — the caller's own tickets, newest first. */
export const listMyTickets = async (req, res) => {
  try {
    const { module, role } = req.support;
    const tickets = await SupportTicket.find({
      module,
      requesterRole: role,
      requesterId: req.user._id,
    }).sort({ lastMessageAt: -1, createdAt: -1 }).lean();

    res.json({ success: true, tickets, total: tickets.length });
  } catch (error) {
    console.error('List support tickets error:', error);
    res.status(500).json({ success: false, message: 'Could not load your tickets' });
  }
};

/**
 * @route GET /v1/support
 * Every ticket this customer has raised, whichever service it was about. The
 * help screen shows one history rather than one per module.
 */
export const listAllOwnTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({
      requesterRole: 'user',
      requesterId: req.user._id,
    }).sort({ lastMessageAt: -1, createdAt: -1 }).lean();

    res.json({ success: true, tickets, total: tickets.length });
  } catch (error) {
    console.error('List own support tickets error:', error);
    res.status(500).json({ success: false, message: 'Could not load your tickets' });
  }
};

/**
 * Resolve a ticket the caller is entitled to see.
 *
 * Scoped by requester on the query itself rather than fetched and then checked,
 * so someone else's ticket id simply does not resolve.
 */
const findOwnTicket = (req) => SupportTicket.findOne({
  _id: req.params.id,
  // The consumer help screen spans every service, so it leaves the module open;
  // a module's own desk pins it.
  ...(req.support.module ? { module: req.support.module } : {}),
  requesterRole: req.support.role,
  requesterId: req.user._id,
});

/** @route GET <module>/support/:id */
export const getMyTicket = async (req, res) => {
  try {
    const ticket = await findOwnTicket(req);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Get support ticket error:', error);
    res.status(500).json({ success: false, message: 'Could not load this ticket' });
  }
};

/** @route POST <module>/support/:id/messages */
export const replyToMyTicket = async (req, res) => {
  try {
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(400).json({ success: false, message: 'Write a message first' });
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Please keep it under ${MAX_MESSAGE_LENGTH.toLocaleString('en-IN')} characters`,
      });
    }

    const ticket = await findOwnTicket(req);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (['resolved', 'closed'].includes(ticket.status)) {
      return res.status(409).json({ success: false, message: 'This ticket is closed. Raise a new one.' });
    }

    await addMessage({
      ticket,
      senderRole: req.support.role,
      senderId: req.user._id,
      senderName: req.user.name,
      message,
    });

    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Reply to support ticket error:', error);
    res.status(500).json({ success: false, message: 'Could not send that message' });
  }
};

/* ------------------------------------------------------------------ *
 * The unified admin desk
 * ------------------------------------------------------------------ */

/**
 * Fill in who raised a ticket, where the ticket itself does not say.
 *
 * Tickets raised through this desk record the name and phone at the time. The
 * ones food's own controllers create record only an id, so they are looked up
 * here — grouped by model, one query per collection rather than one per ticket.
 */
const withRequesterNames = async (tickets) => {
  const missing = tickets.filter((t) => t.requesterId && !t.requesterName && t.requesterModel);
  if (!missing.length) return tickets;

  const idsByModel = new Map();
  for (const ticket of missing) {
    if (!idsByModel.has(ticket.requesterModel)) idsByModel.set(ticket.requesterModel, new Set());
    idsByModel.get(ticket.requesterModel).add(String(ticket.requesterId));
  }

  const found = new Map();
  await Promise.all([...idsByModel].map(async ([modelName, ids]) => {
    const Model = mongoose.models[modelName];
    // A model that is not registered in this process is simply skipped; a
    // missing name is a blank cell, never a failed request.
    if (!Model) return;
    const rows = await Model.find({ _id: { $in: [...ids] } }).select('name phone').lean();
    for (const row of rows) found.set(String(row._id), row);
  }));

  return tickets.map((ticket) => {
    const person = found.get(String(ticket.requesterId));
    return person
      ? { ...ticket, requesterName: person.name || '', requesterPhone: person.phone || '' }
      : ticket;
  });
};

/** @route GET /v1/admin/support */
export const listAllTickets = async (req, res) => {
  try {
    const { module, status, group, role, search } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);

    const match = {};
    if (module && SUPPORT_MODULES.includes(module)) match.module = module;
    if (role) match.requesterRole = role;
    if (status) match.status = status;
    // `group` spans the modules' different words for the same state.
    else if (group && statusesInGroup(group)) match.status = { $in: statusesInGroup(group) };

    if (search) {
      const regex = searchRegex(search);
      match.$or = [
        { ticketCode: regex }, { subject: regex }, { issueType: regex },
        { description: regex }, { requesterName: regex }, { requesterPhone: regex },
      ];
    }

    const [tickets, total] = await Promise.all([
      SupportTicket.find(match)
        .sort({ lastMessageAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SupportTicket.countDocuments(match),
    ]);

    res.json({ success: true, tickets: await withRequesterNames(tickets), total, page, limit });
  } catch (error) {
    console.error('List all support tickets error:', error);
    res.status(500).json({ success: false, message: 'Could not load tickets' });
  }
};

/** @route GET /v1/admin/support/stats — the counts the desk header shows. */
export const getTicketStats = async (_req, res) => {
  try {
    const rows = await SupportTicket.aggregate([
      { $group: { _id: { module: '$module', status: '$status' }, count: { $sum: 1 } } },
    ]);

    const byModule = {};
    let waiting = 0;
    for (const row of rows) {
      const { module, status } = row._id;
      byModule[module] = byModule[module] || { total: 0, waiting: 0 };
      byModule[module].total += row.count;
      if (['open', 'pending'].includes(status)) {
        byModule[module].waiting += row.count;
        waiting += row.count;
      }
    }

    res.json({
      success: true,
      stats: { total: rows.reduce((sum, r) => sum + r.count, 0), waiting, byModule },
    });
  } catch (error) {
    console.error('Support stats error:', error);
    res.status(500).json({ success: false, message: 'Could not load support stats' });
  }
};

/** @route GET /v1/admin/support/:id */
export const getTicketForAdmin = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id).lean();
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ success: false, message: 'Could not load this ticket' });
  }
};

/**
 * @route PATCH /v1/admin/support/:id
 * Status, priority and assignment.
 *
 * The status is checked against the ticket's own module vocabulary. A module's
 * discriminator already enforces that for tickets its controllers created, but
 * one raised from the consumer help screen is built on the base model — so the
 * check lives here too, or taxi could end up with a 'resolved' its panel cannot
 * render.
 */
export const updateTicketForAdmin = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    const { status, priority, adminResponse, assignedAdminId, assignedAdminName } = req.body;

    if (status) {
      const allowed = SUPPORT_STATUSES_BY_MODULE[ticket.module];
      if (allowed && !allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `${ticket.module} does not use the status "${status}" — try ${allowed.join(', ')}`,
        });
      }
      ticket.status = status;
    }
    if (priority) ticket.priority = priority;
    if (adminResponse !== undefined) {
      ticket.adminResponse = adminResponse;
      ticket.respondedAt = new Date();
    }
    if (assignedAdminId !== undefined) {
      ticket.assignedAdminId = assignedAdminId || null;
      ticket.assignedAdminName = assignedAdminName || '';
    }

    try {
      await ticket.save();
    } catch (validation) {
      if (validation.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: validation.errors?.status
            ? `"${status}" is not a status ${ticket.module} uses`
            : validation.message,
        });
      }
      throw validation;
    }

    res.json({ success: true, message: 'Ticket updated', ticket });
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ success: false, message: 'Could not update this ticket' });
  }
};

/** @route POST /v1/admin/support/:id/messages */
export const replyAsAdmin = async (req, res) => {
  try {
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(400).json({ success: false, message: 'Write a reply first' });
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Please keep it under ${MAX_MESSAGE_LENGTH.toLocaleString('en-IN')} characters`,
      });
    }

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    await addMessage({
      ticket,
      senderRole: 'admin',
      senderId: req.admin?._id || req.user?._id,
      senderName: req.admin?.name || 'Support',
      message,
    });

    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Admin reply error:', error);
    res.status(500).json({ success: false, message: 'Could not send that reply' });
  }
};

export default {
  raiseTicket,
  listMyTickets,
  listAllOwnTickets,
  getMyTicket,
  replyToMyTicket,
  listAllTickets,
  getTicketStats,
  getTicketForAdmin,
  updateTicketForAdmin,
  replyAsAdmin,
};
