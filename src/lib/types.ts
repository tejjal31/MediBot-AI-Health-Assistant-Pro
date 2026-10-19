export interface ChatSession {
  id: string;
  session_ref: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageRow {
  id: string;
  session_id: string;
  session_ref: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string | null;
  urgency?: 'low' | 'medium' | 'high' | null;
  created_at: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string | null;
  urgency?: 'low' | 'medium' | 'high' | null;
  created_at: string;
}

export interface AiResponse {
  reply: string;
  intent: string | null;
  urgency: 'low' | 'medium' | 'high' | null;
  engine: 'llm' | 'local';
}
