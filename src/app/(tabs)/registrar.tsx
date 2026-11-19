import { EmptyState } from "@/ui/EmptyState";
import { Screen } from "@/ui/Screen";

export default function Registrar() {
  return (
    <Screen title="Registrar movimiento" backdrop="primary">
      <EmptyState message="Aquí irá el formulario para registrar movimientos." />
    </Screen>
  );
}
