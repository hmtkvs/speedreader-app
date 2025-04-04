import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ReaderContainer } from '../containers/ReaderContainer';

/**
 * Example of how to use the Reader feature in App.tsx
 * 
 * This demonstrates how App.tsx should be refactored to use the Reader feature.
 * The actual implementation would include other features and components.
 */
function AppExample() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/reader" element={<ReaderContainer />} />
        {/* Add other routes for other features */}
      </Routes>
    </Router>
  );
}

/**
 * Example home page that links to the reader
 */
function Home() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Speed Reader App</h1>
      
      <p className="mb-4">
        Welcome to the Speed Reader application. Click the button below to start reading.
      </p>
      
      <a 
        href="/reader" 
        className="px-4 py-2 bg-blue-600 text-white rounded-md inline-block"
      >
        Open Reader
      </a>
    </div>
  );
}

export default AppExample; 