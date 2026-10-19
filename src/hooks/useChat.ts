import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, AI_ENDPOINT } from '@/lib/supabase';
import type { AiResponse, ChatSession, Message } from '@/lib/types';

const SESSION_REF_KEY = 'medibot_session_ref';

function getOrCreateSessionRef(): string {
  let ref = localStorage.getItem(SESSION_REF_KEY);
  if (!ref) {
    ref = crypto.randomUUID();
    localStorage.setItem(SESSION_REF_KEY, ref);
  }
  return ref;
}

function uid(): string {
  return crypto.randomUUID();
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef(getOrCreateSessionRef());

  // Load session list on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('session_ref', sessionRef.current)
          .order('updated_at', { ascending: false });
        if (error) throw error;
        if (!active) return;
        setSessions((data as ChatSession[]) || []);
        if (data && data.length > 0) {
          setActiveSessionId(data[0].id);
        }
      } catch {
        // non-fatal — user can still chat, just no persisted history yet
      } finally {
        if (active) setLoadingHistory(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Load messages when activeSessionId changes
  const loadSession = useCallback(async (sessionId: string) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setActiveSessionId(sessionId);
      setMessages(
        (data || []).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          intent: m.intent,
          urgency: m.urgency,
          created_at: m.created_at,
        }))
      );
      setError(null);
    } catch (e) {
      setError('Could not load this conversation.');
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const startNewChat = useCallback(() => {
    setActiveSessionId(null);
    setMessages([]);
    setError(null);
  }, []);

  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await supabase.from('chat_sessions').delete().eq('id', sessionId);
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (activeSessionId === sessionId) {
          startNewChat();
        }
      } catch {
        setError('Could not delete conversation.');
      }
    },
    [activeSessionId, startNewChat]
  );

  const sendMessage = useCallback(
    async (text: string, language = 'English') => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setError(null);

      const userMsg: Message = {
        id: uid(),
        role: 'user',
        content: trimmed,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // optimistic temp assistant placeholder
      const placeholderId = uid();
      setMessages((prev) => [
        ...prev,
        { id: placeholderId, role: 'assistant', content: '', created_at: new Date().toISOString() },
      ]);
      setLoading(true);

      // Determine session id (create lazily on first message)
      let sessionId = activeSessionId;
      if (!sessionId) {
        sessionId = uid();
        setActiveSessionId(sessionId);
      }

      try {
        const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
        const res = await fetch(AI_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            messages: history,
            language,
            sessionRef: sessionRef.current,
            sessionId,
            sessionTitle: trimmed.slice(0, 60),
          }),
        });

        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = (await res.json()) as AiResponse;
        if (!data || typeof data.reply !== 'string') {
          throw new Error('Unexpected response from assistant.');
        }

        const assistantMsg: Message = {
          id: placeholderId,
          role: 'assistant',
          content: data.reply,
          intent: data.intent,
          urgency: data.urgency,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => prev.map((m) => (m.id === placeholderId ? assistantMsg : m)));

        // refresh session list (title/updatedAt may have changed)
        const { data: fresh } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('session_ref', sessionRef.current)
          .order('updated_at', { ascending: false });
        if (fresh) setSessions(fresh as ChatSession[]);
      } catch (e) {
        setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
        setError('I had trouble responding just now. Please try again in a moment.');
      } finally {
        setLoading(false);
      }
    },
    [activeSessionId, loading, messages]
  );

  return {
    messages,
    sessions,
    activeSessionId,
    loading,
    loadingHistory,
    error,
    sendMessage,
    loadSession,
    startNewChat,
    deleteSession,
    clearError: () => setError(null),
  };
}
