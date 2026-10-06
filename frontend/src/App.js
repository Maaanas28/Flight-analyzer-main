import React, { useState, useCallback } from 'react';
import Dashboard from './pages/Dashboard';
import BootScreen from './components/BootScreen';

function App() {
  const [bootDone, setBootDone] = useState(false);
  const handleBootComplete = useCallback(() => setBootDone(true), []);

  return (
    <>
      {/* Dashboard is always mounted; boot screen sits on top */}
      <Dashboard />
      {!bootDone && <BootScreen onComplete={handleBootComplete} />}
    </>
  );
}

export default App;