import { Activity, Menu, Moon, Plus, Sun, X } from 'lucide-react';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onNewChat: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export default function Header({
  theme,
  onToggleTheme,
  onNewChat,
  onToggleSidebar,
  sidebarOpen,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl medibot-header">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <button
          onClick={onToggleSidebar}
          className="medibot-icon-btn lg:hidden"
          aria-label="Toggle history"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="flex items-center gap-2.5">
          <div className="medibot-logo">
            <Activity size={20} className="text-cyan-300" />
          </div>
          <div className="leading-tight">
            <h1 className="medibot-logo-text">MediBot</h1>
            <p className="medibot-tagline hidden sm:block">Your Healthcare, Just One Tap Away.</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={onNewChat} className="medibot-new-chat-btn">
            <Plus size={16} />
            <span className="hidden sm:inline">New Chat</span>
          </button>
          <button
            onClick={onToggleTheme}
            className="medibot-icon-btn"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
