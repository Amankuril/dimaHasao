/* Ported from Frontend/src/modules/Food/components/admin/campaigns/AddEditBasicCampaignDialog.jsx. */
import { Plus, Pencil, Calendar, Clock } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../../components/shadcn';
import { Button, Div, Form, Input, Label, P, Span, Icon as UiIcon } from '../../../../components/web';
export default function AddEditBasicCampaignDialog({ isOpen, onOpenChange, campaign, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    dateStart: '',
    dateEnd: '',
    timeStart: '',
    timeEnd: '',
  });
  const [errors, setErrors] = useState({});
  useEffect(() => {
    if (campaign) {
      setFormData({
        title: campaign.title || '',
        dateStart: campaign.dateStart || '',
        dateEnd: campaign.dateEnd || '',
        timeStart: campaign.timeStart || '',
        timeEnd: campaign.timeEnd || '',
      });
    } else {
      setFormData({
        title: '',
        dateStart: '',
        dateEnd: '',
        timeStart: '',
        timeEnd: '',
      });
    }
    setErrors({});
  }, [campaign, isOpen]);
  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.dateStart) {
      newErrors.dateStart = 'Start date is required';
    }
    if (!formData.dateEnd) {
      newErrors.dateEnd = 'End date is required';
    }
    if (formData.dateStart && formData.dateEnd) {
      const start = new Date(formData.dateStart);
      const end = new Date(formData.dateEnd);
      if (end < start) {
        newErrors.dateEnd = 'End date must be after start date';
      }
    }
    if (!formData.timeStart) {
      newErrors.timeStart = 'Start time is required';
    }
    if (!formData.timeEnd) {
      newErrors.timeEnd = 'End time is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
      onOpenChange(false);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
          <DialogTitle className="flex items-center gap-2">
            {campaign ? <UiIcon as={Pencil} className="w-5 h-5 text-blue-600" /> : <UiIcon as={Plus} className="w-5 h-5 text-blue-600" />}
            {campaign ? 'Edit Campaign' : 'Add New Campaign'}
          </DialogTitle>
          <DialogDescription>{campaign ? 'Update campaign information' : 'Create a new basic campaign'}</DialogDescription>
        </DialogHeader>

        <Form onSubmit={handleSubmit}>
          <Div className="px-6 py-6 space-y-6">
            <Div>
              <Label className="block text-sm font-semibold text-slate-700 mb-2">
                Title <Span className="text-red-500">*</Span>
              </Label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="Enter campaign title"
                className={`w-full px-4 py-2.5 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${errors.title ? 'border-red-500' : 'border-slate-300'}`}
                required
              />
              {errors.title && <P className="text-xs text-red-500 mt-1">{errors.title}</P>}
            </Div>

            <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">
                  Start Date <Span className="text-red-500">*</Span>
                </Label>
                <Div className="relative">
                  <Input
                    type="date"
                    value={formData.dateStart}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        dateStart: e.target.value,
                      }))
                    }
                    className={`w-full px-4 py-2.5 pr-10 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${errors.dateStart ? 'border-red-500' : 'border-slate-300'}`}
                    required
                  />
                  <UiIcon as={Calendar} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </Div>
                {errors.dateStart && <P className="text-xs text-red-500 mt-1">{errors.dateStart}</P>}
              </Div>

              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">
                  End Date <Span className="text-red-500">*</Span>
                </Label>
                <Div className="relative">
                  <Input
                    type="date"
                    value={formData.dateEnd}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        dateEnd: e.target.value,
                      }))
                    }
                    className={`w-full px-4 py-2.5 pr-10 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${errors.dateEnd ? 'border-red-500' : 'border-slate-300'}`}
                    required
                  />
                  <UiIcon as={Calendar} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </Div>
                {errors.dateEnd && <P className="text-xs text-red-500 mt-1">{errors.dateEnd}</P>}
              </Div>
            </Div>

            <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">
                  Start Time <Span className="text-red-500">*</Span>
                </Label>
                <Div className="relative">
                  <Input
                    type="time"
                    value={formData.timeStart}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        timeStart: e.target.value,
                      }))
                    }
                    className={`w-full px-4 py-2.5 pr-10 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${errors.timeStart ? 'border-red-500' : 'border-slate-300'}`}
                    required
                  />
                  <UiIcon as={Clock} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </Div>
                {errors.timeStart && <P className="text-xs text-red-500 mt-1">{errors.timeStart}</P>}
              </Div>

              <Div>
                <Label className="block text-sm font-semibold text-slate-700 mb-2">
                  End Time <Span className="text-red-500">*</Span>
                </Label>
                <Div className="relative">
                  <Input
                    type="time"
                    value={formData.timeEnd}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        timeEnd: e.target.value,
                      }))
                    }
                    className={`w-full px-4 py-2.5 pr-10 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${errors.timeEnd ? 'border-red-500' : 'border-slate-300'}`}
                    required
                  />
                  <UiIcon as={Clock} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </Div>
                {errors.timeEnd && <P className="text-xs text-red-500 mt-1">{errors.timeEnd}</P>}
              </Div>
            </Div>
          </Div>

          <Div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
            >
              Cancel
            </Button>
            <Button type="submit" className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md">
              {campaign ? 'Update Campaign' : 'Create Campaign'}
            </Button>
          </Div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
