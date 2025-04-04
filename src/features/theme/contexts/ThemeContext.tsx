import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { COLOR_SCHEMES, FONT_FAMILIES, ColorScheme } from '../../../models/types';

// Define the shape of the ThemeContext
interface ThemeContextType {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleDarkMode: () => void;
  setHighlightColor: (color: string) => void;
  setFontFamily: (fontFamily: string) => void;
  availableColorSchemes: ColorScheme[];
  availableFontFamilies: typeof FONT_FAMILIES;
}

// Create the context with a default undefined value
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ThemeProvider props interface
interface ThemeProviderProps {
  children: ReactNode;
  initialColorScheme?: ColorScheme;
}

/**
 * ThemeProvider component that manages color scheme settings
 */
export function ThemeProvider({ 
  children, 
  initialColorScheme = {
    ...COLOR_SCHEMES[0],
    highlight: COLOR_SCHEMES[0].highlight || '#FF3B30'  // Ensure highlight is always defined
  }
}: ThemeProviderProps) {
  // State for the current color scheme
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(initialColorScheme);

  // Function to update the color scheme
  const setColorScheme = useCallback((scheme: ColorScheme) => {
    const updatedScheme = {
      ...scheme,
      highlight: scheme.highlight || colorScheme.highlight || '#FF3B30'
    };
    setColorSchemeState(updatedScheme);
    
    // Store in localStorage for persistence
    localStorage.setItem('colorScheme', JSON.stringify(updatedScheme));
  }, [colorScheme.highlight]);

  // Function to toggle between light and dark mode
  const toggleDarkMode = useCallback(() => {
    const isDark = colorScheme.background === COLOR_SCHEMES[0].background;
    const newScheme = isDark ? COLOR_SCHEMES[1] : COLOR_SCHEMES[0];
    
    setColorScheme({
      ...newScheme,
      highlight: colorScheme.highlight,
      font: colorScheme.font
    });
  }, [colorScheme, setColorScheme]);

  // Function to update the highlight color
  const setHighlightColor = useCallback((color: string) => {
    setColorScheme({
      ...colorScheme,
      highlight: color
    });
  }, [colorScheme, setColorScheme]);

  // Function to update the font family
  const setFontFamily = useCallback((fontFamily: string) => {
    setColorScheme({
      ...colorScheme,
      font: fontFamily
    });
  }, [colorScheme, setColorScheme]);

  // Create the context value
  const contextValue: ThemeContextType = {
    colorScheme,
    setColorScheme,
    toggleDarkMode,
    setHighlightColor,
    setFontFamily,
    availableColorSchemes: COLOR_SCHEMES,
    availableFontFamilies: FONT_FAMILIES
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to use the theme context
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Export color schemes and font families for use outside the context
export { COLOR_SCHEMES, FONT_FAMILIES }; 