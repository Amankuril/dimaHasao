/* Ported from Frontend/src/modules/Hotel/app/admin/components/ConfirmationModal.jsx (tools/port.js first pass). */
import React from 'react';
import { motion, AnimatePresence } from '../../../../lib/motion';
import { AlertTriangle, CheckCircle } from 'lucide-react-native';
import { Button, Div, H3, Overlay, P, Icon as UiIcon } from '../../../../components/web';
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, type = 'danger', confirmText = 'Confirm' }) => {
  if (!isOpen) return null;
  const colors = {
    danger: {
      bg: 'bg-red-50',
      icon: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700',
    },
    success: {
      bg: 'bg-green-50',
      icon: 'text-green-600',
      button: 'bg-green-600 hover:bg-green-700',
    },
    warning: {
      bg: 'bg-amber-50',
      icon: 'text-amber-600',
      button: 'bg-amber-600 hover:bg-amber-700',
    },
  };
  const style = colors[type];
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
          className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden"
        >
          <Div className="p-6 text-center">
            <Div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${style.bg}`}>
              {type === 'success' ? (
                <UiIcon as={CheckCircle} className={style.icon} size={24} />
              ) : (
                <UiIcon as={AlertTriangle} className={style.icon} size={24} />
              )}
            </Div>
            <H3 className="text-lg font-bold text-gray-900 mb-2">{title}</H3>
            <P className="text-sm text-gray-500 mb-6">{message}</P>

            <Div className="flex gap-3">
              <Button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 px-4 py-2 text-white font-bold rounded-lg transition-colors shadow-lg ${style.button}`}
              >
                {confirmText}
              </Button>
            </Div>
          </Div>
        </motion.div>
      </Overlay>
    </AnimatePresence>
  );
};
export default ConfirmationModal;
