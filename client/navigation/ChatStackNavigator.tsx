import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ChatScreen } from "@/screens/ChatScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ChatStackParamList = {
  Chat: undefined;
};

const Stack = createNativeStackNavigator<ChatStackParamList>();

export default function ChatStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          headerTitle: "Chat",
        }}
      />
    </Stack.Navigator>
  );
}
