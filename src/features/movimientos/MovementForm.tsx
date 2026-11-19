import { useRef, useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@/data/useQuery';
import { CURRENCY_SYMBOL, formatMoney } from '@/domain/money/money';
import { formatDayLabel, todayInLima, type IsoDate } from '@/lib/dates';
import type { DomainError, Result } from '@/lib/result';
import { AmountInput } from '@/ui/AmountInput';
import { AppText } from '@/ui/AppText';
import { Calendar } from '@/ui/Calendar';
import { FormRow } from '@/ui/FormRow';
import { GlassCard } from '@/ui/GlassCard';
import { GroupedList } from '@/ui/GroupedList';
import type { IconName } from '@/ui/Icon';
import { NoticeCard } from '@/ui/NoticeCard';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { SelectorSheet } from '@/ui/SelectorSheet';
import { Switch } from '@/ui/Switch';
import { TextField } from '@/ui/TextField';
import { colors } from '@/ui/tokens';
import { NewDebtSheet } from './NewDebtSheet';
import {
  accountOptions,
  blockedNotice,
  buildMovementDraft,
  categoryOptions,
  destOptions,
  type FormValues,
  type MovementDraft,
  type MovementKind,
  type NewDebt,
} from './presenter';

type Sheet = 'category' | 'account' | 'dest' | 'debt' | null;
const NEW_DEBT = '__new__';

const KINDS: { value: MovementKind; label: string }[] = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
  { value: 'transfer', label: 'Transferencia' },
];

export function emptyValues(today: IsoDate, kind: MovementKind = 'expense', accountId: string | null = null): FormValues {
  return { kind, amountText: '', accountId, destAccountId: null, categoryId: null, debtId: null, newDebt: null, description: '', isToday: true, date: today };
}

/**
 * Formulario de movimiento compartido por Registrar (crear) y Editar movimiento. Arma el borrador con
 * `buildMovementDraft` y delega el guardado en `onSave`; muestra los errores y el aviso de saldo.
 */
