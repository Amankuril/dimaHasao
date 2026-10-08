/* Ported from Frontend/src/modules/Food/components/admin/campaigns/DeleteCampaignDialog.jsx. */
import { AlertTriangle } from 'lucide-react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../../components/shadcn';
import { BTN_DANGER, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY } from '../../../../admin/ui';
import { Button, Div, P, Span, Icon as UiIcon } from '../../../../components/web';
export default function DeleteCampaignDialog({ isOpen, onOpenChange, campaign, onConfirm }) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>Delete Campaign</DialogTitle>
          <DialogDescription>This action cannot be undone. This will permanently delete the campaign.</DialogDescription>
        </DialogHeader>

        {campaign && (
          <Div className="px-4 pb-4 gap-3">
            <Div className="flex-row items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <UiIcon as={AlertTriangle} size={16} className="text-red-700 mt-0.5" />
              <P className="text-sm text-red-700 flex-1">
                {'Are you sure you want to delete '}
                <Span className="font-semibold">{`"${campaign.title}"`}</Span>?
              </P>
            </Div>

            <Div className="flex-row items-center gap-2">
              <Button onClick={() => onOpenChange(false)} className={`${BTN_SECONDARY} flex-1`}>
                <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
              </Button>
              <Button
                onClick={() => {
                  onConfirm(campaign.sl);
                  onOpenChange(false);
                }}
                className={`${BTN_DANGER} flex-1`}
              >
                <Span className={BTN_TEXT_PRIMARY}>Delete</Span>
              </Button>
            </Div>
          </Div>
        )}
      </DialogContent>
    </Dialog>
  );
}
