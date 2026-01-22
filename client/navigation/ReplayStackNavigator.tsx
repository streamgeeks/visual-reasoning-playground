import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ReplayScreen from "@/screens/ReplayScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ReplayStackParamList = {
  Replay: undefined;
};

const Stack = createNativeStackNavigator<ReplayStackParamList>();

export default function ReplayStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Replay"
        component={ReplayScreen}
        options={{
          headerTitle: "Instant Replay",
        }}
      />
    </Stack.Navigator>
  );
}
