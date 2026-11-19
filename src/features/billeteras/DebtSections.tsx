import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { CardRecord } from '@/data/types';
import { formatMoney } from '@/domain/money/money';
import { AmountText } from '@/ui/AmountText';
import { AppText } from '@/ui/AppText';
import { GlassCard } from '@/ui/GlassCard';
import { Icon, type IconName } from '@/ui/Icon';
import { colors, radii } from '@/ui/tokens';
import type { cardSummary, DebtView } from './presenter';

function CountBadge({ text, tone }: { text: string; tone: 'primary' | 'danger' }) {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: tone === 'primary' ? colors.primaryContainer : colors.dangerContainer }}>
      <AppText variant="labelSm" color={tone === 'primary' ? colors.onPrimaryContainer : colors.danger}>
        {text}
      </AppText>
    </View>
  );
}

function InitialAvatar({ name, tone }: { name: string; tone: 'primary' | 'danger' }) {
  return (
    <View style={{ width: 36, height: 36, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: tone === 'primary' ? colors.primaryContainer : colors.dangerContainer }}>
      <AppText variant="labelLg" color={tone === 'primary' ? colors.onPrimaryContainer : colors.danger}>
        {name.trim().charAt(0).toUpperCase()}
      </AppText>
    </View>
  );
}

function Row({ left, title, subtitle, right }: { left: ReactNode; title: string; subtitle?: string; right: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
      {left}
      <View style={{ flex: 1 }}>
        <AppText variant="titleMd">{title}</AppText>
        {subtitle ? (
          <AppText variant="labelMd" color={colors.onSurfaceMuted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const pendingText = (n: number) => `${n} ${n === 1 ? 'pendiente' : 'pendientes'}`;

/** "Me deben" (verde, "+") o "Debo" (rojo, "-") a personas. */
export function PersonalDebtsCard({ title, tone, debts }: { title: string; tone: 'primary' | 'danger'; debts: DebtView[] }) {
  return (
    <GlassCard padding={16} style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="titleMd">{title}</AppText>
        <CountBadge text={pendingText(debts.length)} tone={tone} />
      </View>
      {debts.length === 0 ? (
        <AppText variant="bodyMd" color={colors.onSurfaceMuted}>
          Sin deudas pendientes.
        </AppText>
      ) : (
        debts.map((d) => (
          <Row
            key={d.id}
            left={<InitialAvatar name={d.counterpartyName} tone={tone} />}
            title={d.counterpartyName}
            right={<AmountText amountMinor={d.pendingMinor} currency={d.currency} sign={tone === 'primary' ? 'plus' : 'minus'} />}
          />
        ))
      )}
    </GlassCard>
  );
}

/** Tarjetas de crédito y deudas con instituciones ("Por pagar"). */
export function BankDebtsCard({
  cards,
  institutions,
}: {
  cards: { card: CardRecord; summary: ReturnType<typeof cardSummary> }[];
  institutions: DebtView[];
}) {
  const empty = cards.length === 0 && institutions.length === 0;
  return (
    <GlassCard padding={16} style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="titleMd">Deudas con bancos</AppText>
        <CountBadge text="Por pagar" tone="danger" />
      </View>
      {empty ? (
        <AppText variant="bodyMd" color={colors.onSurfaceMuted}>
          Sin deudas con bancos.
        </AppText>
      ) : null}
      {cards.map(({ card, summary }) => (
        <Row
          key={card.accountId}
          left={<BankIcon name={card.icon as IconName} color={card.color} />}
          title={card.name}
          subtitle={`Disponible ${formatMoney(summary.availableMinor, summary.currency)}`}
          right={<AmountText amountMinor={summary.consumedMinor} currency={summary.currency} sign="minus" />}
        />
      ))}
      {institutions.map((d) => (
        <Row
          key={d.id}
          left={<BankIcon name="account_balance" color={colors.danger} />}
          title={d.counterpartyName}
          right={<AmountText amountMinor={d.pendingMinor} currency={d.currency} sign="minus" />}
        />
      ))}
    </GlassCard>
  );
}

function BankIcon({ name, color }: { name: IconName; color: string }) {
  return (
    <View style={{ width: 36, height: 36, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerContainer }}>
      <Icon name={name} size={20} color={color} />
    </View>
  );
}
