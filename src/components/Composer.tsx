import { useEffect, useRef, useState } from 'react';
import { Globe, Mic, Send, Square } from 'lucide-react';

interface ComposerProps {
  onSend: (text: string) => void;
  loading: boolean;
  voiceSupported: boolean;
  listening: boolean;
  onStartListening: (onResult: (text: string) => void) => void;
  onStopListening: () => void;
  languages: string[];
  language: string;
  onLanguageChange: (lang: string) => void;
}

export default function Composer({
  onSend,
  loading,
  voiceSupported,
  listening,
  onStartListening,
  onStopListening,
  languages,
  language,
  onLanguageChange,
}: ComposerProps) {
  const [text, setText] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
  }, [text]);

  const submit = () => {
    const v = text.trim();
    if (!v || loading) return;
    onSend(v);
    setText('');
  };

  const handleVoice = () => {
    if (listening) {
      onStopListening();
    } else {
      onStartListening((t) => {
        setText((prev) => (prev ? prev + ' ' + t : t));
      });
    }
  };

  return (
    <div className="medibot-composer-wrap">
      <div className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <div className="medibot-composer">
          {voiceSupported && (
            <div className="medibot-voice-tools">
              <button
                onClick={handleVoice}
                className={`medibot-mic-btn ${listening ? 'listening' : ''}`}
                aria-label={listening ? 'Stop voice input' : 'Start voice input'}
              >
                {listening ? <Square size={16} /> : <Mic size={18} />}
              </button>
              <label className="medibot-lang-select">
                <Globe size={13} />
                <select
                  value={language}
                  onChange={(e) => onLanguageChange(e.target.value)}
                  aria-label="Voice language"
                >
                  {languages.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder={listening ? 'Listening… speak now' : 'Describe your symptoms…'}
            className="medibot-textarea"
          />

          <button
            onClick={submit}
            disabled={!text.trim() || loading}
            className="medibot-send-btn"
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="medibot-composer-note">
          MediBot offers general health information, not a medical diagnosis. In an emergency, contact your local emergency services.
        </p>
      </div>
    </div>
  );
}
