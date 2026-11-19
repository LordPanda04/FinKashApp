import { useLocalSearchParams } from "expo-router";
import { EditarMovimientoScreen } from "@/features/movimientos/EditarMovimientoScreen";

export default function EditarMovimiento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditarMovimientoScreen movementId={id} />;
}
