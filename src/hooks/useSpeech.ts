import { useState, useEffect, useCallback } from 'react';

export function useSpeech(onResult: (text: string) => void, langCode: string = 'en-US') {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = langCode;

    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'network') {
        console.warn('Speech recognition requires an internet connection. Please check your network.');
      }
      setIsListening(false);
    };

    setRecognition(rec);
  }, [onResult, langCode]);

  const toggleListening = useCallback(() => {
    if (!recognition) return;
    
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        recognition.start();
        setIsListening(true);
      } catch (e) {
        console.error('Failed to start speech recognition:', e);
      }
    }
  }, [recognition, isListening]);

  return { isListening, toggleListening, isSupported };
}
