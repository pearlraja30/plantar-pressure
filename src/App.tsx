import React from 'react';
import { PodoLoadApp } from './components/podoload/PodoLoadApp';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary>
      <PodoLoadApp />
    </ErrorBoundary>
  );
}

export default App;
