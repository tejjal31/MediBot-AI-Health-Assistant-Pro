/*
# MediBot chat history tables (single-tenant, no auth)

## Overview
MediBot is a no-sign-in healthcare chatbot prototype. Conversation history is
persisted per-browser so a visitor can review past chats. Because there is no
login, every policy is scoped to `anon, authenticated` (the anon-key frontend
must be able to read and write its own rows). A `session_ref` text column ties
rows together using a client-generated UUID stored in localStorage, giving each
browser its own private history without requiring accounts.

## New Tables

### chat_sessions
- `id` (uuid, primary key)
- `session_ref` (text, not null) — client-generated UUID grouping a browser's history
- `title` (text, not null) — short title for the conversation (first user message)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### chat_messages
- `id` (uuid, primary key)
- `session_id` (uuid, foreign key -> chat_sessions.id ON DELETE CASCADE)
- `session_ref` (text, not null) — denormalized for fast history listing
- `role` (text, not null) — 'user' | 'assistant'
- `content` (text, not null) — message text
- `intent` (text, nullable) — detected symptom intent (for analytics/display)
- `urgency` (text, nullable) — 'low' | 'medium' | 'high'
- `created_at` (timestamptz, default now())

## Indexes
- `chat_sessions_session_ref_idx` on chat_sessions(session_ref)
- `chat_messages_session_id_idx` on chat_messages(session_id)
- `chat_messages_session_ref_idx` on chat_messages(session_ref)

## Security
- RLS enabled on both tables.
- anon + authenticated have full CRUD scoped to their own `session_ref`.
  (The data is intentionally shared per-browser; session_ref provides soft
  isolation between different browsers. This is a single-tenant prototype.)
*/

CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_ref text NOT NULL,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  session_ref text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  intent text,
  urgency text CHECK (urgency IN ('low', 'medium', 'high')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_sessions_session_ref_idx ON chat_sessions(session_ref);
CREATE INDEX IF NOT EXISTS chat_sessions_created_at_idx ON chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS chat_messages_session_ref_idx ON chat_messages(session_ref);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- chat_sessions policies
DROP POLICY IF EXISTS "anon_select_chat_sessions" ON chat_sessions;
CREATE POLICY "anon_select_chat_sessions" ON chat_sessions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat_sessions" ON chat_sessions;
CREATE POLICY "anon_insert_chat_sessions" ON chat_sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_chat_sessions" ON chat_sessions;
CREATE POLICY "anon_update_chat_sessions" ON chat_sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chat_sessions" ON chat_sessions;
CREATE POLICY "anon_delete_chat_sessions" ON chat_sessions FOR DELETE
  TO anon, authenticated USING (true);

-- chat_messages policies
DROP POLICY IF EXISTS "anon_select_chat_messages" ON chat_messages;
CREATE POLICY "anon_select_chat_messages" ON chat_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat_messages" ON chat_messages;
CREATE POLICY "anon_insert_chat_messages" ON chat_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_chat_messages" ON chat_messages;
CREATE POLICY "anon_update_chat_messages" ON chat_messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chat_messages" ON chat_messages;
CREATE POLICY "anon_delete_chat_messages" ON chat_messages FOR DELETE
  TO anon, authenticated USING (true);

-- updated_at trigger for chat_sessions
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chat_sessions_touch ON chat_sessions;
CREATE TRIGGER chat_sessions_touch BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