export function MovementForm({
  initial,
  onSave,
  onSaved,
  onEdit,
  lockKind = false,
  submitLabel,
  today: todayProp,
}: {
  initial: FormValues;
  onSave: (draft: MovementDraft, newDebt: NewDebt | null) => Promise<Result<unknown>>;
  onSaved: (kind: MovementKind) => void;
  /** Se llama cuando el usuario modifica algo (para ocultar mensajes de éxito anteriores). */
  onEdit?: () => void;
  lockKind?: boolean;
  submitLabel?: string;
  today?: IsoDate;
}) {
  const today = todayProp ?? todayInLima(new Date());
  const { data } = useQuery(async (r) => ({
    wallets: await r.wallets.listWallets(),
    cards: await r.wallets.listCards(),
    accounts: await r.wallets.listAccounts(),
    categories: await r.categories.list(),
    debts: await r.debts.list(),
  }));
  const [values, setValues] = useState<FormValues>(initial);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [newDebtOpen, setNewDebtOpen] = useState(false);
  const [error, setError] = useState<DomainError | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  if (!data) return null;

  const options = accountOptions(data.wallets, data.cards, data.accounts, values.kind);
  const from = options.find((o) => o.id === values.accountId) ?? null;
  const to = options.find((o) => o.id === values.destAccountId) ?? null;
  const category = data.categories.find((c) => c.id === values.categoryId) ?? null;
  const isLoan = values.kind !== 'transfer' && category?.systemKey === 'loan';
  const prefix = CURRENCY_SYMBOL[from?.currency ?? 'PEN'];

  function patch(p: Partial<FormValues>) {
    setValues((v) => ({ ...v, ...p }));
    setError(null);
    onEdit?.();
  }

  function changeKind(kind: MovementKind) {
    const next = accountOptions(data!.wallets, data!.cards, data!.accounts, kind);
    patch({
      kind,
      categoryId: null,
      debtId: null,
      newDebt: null,
      destAccountId: null,
      accountId: next.some((o) => o.id === values.accountId) ? values.accountId : null,
    });
  }

  function changeFrom(id: string) {
    const picked = options.find((o) => o.id === id)!;
    const debt = data!.debts.find((d) => d.id === values.debtId);
    patch({
      accountId: id,
      destAccountId: to && (to.currency !== picked.currency || to.id === id) ? null : values.destAccountId,
      debtId: debt && debt.currency !== picked.currency ? null : values.debtId,
    });
  }

  const debtOptions = [
    ...data.debts
      .filter((d) => d.status === 'pending' && (!from || d.currency === from.currency))
      .map((d) => ({
        value: d.id,
        label: `${d.counterpartyName} · ${d.direction === 'receivable' ? 'Me deben' : 'Debo'}`,
        subtitle: formatMoney(d.pendingMinor, d.currency),
        icon: 'handshake' as IconName,
      })),
    { value: NEW_DEBT, label: '+ Nueva deuda', subtitle: undefined, icon: 'add_circle' as IconName },
  ];
  const selectedDebt = data.debts.find((d) => d.id === values.debtId);

  async function save() {
    if (busy.current) return;
    const built = buildMovementDraft(values, { accounts: options, categories: data!.categories, today });
    if (!built.ok) {
      setError(built.error);
      return;
    }
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      const result = await onSave(built.value.draft, built.value.newDebt);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved(values.kind);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  const notice = error ? blockedNotice(error) : null;
  const amountError = error?.code === 'AMOUNT_INVALID' ? error.message : null;
  const otherError = error && !notice && !amountError ? error.message : null;
  const label = submitLabel ?? (values.kind === 'transfer' ? 'Guardar transferencia' : 'Guardar movimiento');

  return (
    <View style={{ gap: 16 }}>
      {lockKind ? null : <SegmentedControl options={KINDS} value={values.kind} onChange={changeKind} />}

      <View style={{ gap: 4 }}>
        <AmountInput prefix={prefix} value={values.amountText} onChangeText={(t) => patch({ amountText: t })} error={amountError} />
        {values.kind === 'transfer' ? (
          <AppText variant="labelMd" color={colors.onSurfaceMuted} style={{ textAlign: 'center' }}>
            Entre mis billeteras
          </AppText>
        ) : null}
      </View>

      <GroupedList>
        {values.kind === 'transfer' ? (
          <FormRow icon="account_balance_wallet" label="Desde" value={from?.label} onPress={() => setSheet('account')} />
        ) : (
          <FormRow icon="category" label="Categoría" value={category?.name} iconColor={category?.color} onPress={() => setSheet('category')} />
        )}
        {values.kind === 'transfer' ? (
          <FormRow icon="swap_horiz" label="Hacia" value={to?.label} onPress={() => setSheet('dest')} />
        ) : (
          <FormRow icon="account_balance_wallet" label="Billetera" value={from?.label} onPress={() => setSheet('account')} />
        )}
        {isLoan ? (
          <FormRow
            icon="handshake"
            label="Deuda"
            value={values.newDebt ? `Nueva: ${values.newDebt.counterpartyName}` : selectedDebt ? selectedDebt.counterpartyName : undefined}
            onPress={() => setSheet('debt')}
          />
        ) : null}
        <FormRow
          icon="calendar_today"
          label="¿Es de hoy?"
          value={formatDayLabel(values.isToday ? today : values.date, today)}
          right={<Switch label="¿Es de hoy?" value={values.isToday} onValueChange={(v) => patch({ isToday: v })} />}
        />
      </GroupedList>

      {values.isToday ? null : (
        <GlassCard padding={12}>
          <Calendar value={values.date} onChange={(d) => patch({ date: d })} />
        </GlassCard>
      )}

      <TextField label="Descripción" value={values.description} onChangeText={(t) => patch({ description: t })} placeholder="Opcional" />

      {notice ? (
        <View style={{ gap: 8 }}>
          <NoticeCard title={notice.title} message={notice.message} />
          {notice.suggestion ? (
            <AppText variant="labelMd" color={colors.onSurfaceMuted}>
              {notice.suggestion}
            </AppText>
          ) : null}
        </View>
      ) : null}
      {otherError ? <AppText variant="bodyMd" color={colors.danger}>{otherError}</AppText> : null}

      <PrimaryButton label={label} onPress={save} loading={saving} />

      <SelectorSheet
        visible={sheet === 'category'}
        title="Categoría"
        options={categoryOptions(data.categories).map((c) => ({ value: c.id, label: c.name, icon: c.icon as IconName, color: c.color }))}
        value={values.categoryId}
        onSelect={(id) => patch({ categoryId: id, debtId: null, newDebt: null })}
        onClose={() => setSheet(null)}
      />
      <SelectorSheet
        visible={sheet === 'account'}
        title={values.kind === 'transfer' ? 'Desde' : 'Billetera'}
        options={options.map((o) => ({ value: o.id, label: o.label, icon: (o.kind === 'credit_card' ? 'credit_card' : 'account_balance_wallet') as IconName }))}
        value={values.accountId}
        onSelect={changeFrom}
        onClose={() => setSheet(null)}
        emptyMessage="Primero crea una billetera."
      />
      <SelectorSheet
        visible={sheet === 'dest'}
        title="Hacia"
        options={destOptions(options, from).map((o) => ({ value: o.id, label: o.label, icon: 'swap_horiz' as IconName }))}
        value={values.destAccountId}
        onSelect={(id) => patch({ destAccountId: id })}
        onClose={() => setSheet(null)}
        emptyMessage="No hay otra billetera de la misma moneda."
      />
      <SelectorSheet
        visible={sheet === 'debt'}
        title="Deuda"
        options={debtOptions}
        value={values.debtId}
        onSelect={(id) => {
          if (id === NEW_DEBT) setNewDebtOpen(true);
          else patch({ debtId: id, newDebt: null });
        }}
        onClose={() => setSheet(null)}
      />
      {newDebtOpen ? (
        <NewDebtSheet
          visible
          onConfirm={(debt) => patch({ newDebt: debt, debtId: null })}
          onClose={() => setNewDebtOpen(false)}
        />
      ) : null}
    </View>
  );
}
