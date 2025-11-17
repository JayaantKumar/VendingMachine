import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProductSelection from './screens/ProductSelection.jsx';
import PaymentScreen from './screens/PaymentScreen.jsx';
import DispensingScreen from './screens/DispensingScreen.jsx';
import ThankYouScreen from './screens/ThankYouScreen.jsx';
import ErrorScreen from './screens/ErrorScreen.jsx';

const App = () => {
  return (
    <div className="w-full h-full gradient-bg">
      <Routes>
        <Route path="/" element={<ProductSelection />} />
        <Route path="/payment" element={<PaymentScreen />} />
        <Route path="/dispensing" element={<DispensingScreen />} />
        <Route path="/thank-you" element={<ThankYouScreen />} />
        <Route path="/error" element={<ErrorScreen />} />
      </Routes>
    </div>
  );
};

export default App;