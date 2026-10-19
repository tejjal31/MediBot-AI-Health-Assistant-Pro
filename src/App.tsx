import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import AnimatedCursor from '@/components/AnimatedCursor';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Welcome from '@/components/Welcome';
import MessageList from '@/components/MessageList';
import Composer from '@/components/Composer';
import { useChat } from '@/hooks/useChat';
import { useTheme } from '@/hooks/useTheme';
import { useVoice } from '@/hooks/useVoice';

function App() {
  const { theme, toggle } = useTheme();
  const chat = useChat();
  const voice = useVoice();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const handleSend = (text: string) => {
    void chat.sendMessage(text, voice.language);
    setSidebarOpen(false);
  };

  const handleSpeak = (text: string) => {
    voice.speak(text);
    setSpeakingId(text);
  };
  const handleStopSpeak = () => {
    voice.stopSpeaking();
    setSpeakingId(null);
  };

  const showWelcome = chat.messages.length === 0 && !chat.loading;

  return (
    <div className="medibot-app">
      <AnimatedCursor />

      {/* ambient background */}
      <div className="medibot-bg">
        <div className="medibot-bg-grid" />
        <div className="medibot-bg-glow medibot-bg-glow-1" />
        <div className="medibot-bg-glow medibot-bg-glow-2" />
      </div>

      <Header
        theme={theme}
        onToggleTheme={toggle}
        onNewChat={chat.startNewChat}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        sidebarOpen={sidebarOpen}
      />

      <div className="medibot-layout">
        <Sidebar
          open={sidebarOpen}
          sessions={chat.sessions}
          activeSessionId={chat.activeSessionId}
          loadingHistory={chat.loadingHistory}
          onSelect={(id) => {
            void chat.loadSession(id);
            setSidebarOpen(false);
          }}
          onDelete={chat.deleteSession}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="medibot-main">
          {chat.error && (
            <div className="medibot-error-banner">
              <AlertCircle size={16} />
              <span>{chat.error}</span>
              <button onClick={chat.clearError} aria-label="Dismiss">
                <X size={14} />
              </button>
            </div>
          )}

          {showWelcome ? (
            <div className="medibot-scroll">
              <Welcome onPick={handleSend} />
            </div>
          ) : (
            <MessageList
              messages={chat.messages}
              loading={chat.loading}
              onSpeak={handleSpeak}
              onStopSpeak={handleStopSpeak}
              speaking={speakingId !== null}
            />
          )}

          <Composer
            onSend={handleSend}
            loading={chat.loading}
            voiceSupported={voice.supported}
            listening={voice.listening}
            onStartListening={voice.startListening}
            onStopListening={voice.stopListening}
            languages={voice.languages}
            language={voice.language}
            onLanguageChange={voice.setLanguage}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
