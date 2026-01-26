import React, { useState, useEffect } from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LocalLLMProvider } from "@/lib/localLLM";
import { AIOnboarding } from "@/components/AIOnboarding";
import { getHasSeenOnboarding, setHasSeenOnboarding } from "@/lib/storage";

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    getHasSeenOnboarding().then((seen) => {
      setShowOnboarding(!seen);
      setOnboardingChecked(true);
    });
  }, []);

  const handleOnboardingComplete = async () => {
    await setHasSeenOnboarding(true);
    setShowOnboarding(false);
  };

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LocalLLMProvider>
          <SafeAreaProvider>
            <GestureHandlerRootView style={styles.root}>
              <KeyboardProvider>
                <NavigationContainer>
                  <RootStackNavigator />
                </NavigationContainer>
                <StatusBar style="auto" />
                {onboardingChecked && (
                  <AIOnboarding
                    visible={showOnboarding}
                    onComplete={handleOnboardingComplete}
                  />
                )}
              </KeyboardProvider>
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </LocalLLMProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
