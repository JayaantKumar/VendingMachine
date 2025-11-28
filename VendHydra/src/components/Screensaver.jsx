import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:3000/api';

const Screensaver = ({ isActive }) => {
  const [ads, setAds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch Ads
  useEffect(() => {
    const fetchAds = async () => {
      try {
        const res = await axios.get(`${API_URL}/promotions?machineId=vm_001`);
        setAds(res.data);
      } catch (err) {
        console.error("Failed to load screensaver ads:", err);
      }
    };
    fetchAds();
  }, []);

  // Cycle Logic
  useEffect(() => {
    if (!isActive || ads.length === 0) return;

    const currentAd = ads[currentIndex];
    const duration = (currentAd.duration || 10) * 1000;

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [isActive, currentIndex, ads]);

  if (!isActive) return null;

  // Fallback if no ads
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
      {currentAd.mediaType === 'video' ? (
        // VIDEO PLAYER
        <video 
            src={currentAd.mediaUrl}
            autoPlay 
            muted 
            loop={false} 
            className="w-full h-full object-cover animate-fade-in"
        />
      ) : (
        // IMAGE DISPLAY
        <img 
            src={currentAd.mediaUrl} 
            alt="Advertisement" 
            className="w-full h-full object-cover animate-fade-in" 
        />
      )}

      {/* Overlay Text */}
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