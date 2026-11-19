import { EmptyState } from "@/ui/EmptyState";
import { Screen } from "@/ui/Screen";

export default function Historial() {
  return (
    <Screen title="Historial" backdrop="plin">
      <EmptyState message="Aquí irá el historial de movimientos." />
    </Screen>
  );
}
