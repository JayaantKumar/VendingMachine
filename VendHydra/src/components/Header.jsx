import React from 'react';

const Step = ({ number, label, isActive }) => (
  <div className={`step-item ${isActive ? 'active' : ''}`}>
    <span className="step-number">{number}</span>
    <span className="drop-shadow-md">{label}</span>
  </div>
);

const Header = ({ currentStep = 1 }) => {
  const steps = ['Select', 'Pay', 'Shake', 'Enjoy'];

  return (
    <header className="w-full p-6 flex justify-between items-center bg-black/10 shadow-lg backdrop-blur-sm z-50">
      {/* Logo - Image Only */}
      <div className="flex items-center">
        <img
          src="/logo.png"
          alt="Vending Logo"
          className="h-24 w-auto drop-shadow-lg object-contain"  // 🔥 slightly bigger logo
        />
      </div>

      {/* Step Indicator */}
      <nav className="flex items-center gap-4">
        {steps.map((label, index) => (
          <Step
            key={label}
            number={index + 1}
            label={label}
            isActive={currentStep === index + 1}
          />
        ))}
      </nav>

      {/* Empty div for balance */}
      <div className="w-20"></div>
    </header>
  );
};

export default Header;
