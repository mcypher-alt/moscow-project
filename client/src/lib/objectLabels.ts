const labels: Record<string, string> = {
  district: 'Район', controlHouse: 'Диспетчерский пункт', guardObject: 'Охраняемый объект',
};
export const objectKindLabel = (kind?: string) => kind ? labels[kind] ?? kind : 'Тип не указан';
