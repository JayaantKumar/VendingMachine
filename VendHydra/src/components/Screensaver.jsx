import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Safe access to API_URL that works in all environments
const API_URL = (import.meta && import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:3000/api';

const Screensaver = ({ isActive }) => {
  const [ads, setAds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 1. Fetch Ads on Mount
  useEffect(() => {
    const fetchAds = async () => {
      try {
        // In production, you might pass a specific machineId like 'vm_001'
        const res = await axios.get(`${API_URL}/ads?machineId=ALL`);
        if (res.data && res.data.length > 0) {
          setAds(res.data);
        }
      } catch (err) {
        console.error("Failed to load ads", err);
      }
    };
    fetchAds();
  }, []);

  // 2. Cycle through Ads
  useEffect(() => {
    if (!isActive || ads.length === 0) return;

    const currentAd = ads[currentIndex];
    const duration = (currentAd.duration || 5) * 1000; // Convert to ms

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length); // Loop back to 0
    }, duration);

    return () => clearTimeout(timer);
  }, [isActive, currentIndex, ads]);

  if (!isActive) return null;

  // Fallback if no ads loaded yet
  if (ads.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <h1 className="text-6xl font-black text-white animate-pulse">
          Touch to Start
        </h1>
      </div>
    );
  }

  const currentAd = ads[currentIndex];

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden">
      {/* The Ad Image */}
      <img 
        src={currentAd.mediaUrl} 
        alt="Advertisement" 
        className="w-full h-full object-cover animate-fade-in" 
      />
      
      {/* "Touch to Start" Overlay */}
      <div className="absolute bottom-20 w-full text-center">
        <div className="inline-block bg-black/50 backdrop-blur-md px-8 py-4 rounded-full border border-white/20">
          <h2 className="text-4xl text-white font-bold animate-bounce">
            Tap Screen to Order
          </h2>
        </div>
      </div>
    </div>
  );
};

export default Screensaver;