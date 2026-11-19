import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useQuery } from '@/data/useQuery';
import { AppText } from '@/ui/AppText';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { colors } from '@/ui/tokens';
import { BankDebtsCard, PersonalDebtsCard } from './DebtSections';
import { cardSummary, groupDebts, splitWallets, walletBalances } from './presenter';
import { AddWalletCard, WalletCard } from './WalletCard';
import { WalletForm } from './WalletForm';

export function BilleterasScreen() {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const { data, error } = useQuery(async (r) => ({
    wallets: await r.wallets.listWallets(),
    cards: await r.wallets.listCards(),
    debts: await r.debts.list(),
    state: await r.ledger.state(),
  }));

  const { visible, hidden } = splitWallets(data?.wallets ?? []);
  const groups = groupDebts(data?.debts ?? []);
  const cards = (data?.cards ?? []).filter((c) => !c.isHidden).map((card) => ({ card, summary: cardSummary(data!.state, card) }));
  const openWallet = (id: string) => router.push(`/billetera/${id}` as Href);

  const renderWallet = (w: (typeof visible)[number]) => (
    <WalletCard key={w.id} wallet={w} balances={walletBalances(data!.state, w)} onPress={() => openWallet(w.id)} />
  );

  return (
    <Screen backdrop="yape">
      <AppText variant="headlineLg" color={colors.onBackground} accessibilityRole="header">
        Billeteras
      </AppText>
      {error ? <AppText color={colors.danger}>No se pudieron leer las billeteras.</AppText> : null}

      <ScrollView contentContainerStyle={{ gap: 20, paddingBottom: 8 }}>
        <AppText variant="headlineMd">Mis Billeteras</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {data ? visible.map(renderWallet) : null}
          <AddWalletCard onPress={() => setFormOpen(true)} />
        </View>

        {hidden.length > 0 ? (
          <View style={{ gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Billeteras ocultas (${hidden.length})`}
              accessibilityState={{ expanded: hiddenOpen }}
              onPress={() => setHiddenOpen((v) => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <AppText variant="labelLg" color={colors.onSurfaceMuted}>
                {`Billeteras ocultas (${hidden.length})`}
              </AppText>
              <Icon name={hiddenOpen ? 'expand_less' : 'expand_more'} size={20} color={colors.onSurfaceMuted} />
            </Pressable>
            {hiddenOpen ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>{hidden.map(renderWallet)}</View> : null}
          </View>
        ) : null}

        <AppText variant="headlineMd">Deudas personales</AppText>
        <PersonalDebtsCard title="Me deben" tone="primary" debts={groups.receivable} />
        <PersonalDebtsCard title="Debo" tone="danger" debts={groups.payablePersons} />
        <BankDebtsCard cards={cards} institutions={groups.payableInstitutions} />
      </ScrollView>

      {formOpen ? <WalletForm onClose={() => setFormOpen(false)} /> : null}
    </Screen>
  );
}
