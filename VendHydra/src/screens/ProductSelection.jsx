import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import { products } from '../data/products.js';

const ProductCard = ({ product }) => (
  <Link
    to="/payment"
    state={{ product }}
    className="product-card"
    // --- Using the simplest template literal. This will now work. ---
    style={{ backgroundImage: `url(${product.image})` }}
  >
    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent rounded-b-3xl">
      <h3 className="text-4xl font-bold drop-shadow-lg">{product.name}</h3>
    </div>
    <div className="price-overlay">
      <span>₹{product.price}</span>
    </div>
  </Link>
);

const ProductSelection = () => {
  return (
    <div className="flex flex-col h-screen">
      <Header currentStep={1} />
      <main className="flex-1 flex flex-col items-center justify-center p-10 overflow-hidden">
        <h1 className="text-6xl font-black text-white drop-shadow-xl text-center">
          Ethereal Flavor Journey
        </h1>
        <h2 className="text-2xl text-white/90 drop-shadow-lg mt-4 text-center">
          Discover a symphony of tastes for your well-being
        </h2>

        {/* Horizontal Carousel */}
        <div className="w-full max-w-7xl mt-12">
          <div className="flex gap-8 p-8 carousel-container overflow-x-auto">
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