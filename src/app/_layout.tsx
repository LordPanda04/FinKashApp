import { Stack } from "expo-router";
import { RepositoriesProvider } from "@/data/RepositoriesProvider";

export default function RootLayout() {
  return (
    <RepositoriesProvider>
      <Stack />
    </RepositoriesProvider>
  );
}
