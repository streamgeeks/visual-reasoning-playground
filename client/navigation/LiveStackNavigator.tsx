import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LiveScreen from "@/screens/LiveScreen";
import ModelInfoScreen from "@/screens/ModelInfoScreen";
import MusicModeScreen from "@/screens/MusicModeScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type LiveStackParamList = {
  Live: undefined;
  ModelInfo: undefined;
  MusicMode: undefined;
};

const Stack = createNativeStackNavigator<LiveStackParamList>();

export default function LiveStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Live"
        component={LiveScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Visual Reasoning" />,
        }}
      />
<Stack.Screen
        name="ModelInfo"
        component={ModelInfoScreen}
        options={{
          headerTitle: "Model Information",
        }}
      />
      <Stack.Screen
        name="MusicMode"
        component={MusicModeScreen}
        options={{
          headerTitle: "Music Mode",
        }}
      />
    </Stack.Navigator>
  );
}
