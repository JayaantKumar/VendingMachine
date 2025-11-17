import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import axios from 'axios'; // Import axios

// Define the backend API URL
const API_URL = 'http://localhost:3000/api';

const DispensingScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { product, orderId } = location.state || {};

  const [progress, setProgress] = useState(0);
  const [stepText, setStepText] = useState('Initializing...');

  // Redirect if no orderId
  useEffect(() => {
    if (!product || !orderId) {
      navigate('/');
    }
  }, [product, orderId, navigate]);

  // 1. Tell the backend to start dispensing (triggers MQTT)
  useEffect(() => {
    if (!orderId) return;

    const triggerDispense = async () => {
      try {
        // This is the call that sends the MQTT command
        await axios.post(`${API_URL}/orders/${orderId}/dispense`);
        console.log('Dispense command sent for order:', orderId);
        setStepText('Sending command to machine...');
      } catch (err) {
        console.error('Failed to trigger dispense', err);
        navigate('/error', { state: { message: 'Hardware command failed.' } });
      }
    };

    triggerDispense();
  }, [orderId, navigate]);

  // 2. Poll the backend for status updates
  useEffect(() => {
    if (!orderId) return;

    // Start polling every 2 seconds
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/orders/${orderId}/status`);
        const { status, progress, currentStep } = response.data;

        // Update the UI from the backend's data
        setProgress(progress);
        setStepText(currentStep);

        // Check if the order is complete
        if (status === 'COMPLETED') {
          clearInterval(interval); // Stop polling
          console.log('Order completed!');
          
          // Wait 1 second on the final step, then navigate
          setTimeout(() => {
            navigate('/thank-you', { state: { product } });
          }, 1000);
        }
        
        // Handle a failed state from the backend
        if (status === 'FAILED') {
           clearInterval(interval);
           navigate('/error', { state: { message: 'Dispensing failed.' } });
        }

      } catch (err) {
        console.error('Failed to get order status', err);
        // Don't navigate to error, just log. The poll will try again.
      }
    }, 2000); // Poll every 2 seconds

    // Cleanup: stop polling when the component unmounts
    return () => clearInterval(interval);

  }, [orderId, navigate, product]);


  if (!product) {
    return null; // Render nothing while redirecting
  }

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

        {/* Progress Bar (now driven by real data) */}
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