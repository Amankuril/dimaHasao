/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminFaqs.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, X, CircleHelp } from 'lucide-react-native';
import adminService from '../../../services/adminService';
import { toast } from '../../../../lib/notify';
import { Button, CheckBox, Div, Form, H2, Input, Overlay, P, ScrollDiv, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
  Toolbar,
  Field,
  StatusBadge,
  LoadingState,
  EmptyState,
  ErrorState,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
import { window } from '../../../../lib/webShim';
const AdminFaqs = () => {
  const [activeTab, setActiveTab] = useState('user'); // 'user' or 'partner'
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
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
      setLoadError(null);
      const data = await adminService.getAllFaqs({
        audience: activeTab,
      });
      setFaqs(data);
    } catch (error) {
      toast.error('Failed to load FAQs');
      setLoadError(error?.response?.data?.message || error?.message || 'Failed to load FAQs.');
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
    <AdminPage maxWidth={900}>
      <PageHeader
        icon={CircleHelp}
        title="FAQ Management"
        subtitle="Manage frequently asked questions for users and partners."
        breadcrumb={[{ label: 'Hotel' }, { label: 'FAQs' }]}
        actions={
          <Button onClick={() => handleOpenModal()} className={BTN_PRIMARY}>
            <UiIcon as={Plus} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>Add FAQ</Span>
          </Button>
        }
      />

      {/* Audience tabs */}
      <Toolbar>
        <Button onClick={() => setActiveTab('user')} className={activeTab === 'user' ? BTN_PRIMARY : BTN_SECONDARY}>
          <Span className={activeTab === 'user' ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>User FAQs</Span>
        </Button>
        <Button onClick={() => setActiveTab('partner')} className={activeTab === 'partner' ? BTN_PRIMARY : BTN_SECONDARY}>
          <Span className={activeTab === 'partner' ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>Partner FAQs</Span>
        </Button>
      </Toolbar>

      {/* Search */}
      <Card className="mb-3">
        <Div className="justify-center">
          <UiIcon as={Search} size={16} className="absolute left-3 z-10 text-slate-400" />
          <Input
            type="text"
            placeholder="Search FAQs…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${INPUT} pl-9`}
          />
        </Div>
      </Card>

      {/* List */}
      {loadError ? (
        <ErrorState title="Could not load FAQs" message={loadError} onRetry={fetchFaqs} />
      ) : loading ? (
        <LoadingState label="Loading FAQs…" />
      ) : filteredFaqs.length === 0 ? (
        <EmptyState
          icon={CircleHelp}
          title={searchQuery ? 'No FAQs match that search' : 'No FAQs yet'}
          message={searchQuery ? 'Try a shorter search term.' : `Add the first ${activeTab} FAQ so people stop asking.`}
          actionLabel={searchQuery ? 'Clear search' : 'Add FAQ'}
          onAction={searchQuery ? () => setSearchQuery('') : () => handleOpenModal()}
        />
      ) : (
        <Div className="gap-3">
          {filteredFaqs.map((faq) => (
            <Card key={faq._id}>
              <Div className="flex-row items-start justify-between gap-3">
                <Div className="flex-1 min-w-0 gap-1">
                  <Div className="flex-row flex-wrap items-center gap-2">
                    <P className="text-base font-semibold text-slate-900 flex-1 min-w-0">{faq.question}</P>
                    {!faq.isActive ? <StatusBadge status="inactive" label="Inactive" /> : null}
                  </Div>
                  <P numberOfLines={3} className="text-sm text-slate-500">
                    {faq.answer}
                  </P>
                </Div>
                <Div className="flex-row items-center gap-1 shrink-0">
                  <Button
                    onClick={() => handleOpenModal(faq)}
                    className="w-11 h-11 rounded-lg items-center justify-center"
                    accessibilityLabel={`Edit FAQ: ${faq.question}`}
                  >
                    <UiIcon as={Edit} size={18} className="text-blue-600" />
                  </Button>
                  <Button
                    onClick={() => handleDelete(faq._id)}
                    className="w-11 h-11 rounded-lg items-center justify-center"
                    accessibilityLabel={`Delete FAQ: ${faq.question}`}
                  >
                    <UiIcon as={Trash2} size={18} className="text-red-600" />
                  </Button>
                </Div>
              </Div>
            </Card>
          ))}
        </Div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <Overlay onClose={() => setIsModalOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <ScrollDiv className="bg-white rounded-xl border border-slate-200 w-full max-w-lg p-4 max-h-[90vh] flex-grow-0">
            <Div className="flex-row items-center justify-between gap-3 mb-4">
              <H2 className="text-xl font-bold text-slate-900 flex-1">{editingFaq ? 'Edit FAQ' : 'Add New FAQ'}</H2>
              <Button
                onClick={() => setIsModalOpen(false)}
                className="w-11 h-11 rounded-lg items-center justify-center"
                accessibilityLabel="Close"
              >
                <UiIcon as={X} size={20} className="text-slate-500" />
              </Button>
            </Div>
            <Form onSubmit={handleSubmit} className="gap-3">
              <Field label="Question" required>
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
                  className={INPUT}
                  placeholder="Enter question"
                />
              </Field>
              <Field label="Answer" required>
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
                  className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                  placeholder="Enter answer"
                />
              </Field>
              <Div className="flex-row items-center gap-2 py-1">
                <CheckBox
                  className="w-5 h-5"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      isActive: e.target.checked,
                    })
                  }
                />
                <P className="text-sm text-slate-700">Active (visible to users)</P>
              </Div>
              <Button type="submit" className={BTN_PRIMARY}>
                <Span className={BTN_TEXT_PRIMARY}>{editingFaq ? 'Update FAQ' : 'Create FAQ'}</Span>
              </Button>
            </Form>
          </ScrollDiv>
        </Overlay>
      )}
    </AdminPage>
  );
};
export default AdminFaqs;
