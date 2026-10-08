/* Ported from Frontend/src/modules/Food/components/admin/campaigns/AddEditBasicCampaignDialog.jsx. */
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../../components/shadcn';
import { Field, INPUT, INPUT_ERROR, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../admin/ui';
import { Button, Div, Form, Input, Span } from '../../../../components/web';
export default function AddEditBasicCampaignDialog({ isOpen, onOpenChange, campaign, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    dateStart: '',
    dateEnd: '',
    timeStart: '',
    timeEnd: '',
  });
  const [errors, setErrors] = useState({});
  const { tablet } = useLayoutWidth();
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
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>{campaign ? 'Edit Campaign' : 'Add New Campaign'}</DialogTitle>
          <DialogDescription>{campaign ? 'Update campaign information' : 'Create a new basic campaign'}</DialogDescription>
        </DialogHeader>

        <Form onSubmit={handleSubmit}>
          <Div className="px-4 py-3 gap-3">
            <Field label="Title" required error={errors.title}>
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
                className={errors.title ? INPUT_ERROR : INPUT}
                required
              />
            </Field>

            <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-3`}>
              <Field label="Start Date" required error={errors.dateStart}>
                <Input
                  type="date"
                  value={formData.dateStart}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      dateStart: e.target.value,
                    }))
                  }
                  className={errors.dateStart ? INPUT_ERROR : INPUT}
                  required
                />
              </Field>

              <Field label="End Date" required error={errors.dateEnd}>
                <Input
                  type="date"
                  value={formData.dateEnd}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      dateEnd: e.target.value,
                    }))
                  }
                  className={errors.dateEnd ? INPUT_ERROR : INPUT}
                  required
                />
              </Field>

              <Field label="Start Time" required error={errors.timeStart}>
                <Input
                  type="time"
                  value={formData.timeStart}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      timeStart: e.target.value,
                    }))
                  }
                  className={errors.timeStart ? INPUT_ERROR : INPUT}
                  required
                />
              </Field>

              <Field label="End Time" required error={errors.timeEnd}>
                <Input
                  type="time"
                  value={formData.timeEnd}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      timeEnd: e.target.value,
                    }))
                  }
                  className={errors.timeEnd ? INPUT_ERROR : INPUT}
                  required
                />
              </Field>
            </Div>
          </Div>

          <Div className="px-4 py-3 border-t border-slate-200 flex-row items-center gap-2">
            <Button type="button" onClick={() => onOpenChange(false)} className={`${BTN_SECONDARY} flex-1`}>
              <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
            </Button>
            <Button type="submit" className={`${BTN_PRIMARY} flex-1`}>
              <Span className={BTN_TEXT_PRIMARY}>{campaign ? 'Update Campaign' : 'Create Campaign'}</Span>
            </Button>
          </Div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
