import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const DispensingScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { product, orderId } = location.state || {};

  const [progress, setProgress] = useState(0);
  const [stepText, setStepText] = useState('Initializing...');
  
  // FIX: Use a ref to track if we already sent the command
  const hasDispensed = useRef(false);

  useEffect(() => {
    if (!product || !orderId) {
      navigate('/');
    }
  }, [product, orderId, navigate]);

  // 1. Tell the backend to start dispensing (triggers MQTT)
  useEffect(() => {
    if (!orderId) return;
    
    // FIX: If we already dispensed, STOP here. Don't do it twice.
    if (hasDispensed.current) return;
    hasDispensed.current = true;

    const triggerDispense = async () => {
      try {
        await axios.post(`${API_URL}/orders/${orderId}/dispense`);
        console.log('Dispense command sent for order:', orderId);
        setStepText('Sending command to machine...');
      } catch (err) {
        console.error('Failed to trigger dispense', err);
        
        // Optional: If the error is "Order not PAID" (because it's already dispensing), 
        // we can ignore it. Otherwise, show error.
        if (err.response && err.response.status === 400) {
            console.warn("Dispense might have already started, ignoring 400 error.");
        } else {
            navigate('/error', { state: { message: 'Hardware command failed.' } });
        }
      }
    };

    triggerDispense();
  }, [orderId, navigate]);

  // 2. Poll the backend for status updates
  useEffect(() => {
    if (!orderId) return;

    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/orders/${orderId}/status`);
        const { status, progress, currentStep } = response.data;

        setProgress(progress);
        setStepText(currentStep);

        if (status === 'COMPLETED') {
          clearInterval(interval);
          console.log('Order completed!');
          setTimeout(() => {
            navigate('/thank-you', { state: { product } });
          }, 1000);
        }
        
        if (status === 'FAILED') {
           clearInterval(interval);
           navigate('/error', { state: { message: 'Dispensing failed.' } });
        }

      } catch (err) {
        console.error('Failed to get order status', err);
      }
    }, 2000);

    return () => clearInterval(interval);

  }, [orderId, navigate, product]);

  if (!product) return null;

  return (
    <div className="flex flex-col h-screen">
      <Header currentStep={3} />
      <main className="flex-1 flex flex-col items-center justify-center p-10 gap-10">
        <h1 className="text-5xl font-black drop-shadow-xl">
          Preparing Your Shake
        </h1>
        <h2 className="text-3xl text-primary font-bold drop-shadow-lg -mt-4">
          {product.name}
        </h2>

        {/* Spinner */}
        <div className="spinner"></div>

        <h3 className="text-3xl text-white font-bold drop-shadow-lg h-10">
          {stepText}
        </h3>

        <div className="w-full max-w-2xl bg-white/20 rounded-full h-8 shadow-inner overflow-hidden">
          <div
            className="bg-primary h-8 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <span className="text-2xl font-bold drop-shadow-md -mt-4">
          {progress}%
        </span>

        <div className="mt-8 bg-white/95 text-gray-800 p-8 rounded-2xl shadow-2xl">
          <h4 className="text-3xl font-bold text-black text-center">
            Please collect your shake from the dispenser below
          </h4>
        </div>
      </main>
    </div>
  );
};

export default DispensingScreen;