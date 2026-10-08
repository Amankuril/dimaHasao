/* Ported from Frontend/src/modules/Food/components/admin/campaigns/DeleteCampaignDialog.jsx. */
import { AlertTriangle, X } from 'lucide-react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../../components/shadcn';
import { Button, Div, P, Span, Icon as UiIcon } from '../../../../components/web';
export default function DeleteCampaignDialog({ isOpen, onOpenChange, campaign, onConfirm }) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
          <DialogTitle className="flex items-center gap-2">
            <UiIcon as={AlertTriangle} className="w-5 h-5 text-red-600" />
            Delete Campaign
          </DialogTitle>
          <DialogDescription>This action cannot be undone. This will permanently delete the campaign.</DialogDescription>
        </DialogHeader>

        {campaign && (
          <Div className="px-6 py-6 space-y-4">
            <Div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <P className="text-sm text-red-800">
                Are you sure you want to delete <Span className="font-semibold">{`"${campaign.title}"`}</Span>?
              </P>
            </Div>

            <Div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onConfirm(campaign.sl);
                  onOpenChange(false);
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all shadow-md"
              >
                Delete
              </Button>
            </Div>
          </Div>
        )}
      </DialogContent>
    </Dialog>
  );
}
