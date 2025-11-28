import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProductSelection from './screens/ProductSelection.jsx';
import PaymentScreen from './screens/PaymentScreen.jsx';
import DispensingScreen from './screens/DispensingScreen.jsx';
import ThankYouScreen from './screens/ThankYouScreen.jsx';
import ErrorScreen from './screens/ErrorScreen.jsx';
import AdminScreen from './screens/AdminScreen.jsx';
import Screensaver from './components/Screensaver.jsx';
import SplashScreen from './components/SplashScreen.jsx';
import useIdleTimer from './hooks/useIdleTimer'; // Extension removed for safety

const App = () => {
  // 1. Activate Idle Timer (e.g., 60 seconds)
  const isIdle = useIdleTimer(60000); 
  
  // State to track if the boot animation has finished
  const [hasBooted, setHasBooted] = useState(false);

  return (
    <div className="w-full h-full gradient-bg relative">
      
      {/* 1. Show Splash Screen ONLY if not booted yet */}
      {!hasBooted && (
        <SplashScreen onFinish={() => setHasBooted(true)} />
      )}

      {/* 2. Screensaver (Only active if booted AND idle) */}
      <Screensaver isActive={isIdle && hasBooted} />

      {/* Main App Routes */}
      <Routes>
        <Route path="/" element={<ProductSelection />} />
        <Route path="/payment" element={<PaymentScreen />} />
        <Route path="/dispensing" element={<DispensingScreen />} />
        <Route path="/thank-you" element={<ThankYouScreen />} />
        <Route path="/error" element={<ErrorScreen />} />
        <Route path="/admin" element={<AdminScreen />} />
      </Routes>
    </div>
  );
};

export default App;