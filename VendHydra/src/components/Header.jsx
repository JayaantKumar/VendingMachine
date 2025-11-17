import React from 'react';

// Protein Icon SVG
const ProteinIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-12 h-12 text-primary"
  >
    <path
      fillRule="evenodd"
      d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM15.75 9.75a3 3 0 116 0 3 3 0 01-6 0zM2.25 9.75a3 3 0 116 0 3 3 0 01-6 0zM12 21a8.25 8.25 0 00-8.25-8.25H3a9.75 9.75 0 019.75 9.75v.013a9.75 9.75 0 01-9.75 9.737V22.5A8.25 8.25 0 0012 21zM21 12.75H13.5A8.25 8.25 0 0021 21v.013a9.75 9.75 0 01-9.75 9.737V22.5a8.25 8.25 0 008.25-8.25z"
      clipRule="evenodd"
    />
  </svg>
);

// Cart Icon SVG
const CartIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-10 h-10 text-white"
  >
    <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.75 3.75 0 003.62 2.872h6.23c1.99 0 3.673-1.53 3.998-3.504l1.123-6.332A.75.75 0 0019.5 7.5h-15v-1.5a.75.75 0 00-.75-.75H2.25zM6.9 12h10.29l-.693 3.903a2.25 2.25 0 01-2.235 2.097H8.316a2.25 2.25 0 01-2.235-2.097L6.9 12zM12 21a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM18.75 19.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
  </svg>
);

const Step = ({ number, label, isActive }) => (
  <div className={`step-item ${isActive ? 'active' : ''}`}>
    <span className="step-number">{number}</span>
    <span className="drop-shadow-md">{label}</span>
  </div>
);

const Header = ({ currentStep = 1 }) => {
  const steps = ['Select', 'Pay', 'Shake', 'Enjoy'];

  return (
    <header className="w-full p-6 flex justify-between items-center bg-black/10 shadow-lg">
      {/* Logo */}
      <div className="flex items-center gap-4">
        <ProteinIcon />
        <span className="text-4xl font-black text-white drop-shadow-lg">
          ProteinVEND
        </span>
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

      {/* Cart Icon */}
      <div>
        <CartIcon />
      </div>
    </header>
  );
};

export default Header;