import { useAuth } from "@/src/providers/AuthProvider";
import { Redirect } from "expo-router";
import { Tabs } from "expo-router";

export default function AppLayout() {
  const { token, isLoading } = useAuth();

  if (isLoading) return null;

  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarLabelStyle: { fontSize: 14 },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: "Today",
          tabBarLabel: "Today",
          tabBarTestID: "nav-today",
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: "Habits",
          tabBarLabel: "Habits",
          tabBarTestID: "nav-habits",
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "Insights",
          tabBarLabel: "Insights",
          tabBarTestID: "nav-insights",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarLabel: "Settings",
          tabBarTestID: "nav-settings",
        }}
      />
      <Tabs.Screen
        name="share"
        options={{ href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="invite"
        options={{ href: null, tabBarButton: () => null }}
      />
      {__DEV__ && (
        <Tabs.Screen
          name="demo"
          options={{ href: null, tabBarButton: () => null }}
        />
      )}
    </Tabs>
  );
}
