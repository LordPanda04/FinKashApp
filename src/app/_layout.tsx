import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Appearance } from "react-native";
import { RepositoriesProvider } from "@/data/RepositoriesProvider";
import { FontStatusContext } from "@/ui/AppText";
import { useAppFonts } from "@/ui/fonts";

// El diseño de Stitch es solo claro. El splash se mantiene hasta que Inter cargue (o falle).
Appearance.setColorScheme("light");
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const { ready, failed } = useAppFonts();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;
  return (
    <FontStatusContext.Provider value={{ interLoaded: !failed }}>
      <RepositoriesProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </RepositoriesProvider>
    </FontStatusContext.Provider>
  );
}
