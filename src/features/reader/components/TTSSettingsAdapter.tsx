import React, { useEffect, useState } from 'react';
import { TTSSettings } from '../../../components/TTSSettings';
import { TTSService } from '../services/TTSService';
import { SimplifiedReaderModel } from '../../../types/simplified';

interface TTSSettingsAdapterProps {
  isOpen: boolean;
  onClose: () => void;
  reader: SimplifiedReaderModel;
  colorScheme: {
    background: string;
    text: string;
    highlight: string;
  };
}

/**
 * Adapter component for TTSSettings that uses the new TTSService
 */
export const TTSSettingsAdapter: React.FC<TTSSettingsAdapterProps> = ({
  isOpen,
  onClose,
  reader,
  colorScheme,
}) => {
  // Get TTSService instance
  const ttsService = TTSService.getInstance();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [rate, setRate] = useState<number>(1);
  const [pitch, setPitch] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  
  // Fetch available voices when component mounts
  useEffect(() => {
    if (isOpen) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
          setVoices(availableVoices);
          
          // Use stored settings or defaults
          const ttsSettings = localStorage.getItem('ttsSettings');
          if (ttsSettings) {
            try {
              const parsedSettings = JSON.parse(ttsSettings);
              setSelectedVoice(parsedSettings.voice || '');
              setRate(parsedSettings.rate || 1);
              setPitch(parsedSettings.pitch || 1);
              setVolume(parsedSettings.volume || 1);
              
              // Apply to the service
              ttsService.setOptions({
                voice: parsedSettings.voice || '',
                speed: parsedSettings.rate || 1,
                format: 'mp3',
                returnTimestamps: false
              });
            } catch (e) {
              console.error('Failed to parse TTS settings:', e);
            }
          }
        }
      };
      
      // SpeechSynthesis.getVoices may not be available immediately
      if (window.speechSynthesis.getVoices().length) {
        loadVoices();
      } else {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
      
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, [isOpen, ttsService]);
  
  // Apply changes to the TTS service and save to localStorage
  const saveSettings = () => {
    const settings = {
      voice: selectedVoice,
      rate,
      pitch,
      volume
    };
    
    localStorage.setItem('ttsSettings', JSON.stringify(settings));
    
    // Apply to the TTS service
    ttsService.setOptions({
      voice: selectedVoice,
      speed: rate,
      format: 'mp3',
      returnTimestamps: false
    });
    
    // Apply to the reader model if it has TTS voice setting function
    if (reader && typeof reader.setTTSVoice === 'function') {
      reader.setTTSVoice(selectedVoice);
    }
    
    onClose();
  };
  
  // Play a voice sample
  const playVoiceSample = async (voiceId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (playingVoice) {
      // Stop current playback if any
      window.speechSynthesis.cancel();
    }
    
    setPlayingVoice(voiceId);
    
    // Find the voice in our list
    const voice = voices.find(v => v.voiceURI === voiceId);
    if (voice) {
      const utterance = new SpeechSynthesisUtterance("This is a sample of how this voice sounds. How does it sound?");
      utterance.voice = voice;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      
      utterance.onend = () => {
        setPlayingVoice(null);
      };
      
      utterance.onerror = () => {
        console.error("Error playing voice sample");
        setPlayingVoice(null);
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      setPlayingVoice(null);
    }
  };
  
  // Group voices by language
  const voicesByLanguage = voices.reduce((groups, voice) => {
    const lang = voice.lang.split('-')[0] || 'other';
    if (!groups[lang]) {
      groups[lang] = [];
    }
    groups[lang].push(voice);
    return groups;
  }, {} as Record<string, typeof voices>);

  // Language display names
  const languageNames: Record<string, string> = {
    'en': 'English (US)',
    'en-GB': 'English (UK)',
    'zh': 'Chinese (Mandarin)',
    'ja': 'Japanese',
    'fr': 'French',
    'es': 'Spanish',
    'hi': 'Hindi',
    'it': 'Italian',
    'pt': 'Portuguese',
    'de': 'German',
    'ru': 'Russian',
    'other': 'Other Languages'
  };
  
  // Create a better organized language order and layout
  const languageOrder = ['en', 'en-GB', 'zh', 'ja', 'fr', 'es', 'hi', 'it', 'pt', 'de', 'ru', 'other'];
  
  // Map browser voices to a format compatible with the original TTSSettings
  const mappedVoices = voices.map(voice => ({
    id: voice.voiceURI,
    name: voice.name,
    langCode: voice.lang,
    quality: voice.localService ? 'A' : 'B', // Local voices typically have better quality
    neural: !voice.localService, // Non-local are typically cloud/neural voices
    provider: voice.localService ? 'System' : 'Browser',
  }));
  
  // Create adapter methods and props for the original TTSSettings component
  const adapterProps = {
    isOpen,
    onClose,
    colorScheme,
    reader: {
      ...reader,
      setTTSVoice: (voiceId: string) => {
        setSelectedVoice(voiceId);
        if (reader && typeof reader.setTTSVoice === 'function') {
          reader.setTTSVoice(voiceId);
        }
      },
      wpm: reader.wpm || 200
    } as any, // Cast to any to satisfy the original component's expectations
    // Original TTSSettings expects these props
    playingVoice,
    voices: mappedVoices,
    onPlayVoiceSample: playVoiceSample,
    selectedVoice,
    onVoiceChange: (voice: string) => setSelectedVoice(voice),
    voicesByLanguage,
    languageNames,
    languageOrder,
    rate,
    onRateChange: (newRate: number) => setRate(newRate),
    pitch,
    onPitchChange: (newPitch: number) => setPitch(newPitch),
    volume,
    onVolumeChange: (newVolume: number) => setVolume(newVolume),
    onSave: saveSettings,
    // Function to get quality stars for display
    getQualityStars: (quality: string | undefined): string => {
      if (!quality) return '';
      const baseGrade = quality.charAt(0);
      switch (baseGrade) {
        case 'A': return '⭐⭐⭐⭐⭐'; 
        case 'B': return '⭐⭐⭐⭐';
        case 'C': return '⭐⭐⭐';
        case 'D': return '⭐⭐';
        case 'F': return '⭐';
        default: return '';
      }
    }
  };
  
  return <TTSSettings {...adapterProps} />;
}; 