import { MessageSquare, Trash2, X } from 'lucide-react';
import type { ChatSession } from '@/lib/types';

interface SidebarProps {
  open: boolean;
  sessions: ChatSession[];
  activeSessionId: string | null;
  loadingHistory: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function Sidebar({
  open,
  sessions,
  activeSessionId,
  loadingHistory,
  onSelect,
  onDelete,
  onClose,
}: SidebarProps) {
  return (
    <>
      {/* mobile backdrop */}
      {open && <div className="medibot-backdrop lg:hidden" onClick={onClose} />}

      <aside className={`medibot-sidebar ${open ? 'open' : ''}`}>
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="medibot-sidebar-title">Chat History</h2>
          <button onClick={onClose} className="medibot-icon-btn lg:hidden" aria-label="Close history">
            <X size={18} />
          </button>
        </div>

        <div className="medibot-sidebar-list">
          {loadingHistory && (
            <div className="medibot-sidebar-empty">
              {[0, 1, 2].map((i) => (
                <div key={i} className="medibot-skeleton" />
              ))}
            </div>
          )}

          {!loadingHistory && sessions.length === 0 && (
            <div className="medibot-sidebar-empty">
              <MessageSquare size={28} className="opacity-40" />
              <p>No conversations yet.</p>
              <p className="text-xs">Start a new chat to see your history here.</p>
            </div>
          )}

          {!loadingHistory &&
            sessions.map((s) => (
              <div
                key={s.id}
                className={`medibot-history-item ${activeSessionId === s.id ? 'active' : ''}`}
                onClick={() => onSelect(s.id)}
              >
                <MessageSquare size={15} className="shrink-0 opacity-70" />
                <span className="medibot-history-title">{s.title}</span>
                <button
                  className="medibot-history-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(s.id);
                  }}
                  aria-label="Delete conversation"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
        </div>

        <div className="medibot-sidebar-footnote">
          <p>MediBot provides general educational information and is not a substitute for professional medical advice.</p>
        </div>
      </aside>
    </>
  );
}
