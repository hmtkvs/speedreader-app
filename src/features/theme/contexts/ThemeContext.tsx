import React, { createContext, useContext, useState, ReactNode } from 'react';
import { COLOR_SCHEMES } from '../../../models/types';

/**
 * Type for theme color scheme
 */
interface ColorScheme {
  background: string;
  text: string;
  highlight: string;  // Making this required simplifies things
  font?: string;
}

/**
 * Theme context type
 */
interface ThemeContextType {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: Partial<ColorScheme>) => void;
}

/**
 * Context for theme settings
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Props for ThemeProvider component
 */
interface ThemeProviderProps {
  children: ReactNode;
  initialColorScheme?: Partial<ColorScheme>;
}

/**
 * Provider component for theme context
 */
export function ThemeProvider({ 
  children,
  initialColorScheme
}: ThemeProviderProps) {
  // Use the first color scheme as default, ensuring highlight is defined
  const defaultScheme: ColorScheme = {
    ...COLOR_SCHEMES[0],
    highlight: COLOR_SCHEMES[0].highlight || '#FF3B30',
    ...(initialColorScheme || {})
  };
  
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(defaultScheme);
  
  // Wrapper function to handle partial updates
  const setColorScheme = (scheme: Partial<ColorScheme>) => {
    setColorSchemeState(current => ({
      ...current,
      ...scheme
    }));
  };
  
  return (
    <ThemeContext.Provider value={{ colorScheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access the theme context
 * 
 * @returns Theme context value
 * @throws Error if used outside of a ThemeProvider
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    // Fallback to default theme if no context is available
    return {
      colorScheme: {
        ...COLOR_SCHEMES[0],
        highlight: COLOR_SCHEMES[0].highlight || '#FF3B30'
      },
      setColorScheme: () => {}
    };
  }
  
  return context;
} 