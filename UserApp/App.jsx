/**
 * @format
 */

import React from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {QueryClientProvider} from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import './global.css';

import {queryClient} from './src/app/queryClient';
import {BookingProvider} from './src/context/BookingContext';
import {SettingsProvider} from './src/context/SettingsContext';
import {FoodCartProvider} from './src/context/FoodCartContext';
import {FoodOrdersProvider} from './src/context/FoodOrdersContext';
import {FoodProfileProvider} from './src/context/FoodProfileContext';
import RootNavigator from './src/navigation/RootNavigator';

function App() {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <BookingProvider>
            <SettingsProvider>
              <FoodProfileProvider>
                <FoodCartProvider>
                  <FoodOrdersProvider>
                    <RootNavigator />
                    <Toast />
                  </FoodOrdersProvider>
                </FoodCartProvider>
              </FoodProfileProvider>
            </SettingsProvider>
          </BookingProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
