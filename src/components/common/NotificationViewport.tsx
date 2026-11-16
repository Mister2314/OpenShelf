import { createPortal } from 'react-dom';
import type { KeyboardEvent } from 'react';
import { CircleCheck, CircleX, Info, LoaderCircle, TriangleAlert, X } from 'lucide-react';
import type { NotificationRecord } from '../../context/NotificationContext';

interface NotificationViewportProps {
  notifications: NotificationRecord[];
  onDismiss: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}

const presentation = {
  success: { label: 'Success', Icon: CircleCheck },
  info: { label: 'Information', Icon: Info },
  warning: { label: 'Warning', Icon: TriangleAlert },
  error: { label: 'Error', Icon: CircleX },
  progress: { label: 'In progress', Icon: LoaderCircle },
} as const;

export function NotificationViewport({ notifications, onDismiss, onPause, onResume }: NotificationViewportProps) {
  if (typeof document === 'undefined') return null;
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape' || !notifications.length) return;
    event.preventDefault();
    onDismiss(notifications[notifications.length - 1].id);
  };

  return createPortal(<aside className="notification-viewport" aria-label="Notifications" onKeyDown={handleKeyDown}>
    <div className="notification-announcer-polite" role="status" aria-live="polite" aria-atomic="true">
      {notifications.filter(item => item.level !== 'error').slice(-1).map(item => `${presentation[item.level].label}: ${item.title}. ${item.message}`).join('')}
    </div>
    <div className="notification-announcer-assertive" role="alert" aria-live="assertive" aria-atomic="true">
      {notifications.filter(item => item.level === 'error').slice(-1).map(item => `${item.title}. ${item.message}`).join('')}
    </div>
    <div className="notification-stack">
      {notifications.map(item => {
        const { label, Icon } = presentation[item.level];
        return <article key={item.id} className={`notification-card notification-${item.level}`} data-notification-id={item.id} onPointerEnter={() => onPause(item.id)} onPointerLeave={() => onResume(item.id)} onFocusCapture={() => onPause(item.id)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onResume(item.id); }}>
          <span className="notification-icon" aria-hidden="true"><Icon size={19} className={item.level === 'progress' ? 'notification-spinner' : undefined}/></span>
          <div className="notification-copy"><span className="notification-level">{label}</span><strong>{item.title}</strong><p>{item.message}</p>{item.action&&<button className="notification-action" type="button" onClick={() => { item.action?.onSelect(); onDismiss(item.id); }}>{item.action.label}</button>}</div>
          <button className="notification-dismiss" type="button" aria-label={`Dismiss ${label.toLowerCase()} notification`} onClick={() => onDismiss(item.id)}><X size={17}/></button>
        </article>;
      })}
    </div>
  </aside>, document.body);
}
