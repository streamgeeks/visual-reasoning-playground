import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";



import LiveStackNavigator from "@/navigation/LiveStackNavigator";
import GalleryStackNavigator from "@/navigation/GalleryStackNavigator";
import ReplayStackNavigator from "@/navigation/ReplayStackNavigator";
import SettingsStackNavigator from "@/navigation/SettingsStackNavigator";
import { useTheme } from "@/hooks/useTheme";

export type MainTabParamList = {
  LiveTab: undefined;
  GalleryTab: undefined;
  ReplayTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="LiveTab"
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "#0A0E14",
          borderTopWidth: 1,
          borderTopColor: "#1A1F29",
          elevation: 0,
          height: 56,
          paddingBottom: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="LiveTab"
        component={LiveStackNavigator}
        options={{
          title: "Live",
          tabBarIcon: ({ color, size }) => (
            <Feather name="video" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="GalleryTab"
        component={GalleryStackNavigator}
        options={{
          title: "Gallery",
          tabBarIcon: ({ color, size }) => (
            <Feather name="image" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ReplayTab"
        component={ReplayStackNavigator}
        options={{
          title: "Replay",
          tabBarIcon: ({ color, size }) => (
            <Feather name="rotate-ccw" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStackNavigator}
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Feather name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
