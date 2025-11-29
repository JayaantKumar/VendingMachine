import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import Header from '../components/Header.jsx';
import axios from 'axios';
import { useCart } from '../context/CartContext.jsx'; // Import Cart

// Safe access to API_URL
const API_URL = (import.meta && import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:3000/api';

const PaymentScreen = () => {
  const navigate = useNavigate();
  const { cartItems, cartTotal, clearCart } = useCart(); // Use Cart Data
  const [orderId, setOrderId] = useState('');
  const [timeLeft, setTimeLeft] = useState(300);

  // Create Order on Mount
  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/');
      return;
    }

    const createOrder = async () => {
      try {
        const response = await axios.post(`${API_URL}/orders`, {
          items: cartItems, // Send full array
          totalAmount: cartTotal
        });
        if (response.data.orderId) {
            setOrderId(response.data.orderId);
        }
      } catch (err) { console.error("Order creation failed", err); }
    };
    createOrder();
  }, []); // Run once

  // Timer
  useEffect(() => {
    if (!orderId) return;
    if (timeLeft === 0) { navigate('/error', { state: { message: 'Timeout' } }); return; }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, orderId]);

  // Demo Payment Confirmation
  useEffect(() => {
    if (!orderId) return;
    if (timeLeft === 290) { 
      axios.post(`${API_URL}/orders/${orderId}/confirm-payment`)
        .then(() => {
            navigate('/dispensing', { state: { orderId, itemCount: cartItems.length } });
            // Don't clear cart yet, wait until dispensing starts/finishes or clear here if you want
            // clearCart(); 
        })
        .catch(err => console.error(err));
    }
  }, [timeLeft, orderId]);

  const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  
  // Updated UPI URL for Cart Total
  const upiUrl = `upi://pay?pa=demo@upi&pn=Vend&am=${cartTotal}&tn=${orderId}`;

  return (
    <div className="flex flex-col h-screen">
      <Header currentStep={3} />
      <main className="flex-1 flex flex-col items-center justify-center pt-44 p-10 gap-8">
        <h1 className="text-5xl font-black drop-shadow-xl text-white">Scan to Pay</h1>
        
        <div className="flex gap-12 items-start">
          {/* QR Code Section */}
          <div className="flex flex-col items-center gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-2xl">
              {orderId ? <QRCode value={upiUrl} size={250} /> : <span className="animate-pulse">Loading...</span>}
            </div>
            <span className="text-4xl font-black text-primary drop-shadow-lg">{formatTime(timeLeft)}</span>
          </div>

          {/* Order Summary Section */}
          <div className="w-96 bg-white/95 text-gray-800 p-8 rounded-2xl shadow-2xl flex flex-col gap-4">
            <h3 className="text-2xl font-bold border-b pb-3">Order Summary</h3>
            
            {/* Scrollable List of Items */}
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {cartItems.map(item => (
                    <div key={item.cartId} className="flex justify-between text-lg border-b border-gray-200 pb-1 last:border-0">
                        <span className="truncate w-48 font-medium">{item.name} ({item.scoops})</span>
                        <span className="font-mono text-gray-600">₹{item.price}</span>
                    </div>
                ))}
            </div>

            {/* Total Amount */}
            <div className="flex justify-between text-xl pt-2 border-t-2 border-gray-300">
                <span className="font-bold">Total</span>
                <span className="font-black text-primary text-3xl">₹{cartTotal}</span>
            </div>
            
            <div className="text-center bg-gray-100 p-2 rounded text-xs text-gray-500 font-mono">
                Order ID: {orderId || '...'}
            </div>
          </div>
        </div>

        <button 
            onClick={() => navigate('/cart')} 
            className="mt-4 px-10 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 shadow-lg transition-all active:scale-95"
        >
            Back to Cart
        </button>
      </main>
    </div>
  );
};

export default PaymentScreen;