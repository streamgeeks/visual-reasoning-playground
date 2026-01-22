import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { GalleryScreen } from "@/screens/GalleryScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type GalleryStackParamList = {
  Gallery: undefined;
};

const Stack = createNativeStackNavigator<GalleryStackParamList>();

export default function GalleryStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Gallery"
        component={GalleryScreen}
        options={{
          headerTitle: "Gallery",
        }}
      />
    </Stack.Navigator>
  );
}
