import { useEffect, useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { useRepositories } from "@/data/RepositoriesProvider";

// Pantalla TEMPORAL (se reemplaza en la Fase 6): comprueba que la base local real funciona.
export default function Index() {
  const { categories, movements } = useRepositories();
  const [counts, setCounts] = useState<{ categories: number; movements: number } | null>(null);

  useEffect(() => {
    (async () => {
      setCounts({
        categories: (await categories.list()).length,
        movements: (await movements.list()).length,
      });
    })();
  }, [categories, movements]);

  return (
    <View style={styles.container}>
      <Text>Base local lista</Text>
      <Text testID="counts">
        {counts ? `Categorías: ${counts.categories} · Movimientos: ${counts.movements}` : "Leyendo…"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
