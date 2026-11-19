import { Pressable, View } from 'react-native';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Icon, type IconName } from './Icon';
import { IconCircle } from './IconCircle';
import { PrimaryButton } from './PrimaryButton';
import { colors, spacing } from './tokens';

export interface SelectorOption<T extends string> {
  value: T;
  label: string;
  subtitle?: string;
  icon?: IconName;
  color?: string;
  disabled?: boolean;
}

/**
 * Lista de opciones en una hoja inferior. Modo simple: radios, al elegir se cierra. Modo `multi`:
 * casillas (el padre alterna el valor recibido en `onSelect`) y "Listo" cierra.
 */
export function SelectorSheet<T extends string>({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
  multi = false,
  emptyMessage,
}: {
  visible: boolean;
  title: string;
  options: SelectorOption<T>[];
  value: T | T[] | null;
  onSelect: (v: T) => void;
  onClose: () => void;
  multi?: boolean;
  emptyMessage?: string;
}) {
  const selectedValues = Array.isArray(value) ? value : value === null ? [] : [value];
  return (
    <BottomSheet visible={visible} title={title} onClose={onClose}>
      {options.length === 0 ? (
        <AppText variant="bodyMd" color={colors.onSurfaceMuted}>
          {emptyMessage ?? 'No hay opciones.'}
        </AppText>
      ) : (
        <View style={{ gap: 4 }}>
          {options.map((o) => {
            const on = selectedValues.includes(o.value);
            return (
              <Pressable
                key={o.value}
                accessibilityRole={multi ? 'checkbox' : 'radio'}
                accessibilityLabel={o.label}
                accessibilityState={multi ? { checked: on, disabled: Boolean(o.disabled) } : { selected: on, disabled: Boolean(o.disabled) }}
                disabled={o.disabled}
                onPress={() => {
                  onSelect(o.value);
                  if (!multi) onClose();
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: spacing.rowY - 4, opacity: o.disabled ? 0.4 : 1 }}
              >
                {o.icon ? <IconCircle icon={o.icon} color={o.color ?? colors.primary} size={36} /> : null}
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyMd">{o.label}</AppText>
                  {o.subtitle ? (
                    <AppText variant="labelMd" color={colors.onSurfaceMuted}>
                      {o.subtitle}
                    </AppText>
                  ) : null}
                </View>
                {on ? <Icon name="check" size={20} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      )}
      {multi ? <PrimaryButton label="Listo" onPress={onClose} /> : null}
    </BottomSheet>
  );
}
