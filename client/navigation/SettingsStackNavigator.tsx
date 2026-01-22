import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SettingsScreen from "@/screens/SettingsScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type SettingsStackParamList = {
  Settings: undefined;
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
    </Stack.Navigator>
  );
}
