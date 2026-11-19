import { EmptyState } from "@/ui/EmptyState";
import { Screen } from "@/ui/Screen";

export default function Categorias() {
  return (
    <Screen title="Categorías" backdrop="plin">
      <EmptyState message="Aquí irán tus categorías de gasto e ingreso." />
    </Screen>
  );
}
