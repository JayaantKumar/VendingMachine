import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from '../components/Header.jsx';

const AdminScreen = () => {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0 });

  // This would point to your CLOUD backend in production
  const API_URL = 'http://localhost:3000/api'; 

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

  const getStatusColor = (status) => {
    switch(status) {
      case 'COMPLETED': return 'text-green-500';
      case 'PENDING': return 'text-yellow-500';
      case 'FAILED': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
      <div className="p-6 bg-gray-800 shadow-lg flex justify-between items-center">
        <h1 className="text-3xl font-bold">VendHydra Admin</h1>
        <div className="flex gap-6 text-xl">
            <div>Revenue: <span className="text-primary font-bold">₹{stats.totalRevenue}</span></div>
            <div>Orders: <span className="font-bold">{stats.totalOrders}</span></div>
        </div>
      </div>

      <main className="flex-1 p-8 overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
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
              <tr key={order.orderId} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="p-4 font-mono text-sm">{order.orderId}</td>
                <td className="p-4">{order.productId}</td>
                <td className="p-4">{order.slot}</td>
                <td className="p-4">₹{order.price}</td>
                <td className={`p-4 font-bold ${getStatusColor(order.status)}`}>{order.status}</td>
                <td className="p-4 text-gray-400 text-sm">
                  {new Date(order.createdAt).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
};

export default AdminScreen;