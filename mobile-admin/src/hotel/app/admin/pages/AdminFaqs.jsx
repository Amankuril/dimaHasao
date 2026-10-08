/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminFaqs.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, XCircle } from 'lucide-react-native';
import adminService from '../../../services/adminService';
import { toast } from '../../../../lib/notify';
import { Button, Div, Form, H1, H2, H3, Input, Label, Overlay, P, ScrollDiv, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import { window } from '../../../../lib/webShim';
const AdminFaqs = () => {
  const [activeTab, setActiveTab] = useState('user'); // 'user' or 'partner'
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    isActive: true,
  });
  useEffect(() => {
    fetchFaqs();
  }, [activeTab]);
  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAllFaqs({
        audience: activeTab,
      });
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
        order: faq.order,
      });
    } else {
      setEditingFaq(null);
      setFormData({
        question: '',
        answer: '',
        isActive: true,
        order: 0,
      });
    }
    setIsModalOpen(true);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        audience: activeTab,
      };
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
    if (!(await window.confirmAsync('Are you sure you want to delete this FAQ?'))) return;
    try {
      await adminService.deleteFaq(id);
      toast.success('FAQ deleted');
      fetchFaqs();
    } catch (error) {
      toast.error('Delete failed');
    }
  };
  const filteredFaqs = faqs.filter(
    (f) => f.question.toLowerCase().includes(searchQuery.toLowerCase()) || f.answer.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  return (
    <ScrollDiv className="space-y-6">
      <Div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Div>
          <H1 className="text-2xl font-bold text-gray-800">FAQ Management</H1>
          <P className="text-gray-500 text-sm">Manage frequently asked questions for Users and Partners.</P>
        </Div>
        <Button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center self-start gap-2 bg-black text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors shadow-lg active:scale-95"
        >
          <UiIcon as={Plus} size={18} /> Add FAQ
        </Button>
      </Div>

      {/* Tabs */}
      <Div className="flex p-1 bg-white rounded-xl self-start border border-gray-200 shadow-sm">
        <Button
          onClick={() => setActiveTab('user')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'user' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          User FAQs
        </Button>
        <Button
          onClick={() => setActiveTab('partner')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'partner' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Partner FAQs
        </Button>
      </Div>

      {/* Search & List */}
      <Div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <Div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <UiIcon as={Search} className="text-gray-400" size={20} />
          <Input
            type="text"
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 outline-none text-sm text-gray-700 placeholder:text-gray-400"
          />
        </Div>

        <Div className="divide-y divide-gray-50">
          {loading ? (
            <Div className="p-8 text-center text-gray-500">Loading...</Div>
          ) : filteredFaqs.length === 0 ? (
            <Div className="p-8 text-center text-gray-500">No FAQs found.</Div>
          ) : (
            filteredFaqs.map((faq) => (
              <Div key={faq._id} className="p-4 hover:bg-gray-50 transition-colors group">
                <Div className="flex items-start justify-between gap-4">
                  <Div className="flex-1 space-y-1">
                    <Div className="flex flex-wrap items-center gap-2">
                      <H3 className="font-bold text-gray-800 flex-shrink">{faq.question}</H3>
                      {!faq.isActive && <Span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase">Inactive</Span>}
                    </Div>
                    <P className="text-sm text-gray-500 line-clamp-2">{faq.answer}</P>
                  </Div>
                  <Div className="flex items-center gap-2">
                    <Button onClick={() => handleOpenModal(faq)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <UiIcon as={Edit} size={18} />
                    </Button>
                    <Button onClick={() => handleDelete(faq._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <UiIcon as={Trash2} size={18} />
                    </Button>
                  </Div>
                </Div>
              </Div>
            ))
          )}
        </Div>
      </Div>

      {/* Modal */}
      {isModalOpen && (
        <Overlay onClose={() => setIsModalOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <ScrollDiv className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 max-h-[90vh] flex-grow-0">
            <Div className="flex items-center justify-between mb-6">
              <H2 className="text-xl font-bold">{editingFaq ? 'Edit FAQ' : 'Add New FAQ'}</H2>
              <Button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <UiIcon as={XCircle} size={24} className="text-gray-400" />
              </Button>
            </Div>
            <Form onSubmit={handleSubmit} className="space-y-4">
              <Div>
                <Label className="block text-xs font-bold text-gray-500 uppercase mb-1">Question</Label>
                <Input
                  type="text"
                  required
                  value={formData.question}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      question: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all"
                  placeholder="Enter question"
                />
              </Div>
              <Div>
                <Label className="block text-xs font-bold text-gray-500 uppercase mb-1">Answer</Label>
                <Textarea
                  required
                  rows={4}
                  value={formData.answer}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      answer: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black outline-none transition-all resize-none"
                  placeholder="Enter answer"
                />
              </Div>
              <Div className="flex items-center gap-2">
                <Input
                  type="checkbox"
                  nativeID="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      isActive: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-black focus:ring-black"
                />
                <Label className="text-sm font-medium text-gray-700">Active (Visible to users)</Label>
              </Div>
              <Button
                type="submit"
                className="w-full items-center bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg active:scale-95 mt-4"
              >
                {editingFaq ? 'Update FAQ' : 'Create FAQ'}
              </Button>
            </Form>
          </ScrollDiv>
        </Overlay>
      )}
    </ScrollDiv>
  );
};
export default AdminFaqs;
