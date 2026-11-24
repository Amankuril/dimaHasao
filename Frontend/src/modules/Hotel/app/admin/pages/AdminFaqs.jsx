import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, XCircle } from 'lucide-react';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

const AdminFaqs = () => {
  const [activeTab, setActiveTab] = useState('user'); // 'user' or 'partner'
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [formData, setFormData] = useState({ question: '', answer: '', isActive: true });

  useEffect(() => {
    fetchFaqs();
  }, [activeTab]);

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAllFaqs({ audience: activeTab });
      setFaqs(data);
    } catch (error) {
      toast.error('Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (faq = null) => {
    if (faq) {
      setEditingFaq(faq);
      setFormData({
        question: faq.question,
        answer: faq.answer,
        isActive: faq.isActive,
        order: faq.order
      });
    } else {
      setEditingFaq(null);
      setFormData({ question: '', answer: '', isActive: true, order: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, audience: activeTab };
      if (editingFaq) {
        await adminService.updateFaq(editingFaq._id, payload);
        toast.success('FAQ updated successfully');
      } else {
        await adminService.createFaq(payload);
        toast.success('FAQ created successfully');
      }
      setIsModalOpen(false);
      fetchFaqs();
    } catch (error) {
      toast.error(error.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this FAQ?')) return;
    try {
      await adminService.deleteFaq(id);
      toast.success('FAQ deleted');
      fetchFaqs();
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const filteredFaqs = faqs.filter(f =>
    f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-neutral-800">FAQ management</h1>
          <p className="mt-1 text-sm text-neutral-500">Answers shown to guests and partners in their apps</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-neutral-900 text-white px-5 py-2.5 rounded-xl hover:bg-neutral-800 transition-colors shadow-sm"
        >
          <Plus size={18} /> Add FAQ
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-white rounded-xl w-fit border border-neutral-200 shadow-sm">
        <button
          onClick={() => setActiveTab('user')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'user' ? 'bg-neutral-900 text-white shadow-sm' : 'text-neutral-500 hover:bg-neutral-50'}`}
        >
          User FAQs
        </button>
        <button
          onClick={() => setActiveTab('partner')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'partner' ? 'bg-neutral-900 text-white shadow-sm' : 'text-neutral-500 hover:bg-neutral-50'}`}
        >
          Partner FAQs
        </button>
      </div>

      {/* Search & List */}
      <div className="bg-white rounded-xl border border-neutral-900/[0.08] overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex items-center gap-3">
          <Search className="text-neutral-500" size={20} />
          <input
            type="text"
            placeholder="Search FAQs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 outline-none text-sm text-neutral-700 placeholder:text-neutral-500"
          />
        </div>

        <div className="divide-y divide-neutral-50">
          {loading ? (
            <div className="p-8 text-center text-neutral-500">Loading...</div>
          ) : filteredFaqs.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">No FAQs found</div>
          ) : (
            filteredFaqs.map(faq => (
              <div key={faq._id} className="p-4 hover:bg-neutral-50 transition-colors group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-neutral-800">{faq.question}</h3>
                      {!faq.isActive && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Inactive</span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-500 line-clamp-2">{faq.answer}</p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenModal(faq)}
                      className="p-2 text-[#0a4d2b] hover:bg-neutral-100 rounded-lg transition-colors"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(faq._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium">{editingFaq ? 'Edit FAQ' : 'Add FAQ'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-neutral-100 rounded-full">
                <XCircle size={24} className="text-neutral-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Question</label>
                <input
                  type="text"
                  required
                  value={formData.question}
                  onChange={e => setFormData({ ...formData, question: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-[#0a4d2b]/30 outline-none transition-colors"
                  placeholder="Enter question"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Answer</label>
                <textarea
                  required
                  rows={4}
                  value={formData.answer}
                  onChange={e => setFormData({ ...formData, answer: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-[#0a4d2b]/30 outline-none transition-colors resize-none"
                  placeholder="Enter answer"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-black focus:ring-[#0a4d2b]/30"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-neutral-700">Active (Visible to users)</label>
              </div>
              <button
                type="submit"
                className="w-full bg-neutral-900 text-white py-3 rounded-xl font-medium hover:bg-neutral-800 transition-colors shadow-sm mt-4"
              >
                {editingFaq ? 'Update FAQ' : 'Create FAQ'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFaqs;
