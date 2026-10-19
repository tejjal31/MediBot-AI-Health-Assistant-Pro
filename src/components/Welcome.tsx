import { Activity, AlertTriangle, ShieldCheck, Stethoscope } from 'lucide-react';

interface WelcomeProps {
  onPick: (text: string) => void;
}

const SHORTCUTS: { id: string; label: string; prompt: string; icon: typeof Activity }[] = [
  { id: 'fever', label: 'Fever & chills', prompt: "I've had a fever with chills since yesterday. What should I do?", icon: Activity },
  { id: 'headache', label: 'Headache', prompt: "I have a throbbing headache on one side of my head since this morning.", icon: Activity },
  { id: 'cold', label: 'Cough & cold', prompt: 'I have a sore throat, runny nose, and a dry cough for 2 days.', icon: Activity },
  { id: 'stomach', label: 'Stomach pain', prompt: "My stomach has been hurting and I feel nauseous since last night.", icon: Activity },
  { id: 'anxiety', label: 'Stress & sleep', prompt: "I've been feeling very anxious and can't sleep well lately.", icon: Activity },
  { id: 'skin', label: 'Skin rash', prompt: 'I have an itchy red rash on my arm that appeared today.', icon: Activity },
];

export default function Welcome({ onPick }: WelcomeProps) {
  return (
    <div className="medibot-welcome">
      <div className="medibot-welcome-hero">
        <div className="medibot-welcome-orb">
          <Stethoscope size={36} className="text-cyan-200" />
        </div>
        <h2 className="medibot-welcome-title">How can I help you today?</h2>
        <p className="medibot-welcome-sub">
          Describe your symptoms in your own words, or tap one of the common concerns below.
          MediBot will guide you with home remedies, precautions, and clear advice on when to see a doctor.
        </p>
      </div>

      <div className="medibot-shortcuts">
        {SHORTCUTS.map((s) => (
          <button
            key={s.id}
            className="medibot-shortcut"
            onClick={() => onPick(s.prompt)}
          >
            <s.icon size={18} className="medibot-shortcut-icon" />
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      <div className="medibot-welcome-notes">
        <div className="medibot-note">
          <ShieldCheck size={18} />
          <span>Evidence-based, safety-first guidance</span>
        </div>
        <div className="medibot-note">
          <AlertTriangle size={18} />
          <span>Always advises when to seek professional care</span>
        </div>
        <div className="medibot-note">
          <Activity size={18} />
          <span>Never claims a definite diagnosis</span>
        </div>
      </div>
    </div>
  );
}
