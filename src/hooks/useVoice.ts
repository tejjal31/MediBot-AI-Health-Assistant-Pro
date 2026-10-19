import { useCallback, useEffect, useRef, useState } from 'react';

// Multi-language speech recognition + synthesis.
// Uses the Web Speech API. Language codes map to BCP-47 tags.
const LANG_OPTIONS: Record<string, string> = {
  English: 'en-US',
  Hinglish: 'hi-IN',
  Spanish: 'es-ES',
  Hindi: 'hi-IN',
  French: 'fr-FR',
  German: 'de-DE',
  Arabic: 'ar-SA',
  Chinese: 'zh-CN',
  Japanese: 'ja-JP',
};

interface SpeechRecognitionResult {
  transcript: string;
}

// Minimal typings for the Web Speech API (not in standard lib DOM types)
interface SREvent extends Event {
  results: {
    length: number;
    [i: number]: { 0: { transcript: string }; isFinal: boolean };
  };
}

export function useVoice() {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [language, setLanguage] = useState<string>('English');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      setSupported(true);
      const rec = new SR();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = LANG_OPTIONS[language] || 'en-US';
      rec.onresult = (e: SREvent) => {
        const transcript = e.results[0]?.[0]?.transcript || '';
        if (onResultRef.current) onResultRef.current(transcript);
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recognitionRef.current = rec;
    } else {
      setSupported(false);
    }
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const onResultRef = useRef<((text: string) => void) | null>(null);

  const startListening = useCallback((onResult: (text: string) => void) => {
    if (!recognitionRef.current) return;
    onResultRef.current = onResult;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      // already started
    }
  }, []);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    // strip markdown-ish markers for cleaner speech
    const clean = text.replace(/[*_#>`]/g, '').replace(/\n+/g, '. ');
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = LANG_OPTIONS[language] || 'en-US';
    utter.rate = 1;
    window.speechSynthesis.speak(utter);
  }, [language]);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  return {
    listening,
    supported,
    language,
    setLanguage,
    languages: Object.keys(LANG_OPTIONS),
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
