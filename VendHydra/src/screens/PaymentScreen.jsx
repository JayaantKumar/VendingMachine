import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import Header from '../components/Header.jsx';
import axios from 'axios';

// Fix #3: Ensure this points to your local server
const API_URL = 'http://localhost:3000/api';

const PaymentScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { product } = location.state || {};

  const [orderId, setOrderId] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  // 1. Create a real order when the component loads
  useEffect(() => {
    if (!product) {
      navigate('/');
      return;
    }

    const createOrder = async () => {
      try {
        const response = await axios.post(`${API_URL}/orders`, {
          productId: product.id,
          slot: product.slot,
          price: product.price, // This is the TOTAL price (calculated in ProductSelection)
        });
        
        // The backend (MongoDB) sends 'orderId'
        const realId = response.data.orderId; 
        
        if (realId) {
            setOrderId(realId);
            console.log('Order created successfully:', realId);
        } else {
            console.error('Backend responded, but orderId is missing:', response.data);
        }

      } catch (err) {
        console.error('Failed to create order:', err);
      }
    };

    createOrder();
  }, [product, navigate]);

  // 2. Countdown Timer
  useEffect(() => {
    if (!orderId) return;

    if (timeLeft === 0) {
      navigate('/error', {
        state: { message: 'Payment timed out. Please try again.' },
      });
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, navigate, orderId]);

  // 3. Demo Mode: Auto-confirm payment after 10 seconds
  useEffect(() => {
    if (!orderId) return;

    if (timeLeft === 290) { // 10 seconds passed
      console.log('DEMO: Auto-confirming payment for', orderId);

      const confirmPayment = async () => {
        try {
          // CRITICAL: Wait for this to finish!
          await axios.post(`${API_URL}/orders/${orderId}/confirm-payment`);
          console.log('Payment confirmed. Navigating to dispense...');
          
          // ONLY navigate after the backend says "OK"
          navigate('/dispensing', { state: { product, orderId } });
          
        } catch (err) {
          console.error('Failed to confirm payment', err);
        }
      };

      confirmPayment();
    }
  }, [timeLeft, navigate, product, orderId]);

  if (!product) return null;

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  };

  const upiUrl = `upi://pay?pa=merchant@upi&pn=ProteinVEND&am=${product.price.toFixed(
    2
  )}&cu=INR&tn=Order%20${orderId}`;

  return (
    <div className="flex flex-col h-screen">
      <Header currentStep={2} />
      <main className="flex-1 flex flex-col items-center justify-center p-10 gap-8">
        <h1 className="text-5xl font-black drop-shadow-xl">Scan to Pay</h1>
        <h2 className="text-2xl text-white/90 drop-shadow-lg -mt-4">
          Use any UPI app to complete your payment
        </h2>

        <div className="flex gap-12 items-start">
          {/* Left Side: QR Code */}
          <div className="flex flex-col items-center gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-2xl min-h-[300px] min-w-[300px] flex items-center justify-center">
              {/* Only show QR if we have a valid orderId */}
              {orderId ? (
                <QRCode value={upiUrl} size={300} />
              ) : (
                <div className="flex flex-col items-center animate-pulse">
                  <span className="text-gray-800 text-xl font-bold">Creating order...</span>
                  <span className="text-gray-500 text-sm mt-2">Connecting to backend</span>
                </div>
              )}
            </div>
            <div className="text-center">
              <span className="text-3xl font-bold drop-shadow-lg">
                Time Left:
              </span>
              <span className="text-5xl font-black text-primary drop-shadow-lg ml-3">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {/* Right Side: Order Summary */}
          <div className="w-96 bg-white/95 text-gray-800 p-8 rounded-2xl shadow-2xl flex flex-col gap-4">
            <h3 className="text-3xl font-bold text-black border-b border-gray-300 pb-3">
              Order Summary
            </h3>
            
            <div className="flex justify-between text-xl">
              <span className="font-bold">{product.name}</span>
            </div>

            {/* SCOOP DETAILS ADDED HERE */}
            <div className="flex justify-between text-lg text-gray-600 bg-gray-100 p-2 rounded-lg">
              <span>{product.scoops || 1} x Scoops</span>
              <span className="font-medium">₹{product.price.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-xl text-gray-600">
              <span>Water & Mixing</span>
              <span className="font-medium">Free</span>
            </div>

            <div className="border-t border-gray-300 pt-4 mt-4 flex justify-between items-center">
              <span className="text-3xl font-black text-black">Total</span>
              <span className="text-4xl font-black text-primary">
                ₹{product.price.toFixed(2)}
              </span>
            </div>

            <div className="text-center bg-gray-100 p-2 rounded-lg mt-4">
              <span className="text-sm text-gray-500">Order ID</span>
              <h4 className="text-lg font-medium text-gray-700">
                {orderId || 'Generating...'}
              </h4>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          className="mt-8 px-10 py-4 bg-white/30 text-white text-2xl font-bold rounded-full shadow-lg hover:bg-white/50 transition-colors"
        >
          Cancel Order
        </button>
      </main>
    </div>
  );
};

export default PaymentScreen;