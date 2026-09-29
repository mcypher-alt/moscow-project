import { sensorStates } from './sensorStates.generated.js';

// Customer clarification: join by sensor type, not by channel ID (message467).
// The dictionary describes possible states; it does not establish a physical diagnosis.
export function sensorStateEvidence(type: string | null, value: string | number | null, alarm: boolean) {
  if (typeof value !== 'string') return null;
  if (/^01\.01\.1970 03:00:0[01]$/.test(value.trim())) {
    return 'Возможная ошибка формата/сбой даты (ответ заказчика 23.09). Не интерпретировать как бинарное показание 0/1; проверить канал.';
  }
  const matches = sensorStates.filter(row => row.sensorType === type?.trim() && row.state === value.trim());
  if (!matches.length) return null;
  const sets = [...new Set(matches.map(row => row.stateSetId))].join(', ');
  const flags = new Set(matches.map(row => row.alarm));
  if (flags.size > 1) return `Справочник состояний, набор ${sets}: противоречивые признаки тревоги. Сохранён исходный признак события; требуется проверка.`;
  if (!flags.has(alarm)) return `Справочник состояний, набор ${sets}: признак тревоги отличается от события. Сохранён исходный признак события; требуется проверка.`;
  return `Состояние найдено в справочнике по типу датчика, набор ${sets}. Требует оценки диспетчером; не подтверждает аварию или исправность.`;
}
