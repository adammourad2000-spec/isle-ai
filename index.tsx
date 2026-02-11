import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { IslandProvider, IslandLoadingScreen, IslandErrorScreen, useIsland } from './src/lib/island-context';

console.log('🚀 Isle AI starting...');

const rootElement = document.getElementById('root');
console.log('🔍 Root element:', rootElement);
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

/**
 * Wrapper component to handle island loading states
 */
function AppWithIsland() {
  const { config, isLoading, error } = useIsland();

  if (isLoading) {
    return <IslandLoadingScreen />;
  }

  if (error || !config) {
    return <IslandErrorScreen error={error || new Error('Configuration not loaded')} />;
  }

  return <App />;
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <IslandProvider>
      <AppWithIsland />
    </IslandProvider>
  </React.StrictMode>
);