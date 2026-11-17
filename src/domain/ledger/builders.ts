import type { IsoDate } from '@/lib/dates';
import { err, ok, type Result } from '@/lib/result';
import { accountBalance } from './balances';
import type { Account, Movement } from './types';

function baseMovement(id: string, account: Account, occurredOn: IsoDate): Movement {
  return {
    id,
    type: 'opening',
    occurredOn,
    description: null,
    categoryId: null,
    sourceAccountId: null,
    destAccountId: null,
    amountMinor: 0,
    currency: account.currency,
    debtId: null,
    declaredBalanceMinor: null,
  };
}

/** Saldo inicial de una billetera (tramo de entrada) o consumo previo de una tarjeta (tramo de salida). */
export function buildOpening(input: {
  id: string;
  account: Account;
  amountMinor: number;
  occurredOn: IsoDate;
}): Movement {
  const { id, account, amountMinor, occurredOn } = input;
  const movement = { ...baseMovement(id, account, occurredOn), amountMinor };
  return account.kind === 'wallet'
    ? { ...movement, destAccountId: account.id }
    : { ...movement, sourceAccountId: account.id };
}

/**
 * "Arreglo de billetera": crea el movimiento que lleva el saldo al cierre de `occurredOn` hasta
 * el saldo declarado. Si sube, entra a la cuenta; si baja, sale. Devuelve `null` si ya coincide.
 * Si se está editando un arreglo existente, `movements` no debe incluir su versión anterior.
 */
export function buildAdjustment(input: {
  id: string;
  account: Account;
  declaredMinor: number;
  occurredOn: IsoDate;
  movements: Movement[];
}): Result<Movement | null> {
  const { id, account, declaredMinor, occurredOn, movements } = input;
  if (!Number.isSafeInteger(declaredMinor) || declaredMinor < 0) {
    return err('AMOUNT_INVALID', 'El saldo declarado debe ser 0 o mayor, con hasta 2 decimales.');
  }
  if (account.kind !== 'wallet') {
    return err('LEG_INVALID', 'El arreglo de saldo solo aplica a billeteras.');
  }

  const difference = declaredMinor - accountBalance(account.id, movements, occurredOn);
  if (difference === 0) return ok(null);

  const movement: Movement = {
    ...baseMovement(id, account, occurredOn),
    type: 'adjustment',
    amountMinor: Math.abs(difference),
    declaredBalanceMinor: declaredMinor,
  };
  return ok(
    difference > 0 ? { ...movement, destAccountId: account.id } : { ...movement, sourceAccountId: account.id },
  );
}
