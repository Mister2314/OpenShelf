import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { NotificationViewport } from '../components/common/NotificationViewport';

export type NotificationLevel = 'success' | 'info' | 'warning' | 'error' | 'progress';

export interface NotificationInput {
  level: NotificationLevel;
  title: string;
  message: string;
  action?: { label: string; onSelect: () => void };
  durationMs?: number;
  showAfterMs?: number;
}

export interface NotificationRecord extends NotificationInput {
  id: string;
  createdAt: number;
  remainingMs: number;
  paused: boolean;
  visible: boolean;
  ready: boolean;
}

export type NotificationId = string;

export interface NotificationApi {
  notify(input: NotificationInput): NotificationId;
  update(id: NotificationId, input: NotificationInput): void;
  dismiss(id: NotificationId): void;
  pause(id: NotificationId): void;
  resume(id: NotificationId): void;
}

const NotificationContext = createContext<NotificationApi | undefined>(undefined);
const visibleLimit = 3;

function lifetime(input: NotificationInput) {
  if (input.level === 'progress' || (input.level === 'error' && input.action)) return Infinity;
  const fallback = { success: 4500, info: 5500, warning: 8000, error: 10000 }[input.level];
  return input.durationMs ?? fallback;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<NotificationRecord[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const started = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    started.current.delete(id);
    setRecords(current => {
      const remaining = current.filter(record => record.id !== id);
      let openSlots = Math.max(0, visibleLimit - remaining.filter(record => record.visible).length);
      return remaining.map(record => {
        if (!record.visible && record.ready && openSlots > 0) { openSlots--; return { ...record, visible: true }; }
        return record;
      });
    });
  }, []);

  const schedule = useCallback((record: NotificationRecord) => {
    const duration = lifetime(record);
    if (!Number.isFinite(duration) || record.paused || !record.visible) return;
    const oldTimer = timers.current.get(record.id);
    if (oldTimer) clearTimeout(oldTimer);
    const remaining = Math.max(0, record.remainingMs || duration);
    started.current.set(record.id, Date.now());
    timers.current.set(record.id, setTimeout(() => dismiss(record.id), remaining));
  }, [dismiss]);

  const notify = useCallback((input: NotificationInput) => {
    const key = `${input.level}\u0000${input.title}\u0000${input.message}`;
    const duplicate = records.find(record => `${record.level}\u0000${record.title}\u0000${record.message}` === key);
    if (duplicate) return duplicate.id;
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const delay = input.level === 'progress' ? (input.showAfterMs ?? 450) : 0;
    const visible = records.filter(record => record.visible).length < visibleLimit && delay === 0;
    const record: NotificationRecord = { ...input, id, createdAt: Date.now(), remainingMs: lifetime(input), paused: false, visible, ready: delay === 0 };
    setRecords(current => [...current, record]);
    if (delay > 0) {
      timers.current.set(id, setTimeout(() => {
        setRecords(current => {
          const canShow = current.filter(item => item.visible).length < visibleLimit;
          const updated = current.map(item => item.id === id ? { ...item, ready: true, visible: canShow } : item);
          const shown = updated.find(item => item.id === id);
          if (shown?.visible) queueMicrotask(() => schedule(shown));
          return updated;
        });
      }, delay));
    } else if (visible) queueMicrotask(() => schedule(record));
    return id;
  }, [records, schedule]);

  const update = useCallback((id: string, input: NotificationInput) => {
    const old = timers.current.get(id);
    if (old) clearTimeout(old);
    timers.current.delete(id);
    setRecords(current => current.map(record => {
      if (record.id !== id) return record;
      const updated: NotificationRecord = { ...record, ...input, id, createdAt: record.createdAt, remainingMs: lifetime(input), paused: false, visible: true };
      queueMicrotask(() => schedule(updated));
      return updated;
    }));
  }, [schedule]);

  const pause = useCallback((id: string) => {
    const recordStarted = started.current.get(id);
    setRecords(current => current.map(record => record.id === id ? { ...record, paused: true, remainingMs: recordStarted ? Math.max(0, record.remainingMs - (Date.now() - recordStarted)) : record.remainingMs } : record));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const resume = useCallback((id: string) => setRecords(current => current.map(record => {
    if (record.id !== id) return record;
    const updated = { ...record, paused: false };
    queueMicrotask(() => schedule(updated));
    return updated;
  })), [schedule]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); timers.current.clear(); }, []);

  const api = useMemo(() => ({ notify, update, dismiss, pause, resume }), [notify, update, dismiss, pause, resume]);
  return <NotificationContext.Provider value={api}>
    {children}
    <NotificationViewport notifications={records.filter(record => record.visible).slice(0, visibleLimit)} onDismiss={dismiss} onPause={pause} onResume={resume}/>
  </NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider.');
  return context;
}
