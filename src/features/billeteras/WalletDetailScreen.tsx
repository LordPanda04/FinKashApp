import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRepositories } from '@/data/RepositoriesContext';
import { useQuery } from '@/data/useQuery';
import { accountBalance } from '@/domain/ledger/balances';
import type { Movement, MovementType } from '@/domain/ledger/types';
import { AmountText } from '@/ui/AmountText';
import { AppText } from '@/ui/AppText';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { GroupedList } from '@/ui/GroupedList';
import { HeaderIconButton } from '@/ui/HeaderIconButton';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { colors } from '@/ui/tokens';
import { AdjustForm } from './AdjustForm';
import { EnableUsdForm } from './EnableUsdForm';
import { CURRENCY_ORDER, walletBalances } from './presenter';

const TYPE_LABEL: Record<MovementType, string> = {
  expense: 'Gasto',
  income: 'Ingreso',
  transfer: 'Transferencia',
  card_payment: 'Pago de tarjeta',
  opening: 'Apertura',
  adjustment: 'Arreglo',
};

function signFor(m: Movement, accountIds: Set<string>): 'plus' | 'minus' | 'none' {
  const into = m.destAccountId !== null && accountIds.has(m.destAccountId);
  const out = m.sourceAccountId !== null && accountIds.has(m.sourceAccountId);
  return into && !out ? 'plus' : out && !into ? 'minus' : 'none';
}

export function WalletDetailScreen({ walletId }: { walletId: string }) {
  const router = useRouter();
  const repos = useRepositories();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [usdOpen, setUsdOpen] = useState(false);
  const [confirmHide, setConfirmHide] = useState(false);

  const { data } = useQuery(async (r) => {
    const [wallets, state] = await Promise.all([r.wallets.listWallets(), r.ledger.state()]);
    const accounts = state.accounts.filter((a) => a.kind === 'wallet' && a.walletId === walletId);
    const lists = await Promise.all(accounts.map((a) => r.movements.list({ accountId: a.id })));
    const byId = new Map(lists.flat().map((m) => [m.id, m]));
    const history = [...byId.values()].sort((a, b) => (a.occurredOn === b.occurredOn ? 0 : a.occurredOn < b.occurredOn ? 1 : -1));
    return { wallet: wallets.find((w) => w.id === walletId) ?? null, state, accounts, history };
  }, [walletId]);

  const wallet = data?.wallet;
  const accountIds = new Set((data?.accounts ?? []).map((a) => a.id));
  const balances = wallet && data ? walletBalances(data.state, wallet) : {};

  return (
    <Screen backdrop="yape">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <HeaderIconButton icon="arrow_back" label="Volver" onPress={() => router.back()} />
        <AppText variant="headlineLg" color={colors.onBackground} accessibilityRole="header" style={{ flex: 1 }}>
          {wallet?.name ?? ''}
        </AppText>
      </View>

      {wallet && data ? (
        <ScrollView contentContainerStyle={{ gap: 20, paddingBottom: 8 }}>
          <View style={{ gap: 2 }}>
            {CURRENCY_ORDER.filter((c) => balances[c] !== undefined).map((c) => (
              <AmountText key={c} amountMinor={balances[c]!} currency={c} variant="headlineLg" />
            ))}
          </View>

          <GroupedList>
            <ListRow icon="tune" title="Arreglo de billetera" onPress={() => setAdjustOpen(true)} />
            <ListRow
              icon="swap_horiz"
              title="Transferir"
              onPress={() => router.push(`/registrar?tipo=transferencia&desde=${data.accounts[0]?.id ?? ''}` as Href)}
            />
            {data.accounts.some((a) => a.currency === 'USD') ? null : (
              <ListRow icon="payments" title="Habilitar cuenta en dólares" onPress={() => setUsdOpen(true)} />
            )}
            {wallet.isHidden ? (
              <ListRow icon="visibility" title="Mostrar billetera" onPress={() => repos.wallets.setHidden(wallet.id, false)} />
            ) : (
              <ListRow icon="visibility_off" title="Ocultar billetera" onPress={() => setConfirmHide(true)} />
            )}
          </GroupedList>

          <AppText variant="headlineMd">Movimientos</AppText>
          {data.history.length === 0 ? (
            <AppText variant="bodyMd" color={colors.onSurfaceMuted}>
              Aún no hay movimientos.
            </AppText>
          ) : (
            <GroupedList>
              {data.history.map((m) => (
                <ListRow
                  key={m.id}
                  title={m.description ?? TYPE_LABEL[m.type]}
                  subtitle={m.occurredOn}
                  right={<AmountText amountMinor={m.amountMinor} currency={m.currency} sign={signFor(m, accountIds)} />}
                />
              ))}
            </GroupedList>
          )}
        </ScrollView>
      ) : null}

      {adjustOpen && data && data.accounts.length > 0 ? (
        <AdjustForm
          accounts={data.accounts}
          balanceOf={(id) => accountBalance(id, data.state.movements)}
          onClose={() => setAdjustOpen(false)}
        />
      ) : null}
      {usdOpen && wallet ? <EnableUsdForm walletId={wallet.id} onClose={() => setUsdOpen(false)} /> : null}
      <ConfirmDialog
        visible={confirmHide}
        title="Ocultar billetera"
        message="La billetera dejará de mostrarse en la grilla, pero sus saldos siguen contando. Podrás mostrarla de nuevo desde «Billeteras ocultas»."
        confirmLabel="Ocultar"
        onConfirm={async () => {
          setConfirmHide(false);
          await repos.wallets.setHidden(walletId, true);
        }}
        onCancel={() => setConfirmHide(false)}
      />
    </Screen>
  );
}
