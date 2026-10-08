/* Ported from Frontend/src/modules/Hotel/app/admin/components/ConfirmationModal.jsx (tools/port.js first pass). */
import React from 'react';
import { motion, AnimatePresence } from '../../../../lib/motion';
import { AlertTriangle, CheckCircle } from 'lucide-react-native';
import { Button, Div, H3, Overlay, P, Icon as UiIcon } from '../../../../components/web';
import { BTN_DANGER, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY } from '../../../../admin/ui';
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, type = 'danger', confirmText = 'Confirm' }) => {
  if (!isOpen) return null;
  const styles = {
    danger: { bg: 'bg-red-100', icon: 'text-red-700', button: BTN_DANGER, text: BTN_TEXT_PRIMARY },
    success: { bg: 'bg-green-100', icon: 'text-green-700', button: BTN_PRIMARY, text: BTN_TEXT_PRIMARY },
    warning: { bg: 'bg-amber-100', icon: 'text-amber-700', button: BTN_PRIMARY, text: BTN_TEXT_PRIMARY },
  };
  const style = styles[type] || styles.danger;
  return (
    <AnimatePresence>
      <Overlay onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{
            opacity: 0,
            scale: 0.95,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          exit={{
            opacity: 0,
            scale: 0.95,
          }}
          className="bg-white rounded-xl border border-slate-200 max-w-sm w-full overflow-hidden"
        >
          <Div className="p-4 items-center">
            <Div className={`w-12 h-12 rounded-full items-center justify-center mb-3 ${style.bg}`}>
              <UiIcon as={type === 'success' ? CheckCircle : AlertTriangle} className={style.icon} size={22} />
            </Div>
            <H3 className="text-base font-semibold text-slate-900 text-center mb-1">{title}</H3>
            <P className="text-sm text-slate-500 text-center mb-4">{message}</P>

            <Div className="flex-row gap-2 w-full">
              <Button onClick={onClose} className={`${BTN_SECONDARY} flex-1`}>
                <P className={BTN_TEXT_SECONDARY}>Cancel</P>
              </Button>
              <Button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`${style.button} flex-1`}
              >
                <P numberOfLines={1} className={style.text}>
                  {confirmText}
                </P>
              </Button>
            </Div>
          </Div>
        </motion.div>
      </Overlay>
    </AnimatePresence>
  );
};
export default ConfirmationModal;
