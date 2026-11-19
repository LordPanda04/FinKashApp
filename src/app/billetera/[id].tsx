import { useLocalSearchParams } from "expo-router";
import { WalletDetailScreen } from "@/features/billeteras/WalletDetailScreen";

export default function BilleteraDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WalletDetailScreen walletId={id} />;
}
