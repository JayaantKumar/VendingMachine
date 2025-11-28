import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProductSelection from './screens/ProductSelection.jsx';
import PaymentScreen from './screens/PaymentScreen.jsx';
import DispensingScreen from './screens/DispensingScreen.jsx';
import ThankYouScreen from './screens/ThankYouScreen.jsx';
import ErrorScreen from './screens/ErrorScreen.jsx';
import AdminScreen from './screens/AdminScreen.jsx'; // Your existing admin
import Screensaver from './components/Screensaver.jsx'; // Import new component
import useIdleTimer from './hooks/useIdleTimer.js'; // Import new hook

const App = () => {
  // 1. Activate Idle Timer (e.g., 60 seconds)
  const isIdle = useIdleTimer(60000); 

  return (
    <div className="w-full h-full gradient-bg relative">
      
      {/* 2. Render Screensaver conditionally */}
      {/* It sits ON TOP of everything else (z-index 100) */}
      <Screensaver isActive={isIdle} />

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