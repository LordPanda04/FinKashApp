import { EmptyState } from "@/ui/EmptyState";
import { Screen } from "@/ui/Screen";

export default function Billeteras() {
  return (
    <Screen title="Billeteras" backdrop="yape">
      <EmptyState message="Aquí irán tus billeteras, tarjetas y deudas." />
    </Screen>
  );
}
