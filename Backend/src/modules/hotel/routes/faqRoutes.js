import express from 'express';
import mongoose from 'mongoose';
import Faq from '../models/Faq.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';

/*
 * Hotel FAQs. The Faq model, the admin "FAQs" page and the partner / guest
 * help screens all existed, but no routes were mounted, so the admin page
 * 404'd and every help screen read "No FAQs available".
 *
 *   GET    /faqs?audience=user|partner   public, active only, in order
 *   GET    /faqs/admin?audience=...      admin, all
 *   POST   /faqs                         admin
 *   PUT    /faqs/:id                     admin
 *   DELETE /faqs/:id                     admin
 */
const router = express.Router();
const AUDIENCES = new Set(['user', 'partner']);

const clean = (body = {}, partial = false) => {
  const out = {};
  if (!partial || body.question !== undefined) out.question = String(body.question || '').trim();
  if (!partial || body.answer !== undefined) out.answer = String(body.answer || '').trim();
  if (!partial || body.audience !== undefined) out.audience = String(body.audience || '').trim().toLowerCase();
  if (body.isActive !== undefined) out.isActive = body.isActive === true || body.isActive === 'true';
  if (body.order !== undefined) out.order = Number(body.order) || 0;
  return out;
};

const invalid = (doc, partial) => {
  if ((!partial || doc.question !== undefined) && !doc.question) return 'A question is required';
  if ((!partial || doc.answer !== undefined) && !doc.answer) return 'An answer is required';
  if ((!partial || doc.audience !== undefined) && !AUDIENCES.has(doc.audience)) return "Audience must be 'user' or 'partner'";
  return null;
};

const audienceFilter = (q) => {
  const a = String(q.audience || '').toLowerCase();
  return AUDIENCES.has(a) ? { audience: a } : {};
};

router.get('/', async (req, res) => {
  try {
    const faqs = await Faq.find({ ...audienceFilter(req.query), isActive: true }).sort({ order: 1, createdAt: 1 }).lean();
    res.json({ success: true, faqs });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Could not load FAQs' });
  }
});

router.get('/admin', protect, authorizedRoles('admin', 'superadmin'), async (req, res) => {
  try {
    const faqs = await Faq.find(audienceFilter(req.query)).sort({ audience: 1, order: 1, createdAt: 1 }).lean();
    res.json({ success: true, faqs });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Could not load FAQs' });
  }
});

router.post('/', protect, authorizedRoles('admin', 'superadmin'), async (req, res) => {
  try {
    const doc = clean(req.body);
    const problem = invalid(doc, false);
    if (problem) return res.status(400).json({ success: false, message: problem });
    const faq = await Faq.create(doc);
    res.status(201).json({ success: true, faq });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Could not save this FAQ' });
  }
});

router.put('/:id', protect, authorizedRoles('admin', 'superadmin'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: 'FAQ not found' });
    const doc = clean(req.body, true);
    const problem = invalid(doc, true);
    if (problem) return res.status(400).json({ success: false, message: problem });
    const faq = await Faq.findByIdAndUpdate(req.params.id, { $set: doc }, { new: true });
    if (!faq) return res.status(404).json({ success: false, message: 'FAQ not found' });
    res.json({ success: true, faq });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Could not update this FAQ' });
  }
});

router.delete('/:id', protect, authorizedRoles('admin', 'superadmin'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: 'FAQ not found' });
    const faq = await Faq.findByIdAndDelete(req.params.id);
    if (!faq) return res.status(404).json({ success: false, message: 'FAQ not found' });
    res.json({ success: true, message: 'FAQ deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Could not delete this FAQ' });
  }
});

export default router;
