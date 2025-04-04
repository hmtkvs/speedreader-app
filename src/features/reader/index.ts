/**
 * Reader Feature
 * 
 * Public API exports for the Reader feature
 */

// Components
export { FullscreenReader } from './components/FullscreenReader';
export { InlineReader } from './components/InlineReader';
export { ReaderSettingsModal } from './components/ReaderSettingsModal';
export { TTSSettingsAdapter } from './components/TTSSettingsAdapter';

// Container
export { ReaderContainer } from './containers/ReaderContainer';

// Hooks
export { useReader } from './hooks/useReader';
export type { UseReaderOptions, UseReaderResult } from './hooks/useReader';

// Context
export { ReaderProvider, useReaderContext } from './contexts/ReaderContext';
export type { ReaderProviderProps } from './contexts/ReaderContext';

// Models
export { ReaderModel } from './models/ReaderModel';
export type { ReaderSettings, ReadingWord } from './models/ReaderModel';

// Services
export { TTSService } from './services/TTSService';
export type { TTSOptions, TTSPlaybackState, TTSVoice } from './services/TTSService';

// Pages
export { ReaderPage } from './pages/ReaderPage'; 