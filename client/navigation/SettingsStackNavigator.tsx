import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SettingsScreen from "@/screens/SettingsScreen";
import DeviceCompatibilityScreen from "@/screens/DeviceCompatibilityScreen";
import PrivacyLicensesScreen from "@/screens/PrivacyLicensesScreen";
import AboutScreen from "@/screens/AboutScreen";
import DocumentationScreen from "@/screens/DocumentationScreen";
import SecurityDashboardScreen from "@/screens/SecurityDashboardScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type SettingsStackParamList = {
  Settings: undefined;
  DeviceCompatibility: undefined;
  PrivacyLicenses: undefined;
  About: undefined;
  Documentation: undefined;
  SecurityDashboard: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerTitle: "Settings",
        }}
      />
      <Stack.Screen
        name="DeviceCompatibility"
        component={DeviceCompatibilityScreen}
        options={{
          headerTitle: "Device Compatibility",
        }}
      />
      <Stack.Screen
        name="PrivacyLicenses"
        component={PrivacyLicensesScreen}
        options={{
          headerTitle: "Privacy & Licenses",
        }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{
          headerTitle: "About Visual Reasoning",
        }}
      />
      <Stack.Screen
        name="Documentation"
        component={DocumentationScreen}
        options={{
          headerTitle: "Documentation",
        }}
      />
      <Stack.Screen
        name="SecurityDashboard"
        component={SecurityDashboardScreen}
        options={{
          headerTitle: "Security & Privacy",
        }}
      />
    </Stack.Navigator>
  );
}
