import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Changed Link to useNavigate for logic
import Header from '../components/Header.jsx';
import { products } from '../data/products.js';

// --- Single Product Card Component ---
const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const [scoops, setScoops] = useState(1);

  // Calculate dynamic price based on scoops
  const totalPrice = product.price * scoops;

  const handleIncrement = (e) => {
    e.stopPropagation(); // Stop clicking the card
    if (scoops < 3) {
      setScoops(prev => prev + 1);
    }
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (scoops > 1) {
      setScoops(prev => prev - 1);
    }
  };

  const handleSelect = () => {
    // Navigate to payment with the UPDATED price and scoop count
    navigate('/payment', { 
      state: { 
        product: {
          ...product,
          price: totalPrice, // Override base price with total price
          originalPrice: product.price,
          scoops: scoops
        } 
      } 
    });
  };

  return (
    <div 
      onClick={handleSelect}
      className="product-card group relative flex flex-col justify-end overflow-hidden cursor-pointer"
      // Use standard template literal for URL to avoid 404s
      style={{ backgroundImage: `url(${product.image})` }}
    >
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent rounded-3xl" />

      {/* Content Container */}
      <div className="relative z-10 p-6 flex flex-col gap-3">
        
        {/* Title */}
        <h3 className="text-4xl font-bold text-white drop-shadow-lg leading-tight">
          {product.name}
        </h3>

        {/* Price & Scoop Selector Row */}
        <div className="flex items-center justify-between mt-2">
          
          {/* Dynamic Price Display */}
          <div className="flex flex-col">
            <span className="text-sm text-gray-300 font-medium uppercase tracking-wider">Total</span>
            <span className="text-3xl font-black text-primary drop-shadow-md">
              ₹{totalPrice}
            </span>
          </div>

          {/* Scoop Counter Buttons */}
          <div 
            className="flex items-center gap-3 bg-white/20 backdrop-blur-md rounded-full p-1 border border-white/30"
            onClick={(e) => e.stopPropagation()} // Prevent card click when using buttons
          >
            {/* Decrease Button */}
            <button 
              onClick={handleDecrement}
              disabled={scoops === 1}
              className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-xl transition-all
                ${scoops === 1 
                  ? 'bg-white/10 text-gray-400 cursor-not-allowed' 
                  : 'bg-white text-black hover:bg-gray-200 active:scale-95'}`}
            >
              -
            </button>

            {/* Scoop Count Display */}
            <div className="flex flex-col items-center w-8">
              <span className="text-xl font-bold text-white">{scoops}</span>
              <span className="text-[8px] uppercase text-white/80 font-bold tracking-wide">Scoop</span>
            </div>

            {/* Increase Button */}
            <button 
              onClick={handleIncrement}
              disabled={scoops === 3}
              className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-xl transition-all
                ${scoops === 3 
                  ? 'bg-white/10 text-gray-400 cursor-not-allowed' 
                  : 'bg-primary text-white hover:bg-green-600 active:scale-95 shadow-lg'}`}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Hover Effect: "Tap to Pay" hint */}
      <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex items-center justify-center">
        <span className="bg-black/50 text-white px-6 py-2 rounded-full backdrop-blur-md font-bold text-lg border border-white/20 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
          Tap to Pay
        </span>
      </div>
    </div>
  );
};

const ProductSelection = () => {
  return (
    <div className="flex flex-col h-screen">
      <Header currentStep={1} />
      <main className="flex-1 flex flex-col items-center justify-center p-10 overflow-hidden">
        <h1 className="text-6xl font-black text-white drop-shadow-xl text-center">
          Ethereal Flavor Journey
        </h1>
        <h2 className="text-2xl text-white/90 drop-shadow-lg mt-4 text-center max-w-3xl">
          Customize your strength. Choose up to <span className="text-primary font-bold">3 scoops</span> for maximum protein.
        </h2>

        {/* Horizontal Carousel */}
        <div className="w-full max-w-[95vw] mt-12">
          <div className="flex gap-8 p-8 carousel-container overflow-x-auto pb-12 snap-x">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductSelection;