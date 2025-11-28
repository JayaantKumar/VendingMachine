import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Safe access to API_URL
const API_URL = (import.meta && import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:3000/api';

const AdminScreen = () => {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0 });
  
  // State for the New Ad Form
  const [newAd, setNewAd] = useState({ mediaUrl: '', duration: 5, machineId: 'ALL' });

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000); // Auto-refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_URL}/orders`);
      setOrders(res.data);
      calculateStats(res.data);
    } catch (err) {
      console.error("Admin fetch error", err);
    }
  };

  const calculateStats = (data) => {
    const revenue = data.reduce((acc, order) => 
      order.status === 'COMPLETED' || order.status === 'PAID' ? acc + order.price : acc, 0);
    setStats({ totalRevenue: revenue, totalOrders: data.length });
  };

  const handleAddAd = async () => {
    if (!newAd.mediaUrl) return alert("Please enter an Image URL");
    
    try {
        await axios.post(`${API_URL}/admin/ads`, newAd);
        alert('Ad Added Successfully!');
        setNewAd({ mediaUrl: '', duration: 5, machineId: 'ALL' }); // Reset form
    } catch (err) {
        console.error("Failed to add ad", err);
        alert("Failed to add ad. Check console.");
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'COMPLETED': return 'text-green-500';
      case 'PAID': return 'text-blue-500';
      case 'PENDING': return 'text-yellow-500';
      case 'FAILED': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
      {/* Top Bar */}
      <div className="p-6 bg-gray-800 shadow-lg flex justify-between items-center">
        <h1 className="text-3xl font-bold">VendHydra Admin</h1>
        <div className="flex gap-6 text-xl">
            <div>Revenue: <span className="text-primary font-bold">₹{stats.totalRevenue}</span></div>
            <div>Orders: <span className="font-bold">{stats.totalOrders}</span></div>
        </div>
      </div>

      <main className="flex-1 p-8 overflow-y-auto">
        
        {/* --- Screensaver Ad Management Section --- */}
        <div className="bg-gray-800 p-6 rounded-xl mb-8 border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-primary">Upload Screensaver Ad</h2>
            <div className="flex gap-4 flex-wrap md:flex-nowrap">
                <input 
                    className="p-3 rounded bg-gray-700 text-white flex-1 border border-gray-600 focus:border-primary outline-none"
                    placeholder="Paste Cloudinary Image URL here..."
                    value={newAd.mediaUrl}
                    onChange={e => setNewAd({...newAd, mediaUrl: e.target.value})}
                />
                <input 
                    className="p-3 rounded bg-gray-700 text-white w-24 border border-gray-600 focus:border-primary outline-none"
                    type="number"
                    placeholder="Secs"
                    value={newAd.duration}
                    onChange={e => setNewAd({...newAd, duration: parseInt(e.target.value)})}
                />
                <select 
                    className="p-3 rounded bg-gray-700 text-white border border-gray-600 outline-none"
                    value={newAd.machineId}
                    onChange={e => setNewAd({...newAd, machineId: e.target.value})}
                >
                    <option value="ALL">All Machines</option>
                    <option value="vm_001">Machine 001</option>
                    <option value="vm_002">Machine 002</option>
                </select>
                <button 
                    onClick={handleAddAd} 
                    className="bg-primary hover:bg-green-600 text-white px-8 py-2 rounded font-bold transition-colors"
                >
                    Add Ad
                </button>
            </div>
            <p className="text-gray-400 text-sm mt-2">
                * Paste a URL from Cloudinary or Unsplash here.
            </p>
        </div>

        {/* Orders Table */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <table className="w-full text-left border-collapse">
            <thead>
                <tr className="border-b border-gray-700 text-gray-400 bg-gray-900/50">
                <th className="p-4">Order ID</th>
                <th className="p-4">Product</th>
                <th className="p-4">Slot</th>
                <th className="p-4">Price</th>
                <th className="p-4">Status</th>
                <th className="p-4">Time</th>
                </tr>
            </thead>
            <tbody>
                {orders.map((order) => (
                <tr key={order.orderId} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                    <td className="p-4 font-mono text-sm text-gray-300">{order.orderId}</td>
                    <td className="p-4 font-medium">{order.productId}</td>
                    <td className="p-4">{order.slot}</td>
                    <td className="p-4 text-primary font-bold">₹{order.price}</td>
                    <td className={`p-4 font-bold ${getStatusColor(order.status)}`}>{order.status}</td>
                    <td className="p-4 text-gray-400 text-sm">
                    {new Date(order.createdAt).toLocaleTimeString()}
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </main>
    </div>
  );
};

export default AdminScreen;