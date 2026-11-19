import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { addMonths, endOfMonth, firstDayOfMonth, MONTH_NAMES_ES, weekdayMonFirst, type IsoDate } from '@/lib/dates';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { colors, radii } from './tokens';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Calendario de un mes (lunes primero). Muestra el mes de `initialMonth` o, si falta, el de `value`. */
export function Calendar({ value, onChange, initialMonth }: { value: IsoDate; onChange: (d: IsoDate) => void; initialMonth?: IsoDate }) {
  const [month, setMonth] = useState<IsoDate>(firstDayOfMonth(initialMonth ?? value));
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const monthName = MONTH_NAMES_ES[monthIndex]!;
  const days = Number(endOfMonth(month).slice(8, 10));
  const blanks = weekdayMonFirst(month);

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mes anterior" onPress={() => setMonth(addMonths(month, -1))} hitSlop={8}>
          <Icon name="chevron_left" size={24} />
        </Pressable>
        <AppText variant="titleMd">{`${monthName} ${year}`}</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="Mes siguiente" onPress={() => setMonth(addMonths(month, 1))} hitSlop={8}>
          <Icon name="chevron_right" size={24} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((w) => (
          <View key={w} style={{ width: `${100 / 7}%`, alignItems: 'center' }}>
            <AppText variant="labelSm" color={colors.onSurfaceMuted}>
              {w}
            </AppText>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {Array.from({ length: blanks }, (_, i) => (
          <View key={`b${i}`} testID="calendar-blank" style={{ width: `${100 / 7}%`, height: 40 }} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const day = i + 1;
          const iso = `${month.slice(0, 8)}${String(day).padStart(2, '0')}`;
          const selected = iso === value;
          return (
            <View key={iso} style={{ width: `${100 / 7}%`, height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${day} de ${monthName.toLowerCase()} de ${year}`}
                accessibilityState={{ selected }}
                onPress={() => onChange(iso)}
                style={{ width: 36, height: 36, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.primary : 'transparent' }}
              >
                <AppText variant="bodyMd" tabular color={selected ? colors.onPrimary : colors.onSurface}>
                  {String(day)}
                </AppText>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}
