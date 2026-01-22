import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import PresetsScreen from "@/screens/PresetsScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type PresetsStackParamList = {
  Presets: undefined;
};

const Stack = createNativeStackNavigator<PresetsStackParamList>();

export default function PresetsStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Presets"
        component={PresetsScreen}
        options={{
          headerTitle: "Presets",
        }}
      />
    </Stack.Navigator>
  );
}
