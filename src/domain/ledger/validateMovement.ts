import { err, ok, type Result } from '@/lib/result';
import type { Account, AccountKind, LedgerState, Movement, MovementType } from './types';

/** Tipo de cuenta permitido en cada tramo; `null` = el tramo debe estar ausente. */
interface LegRule {
  source: AccountKind | null;
  dest: AccountKind | null;
}

const LEG_RULES: Record<'income' | 'transfer' | 'card_payment', LegRule> = {
  income: { source: null, dest: 'wallet' },
  transfer: { source: 'wallet', dest: 'wallet' },
  card_payment: { source: 'wallet', dest: 'credit_card' },
};

const legInvalid = (type: MovementType): Result<never> =>
  err('LEG_INVALID', `Las cuentas indicadas no son válidas para un movimiento de tipo "${type}".`);

/**
 * Valida solo la forma de un movimiento (tramos, cuentas, monedas, categoría, deuda).
 * Los saldos se validan en `timeline.ts`. Devuelve el primer error encontrado.
 * Al editar, `state.movements` puede contener la versión anterior del mismo `id`; se ignora.
 */
export function validateMovement(movement: Movement, state: LedgerState): Result<Movement> {
  const { type, sourceAccountId, destAccountId } = movement;

  // 1. AMOUNT_INVALID
  if (!Number.isSafeInteger(movement.amountMinor) || movement.amountMinor <= 0) {
    return err('AMOUNT_INVALID', 'El monto debe ser un entero mayor a 0.');
  }

  // 2. LEG_INVALID (presencia de tramos)
  const hasSource = sourceAccountId !== null;
  const hasDest = destAccountId !== null;
  switch (type) {
    case 'expense':
      if (!hasSource || hasDest) return legInvalid(type);
      break;
    case 'income':
      if (hasSource || !hasDest) return legInvalid(type);
      break;
    case 'transfer':
    case 'card_payment':
      if (!hasSource || !hasDest) return legInvalid(type);
      break;
    case 'opening':
    case 'adjustment':
      if (hasSource === hasDest) return legInvalid(type); // exactamente un tramo
      break;
  }

  // 3. ACCOUNT_NOT_FOUND
  const accountsById = new Map<string, Account>(state.accounts.map((a) => [a.id, a]));
  const source = hasSource ? accountsById.get(sourceAccountId) : undefined;
  const dest = hasDest ? accountsById.get(destAccountId) : undefined;
  if ((hasSource && !source) || (hasDest && !dest)) {
    return err('ACCOUNT_NOT_FOUND', 'La cuenta indicada no existe.');
  }

  // 2 (continuación). LEG_INVALID (tipo de cuenta permitido)
  switch (type) {
    case 'expense':
      break; // el origen puede ser billetera o tarjeta
    case 'opening':
      if ((source && source.kind !== 'credit_card') || (dest && dest.kind !== 'wallet')) {
        return legInvalid(type);
      }
      break;
    case 'adjustment':
      if ((source ?? dest)?.kind !== 'wallet') return legInvalid(type);
      break;
    case 'income':
    case 'transfer':
    case 'card_payment': {
      const rule = LEG_RULES[type];
      if (rule.source !== null && source?.kind !== rule.source) return legInvalid(type);
      if (rule.dest !== null && dest?.kind !== rule.dest) return legInvalid(type);
      break;
    }
  }

  // 4. CURRENCY_MISMATCH
  if ([source, dest].some((a) => a && a.currency !== movement.currency)) {
    return err(
      'CURRENCY_MISMATCH',
      'La moneda del movimiento no coincide con la de las cuentas. Para cambiar de moneda se necesita un cambio explícito.',
    );
  }

  // 5. SAME_ACCOUNT
  if (type === 'transfer' && sourceAccountId === destAccountId) {
    return err('SAME_ACCOUNT', 'La cuenta de origen y la de destino no pueden ser la misma.');
  }

  // 6. Categoría
  const categoryResult = validateCategoryAndDebt(movement, state);
  if (!categoryResult.ok) return categoryResult;

  // 7. OPENING_DUPLICATE
  if (type === 'opening') {
    const accountId = sourceAccountId ?? destAccountId;
    const duplicate = state.movements.some(
      (m) =>
        m.id !== movement.id &&
        m.type === 'opening' &&
        (m.sourceAccountId ?? m.destAccountId) === accountId,
    );
    if (duplicate) {
      return err('OPENING_DUPLICATE', 'Esta cuenta ya tiene un saldo inicial.');
    }
  }

  // 8. ADJUSTMENT_DECLARED_REQUIRED
  if (type === 'adjustment') {
    const declared = movement.declaredBalanceMinor;
    if (declared === null || !Number.isSafeInteger(declared) || declared < 0) {
      return err(
        'ADJUSTMENT_DECLARED_REQUIRED',
        'El arreglo de billetera necesita el saldo declarado (0 o mayor).',
      );
    }
  }

  return ok(movement);
}

function validateCategoryAndDebt(movement: Movement, state: LedgerState): Result<true> {
  const { type, categoryId, debtId } = movement;

  if (type !== 'expense' && type !== 'income') {
    if (categoryId !== null) {
      return err('CATEGORY_NOT_ALLOWED', 'Este tipo de movimiento no lleva categoría.');
    }
    if (debtId !== null) {
      return err('DEBT_NOT_ALLOWED', 'Este tipo de movimiento no se asocia a una deuda.');
    }
    return ok(true);
  }

  if (categoryId === null) {
    return err('CATEGORY_REQUIRED', 'Elige una categoría.');
  }
  const category = state.categories.find((c) => c.id === categoryId);
  if (!category) return err('CATEGORY_NOT_FOUND', 'La categoría indicada no existe.');
  const isLoan = category.systemKey === 'loan';
  if (isLoan && debtId === null) {
    return err('DEBT_REQUIRED', 'La categoría "Préstamo" necesita una deuda asociada.');
  }
  if (!isLoan && debtId !== null) {
    return err('DEBT_NOT_ALLOWED', 'Solo los movimientos de categoría "Préstamo" se asocian a una deuda.');
  }
  if (debtId !== null) {
    const debt = state.debts.find((d) => d.id === debtId);
    if (!debt) return err('DEBT_NOT_FOUND', 'La deuda indicada no existe.');
    if (debt.currency !== movement.currency) {
      return err('DEBT_CURRENCY_MISMATCH', 'La deuda está en otra moneda que el movimiento.');
    }
  }
  return ok(true);
}
