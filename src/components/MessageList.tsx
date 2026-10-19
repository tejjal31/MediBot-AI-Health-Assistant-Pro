import { useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, Clipboard, HeartPulse, Volume2, Square } from 'lucide-react';
import type { Message } from '@/lib/types';

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  onSpeak: (text: string) => void;
  onStopSpeak: () => void;
  speaking: boolean;
}

function urgencyChip(urgency: string | null | undefined) {
  if (urgency === 'high')
    return { label: 'Seek prompt care', cls: 'urgency-high', icon: AlertTriangle };
  if (urgency === 'medium')
    return { label: 'Monitor closely', cls: 'urgency-medium', icon: AlertTriangle };
  return null;
}

// Render lightweight markdown: **bold**, *italic*, _italic_, bullet lines, paragraphs.
function FormattedText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split('\n');
        const isBulletList = lines.every((l) => l.trim().startsWith('•') || l.trim().startsWith('-'));
        if (isBulletList && lines.length > 0) {
          return (
            <ul key={i} className="medibot-msg-list">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[•-]\s*/, ''))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="medibot-msg-p">
            {lines.map((l, j) => (
              <span key={j}>
                {inline(l)}
                {j < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}

function inline(text: string): React.ReactNode {
  // bold **x** then italic *x* or _x_
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={k++}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={k++}>{m[3]}</em>);
    else if (m[4]) parts.push(<em key={k++}>{m[4]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function MessageList({ messages, loading, onSpeak, onStopSpeak, speaking }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div ref={scrollRef} className="medibot-scroll">
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-5 sm:px-6">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          const chip = !isUser ? urgencyChip(m.urgency) : null;
          const empty = !isUser && !m.content && loading;
          return (
            <div key={m.id} className={`medibot-msg-row ${isUser ? 'user' : 'assistant'}`}>
              <div className={`medibot-avatar ${isUser ? 'user' : 'assistant'}`}>
                {isUser ? <span>You</span> : <HeartPulse size={18} />}
              </div>
              <div className="medibot-msg-body">
                <div className="medibot-msg-name">{isUser ? 'You' : 'MediBot'}</div>
                <div className={`medibot-bubble ${isUser ? 'user' : 'assistant'} ${empty ? 'typing' : ''}`}>
                  {empty ? (
                    <span className="medibot-typing">
                      <i /> <i /> <i />
                    </span>
                  ) : (
                    <FormattedText text={m.content} />
                  )}
                </div>

                {!isUser && m.content && !empty && (
                  <div className="medibot-msg-actions">
                    {chip && (
                      <span className={`medibot-urgency ${chip.cls}`}>
                        <chip.icon size={12} />
                        {chip.label}
                      </span>
                    )}
                    <button
                      className="medibot-msg-action"
                      onClick={() => copy(m.id, m.content)}
                      aria-label="Copy message"
                    >
                      <Clipboard size={13} />
                      {copiedId === m.id ? 'Copied' : 'Copy'}
                    </button>
                    {speaking ? (
                      <button className="medibot-msg-action" onClick={onStopSpeak} aria-label="Stop voice">
                        <Square size={13} /> Stop
                      </button>
                    ) : (
                      <button
                        className="medibot-msg-action"
                        onClick={() => onSpeak(m.content)}
                        aria-label="Read aloud"
                      >
                        <Volume2 size={13} /> Listen
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
