import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { useAuth } from '../hooks/useDispatcher';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button, buttonVariants } from './ui/button';
interface Guidance { version: string; generatedAt: string; draftText: string; sections: { title: string; steps: string[] }[]; observations: { channelId: number; name: string; type: string; tag: string; value: string | number | null; recordedAt: string | null; condition: string; stateEvidence?: string | null }[] }
interface Draft { id: string; content: string; userId: string; createdAt: string }
export function MaintenanceDialog({ objectId }: { objectId: number }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const { user } = useAuth();
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ['maintenance', objectId], enabled: open,
    queryFn: async () => (await api.get<Guidance>(`/objects/${objectId}/maintenance`)).data, staleTime: 0 });
  const saved = useQuery({ queryKey: ['repair-drafts', objectId], enabled: open,
    queryFn: async () => (await api.get<Draft[]>(`/objects/${objectId}/repair-drafts`)).data });
  const save = useMutation({ mutationFn: async () => (await api.post<Draft>(`/objects/${objectId}/repair-drafts`, { content: draft, version: query.data?.version })).data,
    onSuccess: () => { cache.invalidateQueries({ queryKey: ['repair-drafts', objectId] }); setDraft(null); } });
  function download(content: string, id: string) {
    const url = URL.createObjectURL(new Blob(['\ufeff', content], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `repair-draft-${objectId}-${id}.txt`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger className={buttonVariants({ variant: 'outline', size: 'sm' })}>Подробная рекомендация</DialogTrigger>
    <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Обслуживание объекта #{objectId}</DialogTitle><DialogDescription>План проверки по последним доступным данным. Требует проверки ответственным специалистом.</DialogDescription></DialogHeader>
      {query.isLoading && <p role="status">Подготовка рекомендации…</p>}
      {query.isError && <p role="alert">Не удалось получить рекомендацию. <button onClick={() => query.refetch()}>Повторить</button></p>}
      {query.data && <>
        <p className="text-xs text-muted-foreground">Сформировано {new Date(query.data.generatedAt).toLocaleString('ru-RU')} · {query.data.version}</p>
        {query.data.sections.map(section => <section key={section.title}><h3 className="font-semibold mb-2">{section.title}</h3><ul className="list-disc pl-5 space-y-2">{section.steps.map(step => <li key={step}>{step}</li>)}</ul></section>)}
        <details><summary className="cursor-pointer font-semibold">Исходные показания ({query.data.observations.length})</summary><div className="space-y-2 mt-2">{query.data.observations.map(v => <p key={v.channelId}>{v.name} [{v.tag || v.channelId}] · {v.type}: {v.value ?? 'нет значения'} · {v.recordedAt ? new Date(v.recordedAt).toLocaleString('ru-RU') : 'нет времени'} · {v.condition}{v.stateEvidence && <span className="block text-sm text-muted-foreground">{v.stateEvidence}</span>}</p>)}</div></details>
        {(user?.role === 'ADMIN' || user?.role === 'DISPATCHER') && <Button onClick={() => { setDraft(query.data!.draftText); save.reset(); }}>Сформировать черновик заявки</Button>}
        {draft !== null && <section className="space-y-3"><label className="font-semibold" htmlFor={`draft-${objectId}`}>Черновик заявки / наряда (можно редактировать)</label>
          <textarea id={`draft-${objectId}`} className="w-full border rounded p-3 min-h-72" value={draft} maxLength={200000} onChange={e => setDraft(e.target.value)} />
          <p>Заявка сохраняется локально. Передача исполнителю и согласование выполняются отдельно.</p>
          <Button disabled={!draft.trim() || save.isPending} onClick={() => save.mutate()}>Сохранить черновик</Button>
          <Button variant="outline" className="ml-2" onClick={() => download(draft, 'unsaved')}>Скачать TXT</Button>
          {save.isError && <p role="alert">Не удалось сохранить черновик. Повторите попытку.</p>}
        </section>}
        {save.isSuccess && <p role="status">Черновик сохранён.</p>}
      </>}
      <section><h3 className="font-semibold">Сохранённые черновики (последние 50)</h3>
        {saved.isError && <p role="alert">Не удалось загрузить черновики.</p>}
        {saved.data?.length === 0 && <p>Черновиков пока нет.</p>}
        {saved.data?.map(v => <details key={v.id} className="border rounded p-2 mt-2"><summary>{new Date(v.createdAt).toLocaleString('ru-RU')} · #{v.id.slice(0, 8)}</summary><p className="text-xs">Автор: {v.userId}</p><pre className="whitespace-pre-wrap font-sans text-sm my-2">{v.content}</pre><Button variant="outline" onClick={() => download(v.content, v.id)}>Скачать TXT</Button></details>)}
      </section>
    </DialogContent>
  </Dialog>;
}
