import { useEffect } from 'react';
import { useNavigation } from 'expo-router';
import { confirm } from './notify';

/** Asks before leaving a screen with unsaved edits. */
export function useUnsavedGuard(dirty, { title = 'Discard changes?', message = 'You have unsaved changes.' } = {}) {
  const navigation = useNavigation();
  useEffect(() => {
    if (!dirty) return undefined;
    return navigation.addListener('beforeRemove', (e) => {
      e.preventDefault();
      confirm(title, message, { confirmText: 'Discard', destructive: true }).then((ok) => {
        if (ok) navigation.dispatch(e.data.action);
      });
    });
  }, [dirty, navigation, title, message]);
}
