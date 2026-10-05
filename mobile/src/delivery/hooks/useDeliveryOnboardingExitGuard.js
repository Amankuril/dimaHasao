import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useNavigation } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { clearDeliveryOnboardingData } from '../onboardingStorage';

/*
 * Ports hooks/useDeliveryOnboardingExitGuard.js + shared/hooks/useOnboardingExitGuard.js.
 * The web traps the browser back button with history.pushState + popstate;
 * here the navigator's beforeRemove event (hardware back, swipe back) is
 * intercepted the same way. First step: confirm exit if there is progress.
 * Later steps: go to the previous step and keep the saved progress.
 */
export default function useDeliveryOnboardingExitGuard(step, hasUnsavedProgress) {
  const navigation = useNavigation();
  const { clearSession } = useAuth();
  const [showExitModal, setShowExitModal] = useState(false);
  const allowLeave = useRef(false);
  const isFirstStep = step === 'details';

  const onExit = useCallback(() => {
    allowLeave.current = true;
    clearDeliveryOnboardingData(clearSession);
    router.replace('/food/delivery/login');
  }, [clearSession]);

  const onPreviousStep = useCallback(() => {
    allowLeave.current = true;
    router.dismissTo('/food/delivery/signup/details');
  }, []);

  const requestExit = useCallback(() => {
    const dirty = isFirstStep && typeof hasUnsavedProgress === 'function' ? hasUnsavedProgress() : false;
    if (dirty) {
      setShowExitModal(true);
      return;
    }
    onExit();
  }, [hasUnsavedProgress, isFirstStep, onExit]);

  const handleBack = useCallback(() => {
    if (isFirstStep) requestExit();
    else onPreviousStep();
  }, [isFirstStep, onPreviousStep, requestExit]);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (allowLeave.current) return;
        // Forward navigation (Continue) replaces nothing; only back actions land here.
        if (!['GO_BACK', 'POP', 'POP_TO_TOP'].includes(e.data.action.type)) return;
        e.preventDefault();
        handleBack();
      }),
    [navigation, handleBack],
  );

  return {
    showExitModal,
    handleBack,
    handleStay: () => setShowExitModal(false),
    handleExit: onExit,
    requestExit,
  };
}
