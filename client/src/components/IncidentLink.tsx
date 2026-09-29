import { Link } from 'react-router';
import type { SystemObject } from '../types';
export function IncidentLink({ object, label = 'Показать инцидент' }: { object: SystemObject; label?: string }) {
  if (!object.incidents?.some(item => ['OPEN', 'IN_PROGRESS', 'CONFIRMED'].includes(item.status))) return null;
  const params = new URLSearchParams({ search: object.dispatcherName, objectId: String(object.id) });
  return <Link className="inline-block underline font-semibold" to={`/dashboard?${params}#incidents`}>{label}</Link>;
}
