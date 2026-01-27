import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SettingsScreen from "@/screens/SettingsScreen";
import DeviceCompatibilityScreen from "@/screens/DeviceCompatibilityScreen";
import PrivacyLicensesScreen from "@/screens/PrivacyLicensesScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type SettingsStackParamList = {
  Settings: undefined;
  DeviceCompatibility: undefined;
  PrivacyLicenses: undefined;
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
    </Stack.Navigator>
  );
}
