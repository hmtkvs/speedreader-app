# Feature-Based Architecture

This document outlines the feature-based architecture used in the Speed Reader application.

## Overview

The application is organized into modular, self-contained features. Each feature contains everything it needs to function, including components, hooks, services, and state management. This approach improves maintainability, testability, and code organization.

## Feature Structure

Each feature follows a standard structure:

```
src/features/feature-name/
├── components/     # UI components specific to this feature
├── contexts/       # React contexts for state management
├── hooks/          # Custom hooks
├── services/       # Business logic and API integrations
├── models/         # Type definitions and models
├── pages/          # Top-level page components
├── utils/          # Utility functions
└── index.ts        # Public API exports
```

Features should only expose what's needed through their `index.ts` file, keeping implementation details private.

## Current Features

### Reader Feature

The Reader feature handles text display, reading control (play/pause), and reading settings.

**Public API:**
- Components: `FullscreenReader`, `InlineReader`, `ReaderSettingsModal`, `TTSSettingsAdapter`
- Hooks: `useReader` for controlling the reader
- Context: `ReaderProvider` for state management
- Pages: `ReaderPage` for the main reading view

### PDF Management Feature

The PDF Management feature handles uploading, storing, and managing PDF files.

**Public API:**
- Components: `PDFManagerAdapter`, `SavedPDFsPanelAdapter`
- Services: PDF processing and storage

### Theme Feature

The Theme feature manages the application's color schemes and appearance settings.

**Public API:**
- Context: `ThemeProvider` for theme state management
- Hook: `useTheme` for accessing and modifying theme settings

### Layout Feature

The Layout feature provides common UI layout components.

**Public API:**
- Components: `MainLayout` for the application shell

### App Feature

The App feature ties everything together, serving as the entry point and router.

**Public API:**
- `AppRouter` for navigation
- The default export for the main App component

## Best Practices

1. **Feature Independence**: Features should be self-contained and not directly depend on other features' implementation details.

2. **Dependency Injection**: When features need to interact, use dependency injection through props and callbacks.

3. **Interface-Based Communication**: Features should communicate through well-defined interfaces, not implementation details.

4. **Minimal Public API**: Only expose what's necessary through each feature's index.ts file.

5. **Feature-Specific State**: Keep state contained within features when possible.

6. **Adapter Pattern**: Use adapters to bridge between features during migration or for backward compatibility.

## Evolution Strategy

When adding new features or enhancing existing ones:

1. Create a new feature folder if it's a distinct piece of functionality
2. Add to an existing feature if it's an extension of that feature's core responsibility
3. Refactor shared code into utility functions or common components when appropriate

## Migration Path

The application is gradually migrating from a monolithic structure to this feature-based architecture. During this transition:

1. Adapter components bridge between old and new implementations
2. Features are extracted incrementally from the monolithic code
3. Legacy code is replaced once features are fully implemented 