import { forwardRef, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { tw } from '../theme';

/** ScrollView with pull to refresh (permitted difference 5). */
const RefreshableScroll = forwardRef(function RefreshableScroll({ onRefresh, children, ...props }, ref) {
  const [refreshing, setRefreshing] = useState(false);
  const handle = async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  };
  return (
    <ScrollView
      ref={ref}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={handle} tintColor={tw.primary} colors={[tw.primary]} /> : undefined}
      {...props}
    >
      {children}
    </ScrollView>
  );
});

export default RefreshableScroll;
