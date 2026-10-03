import React from 'react';
import {SafeAreaView, Text, View} from 'react-native';

/**
 * Stand-in for a screen not yet ported. Lets the navigator (and every
 * screen that links to it) be wired up and bundle-tested before the real
 * screen exists — later tasks replace the screen file's contents, not the
 * navigation route.
 */
export default function Placeholder({title, note}) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-lg font-semibold text-foreground text-center">{title}</Text>
        {note ? <Text className="mt-2 text-sm text-muted-foreground text-center">{note}</Text> : null}
      </View>
    </SafeAreaView>
  );
}
