import { TabList, TabSlot, TabTrigger, Tabs } from "expo-router/ui";
import { TabBar } from "@/ui/TabBar";

// La barra visible es `TabBar` (personalizada); `TabList` solo declara las rutas y queda oculta.
export default function TabsLayout() {
  return (
    <Tabs options={{ backBehavior: "history" }}>
      <TabSlot />
      <TabBar />
      <TabList style={{ display: "none" }}>
        <TabTrigger name="index" href="/" />
        <TabTrigger name="historial" href="/historial" />
        <TabTrigger name="registrar" href="/registrar" />
        <TabTrigger name="billeteras" href="/billeteras" />
        <TabTrigger name="categorias" href="/categorias" />
      </TabList>
    </Tabs>
  );
}
