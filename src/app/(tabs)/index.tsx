import { AppText } from "@/ui/AppText";
import { EmptyState } from "@/ui/EmptyState";
import { Screen } from "@/ui/Screen";
import { colors } from "@/ui/tokens";

// Inicio no lleva título de pantalla: empieza con el saludo (Stitch). El nombre llegará con el perfil.
export default function Inicio() {
  return (
    <Screen backdrop="primary">
      <AppText variant="headlineLg" color={colors.onBackground}>
        Hola!
      </AppText>
      <EmptyState message="Aquí irá el resumen de tus finanzas." />
    </Screen>
  );
}
