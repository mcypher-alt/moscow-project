import { objectKindLabel } from './objectLabels';
import type { SystemObject } from '../types';
export type EquipmentCategory = 'water' | 'electrical' | 'fire' | 'security' | 'other';
export const categoryLabels: Record<EquipmentCategory, string> = { water: 'Водоснабжение / насосы', electrical: 'Электроснабжение', fire: 'Пожарная сигнализация', security: 'Охрана / доступ', other: 'Другое оборудование' };
export function equipmentCategories(object: SystemObject): EquipmentCategory[] {
  const result = new Set<EquipmentCategory>();
  for (const channel of object.channels ?? []) {
    const text = `${channel.sensorName} ${channel.systemType ?? ''} ${channel.sensorType ?? ''}`.toLowerCase();
    let found = false;
    for (const [category, pattern] of [
      ['water', /water|pump|pressure|flood|вода|водоснаб|насос|давлен|затоп|уровен/],
      ['electrical', /electric|voltage|current|power|электр|напряж|питани|ибп|фаз|(?:^|\s)ток(?:\s|$)/],
      ['fire', /fire|smoke|пожар|дым/], ['security', /security|intrusion|access|охран|доступ|проникнов/],
    ] as const) if (pattern.test(text)) { result.add(category); found = true; }
    if (!found) result.add('other');
  }
  return result.size ? [...result] : ['other'];
}
export function matchesObject(object: SystemObject, query: string) {
  const text = [object.id, object.dispatcherName, object.name, object.address, object.objectKind, objectKindLabel(object.objectKind),
    ...equipmentCategories(object).map(v => categoryLabels[v]),
    ...(object.channels ?? []).flatMap(v => [v.systemTag, v.sensorName, v.systemType, v.sensorType])].join(' ').toLocaleLowerCase('ru-RU');
  return query.trim().toLocaleLowerCase('ru-RU').split(/\s+/).every(token => text.includes(token));
}
export function hasCoordinates(object: SystemObject): object is SystemObject & { latitude: number; longitude: number } {
  return typeof object.latitude === 'number' && Number.isFinite(object.latitude) && Math.abs(object.latitude) <= 90 && typeof object.longitude === 'number' && Number.isFinite(object.longitude) && Math.abs(object.longitude) <= 180;
}
