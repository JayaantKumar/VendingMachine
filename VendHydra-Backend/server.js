// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

// --- Configuration ---
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vendhydra';
const MQTT_URL = process.env.MQTT_URL || 'mqtt://broker.hivemq.com:1883';
const MACHINE_ID = process.env.MACHINE_ID || 'vm_001';

// --- Simulator Settings ---
const IS_SIMULATOR_ENABLED = true; // true for demo

// --- MQTT Topics ---
const TOPIC_COMMAND = `vending/${MACHINE_ID}/command`;
const TOPIC_TELEMETRY = `vending/${MACHINE_ID}/telemetry`;
const TOPIC_ACK = `vending/${MACHINE_ID}/ack`;

// --- MongoDB Schemas & Models ---
const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  productId: String,
  slot: String,
  price: Number,
  status: { 
    type: String, 
    enum: ['PENDING', 'PAID', 'DISPENSING', 'COMPLETED', 'FAILED'], 
    default: 'PENDING' 
  },
  progress: { type: Number, default: 0 },
  currentStep: { type: String, default: 'Waiting for payment' },
}, { timestamps: true });

const AdSchema = new mongoose.Schema({
  name: String,
  mediaUrl: { type: String, required: true }, // e.g., Cloudinary URL
  mediaType: { type: String, default: 'video' }, // NEW FIELD: 'image' or 'video'
  duration: { type: Number, default: 5 }, // seconds
  sequence: { type: Number, default: 1 },  // order of appearance
  machineId: { type: String, default: 'ALL' }, // 'ALL' or specific machine id
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
const Ad = mongoose.model('Ad', AdSchema);

// --- Connect to MongoDB ---
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('[DB] Connected to MongoDB'))
  .catch(err => console.error('[DB] Connection Error:', err));

// --- Express Setup ---
const app = express();
app.use(cors());
app.use(express.json());

// --- MQTT Setup ---
const mqttClient = mqtt.connect(MQTT_URL);

mqttClient.on('connect', () => {
  console.log(`[MQTT] Connected to ${MQTT_URL}`);
  // Subscribe to the topics the backend needs to listen to
  mqttClient.subscribe([TOPIC_TELEMETRY, TOPIC_ACK, TOPIC_COMMAND], (err) => {
    if (err) console.error('[MQTT] Subscribe error:', err);
  });
});

mqttClient.on('error', (err) => {
  console.error('[MQTT] Error:', err);
});

mqttClient.on('message', async (topic, messageBuffer) => {
  let payload;
  try {
    payload = JSON.parse(messageBuffer.toString());
  } catch (err) {
    console.warn('[MQTT] Received non-JSON message', messageBuffer.toString());
    return;
  }

  try {
    // Telemetry updates (progress updates)
    if (topic === TOPIC_TELEMETRY && payload.orderId) {
      await Order.findOneAndUpdate(
        { orderId: payload.orderId },
        { progress: payload.progress ?? undefined, currentStep: payload.currentStep ?? undefined },
        { new: true }
      );
      console.log(`[MQTT] Telemetry updated for ${payload.orderId}`, payload);
    }

    // Acknowledgement (complete)
    if (topic === TOPIC_ACK && payload.orderId) {
      await Order.findOneAndUpdate(
        { orderId: payload.orderId },
        { status: 'COMPLETED', progress: 100, currentStep: 'Enjoy!' },
        { new: true }
      );
      console.log(`[MQTT] Acknowledged completion for ${payload.orderId}`);
    }

    // Simulator: handle dispense command
    if (topic === TOPIC_COMMAND && payload.type === 'dispense' && IS_SIMULATOR_ENABLED) {
      console.log(`[SIM] Dispensing order ${payload.orderId} (slot: ${payload.slot})`);
      simulateDispense(payload.orderId);
    }
  } catch (err) {
    console.error('[MQTT] Handler Error:', err);
  }
});

// ------------------------------
// --- REST API Endpoints ---
// ------------------------------

// Orders
app.post('/api/orders', async (req, res) => {
  try {
    const { productId, slot, price } = req.body;
    const localOrderId = `ord_${uuidv4().split('-')[0]}`;

    const newOrder = new Order({
      orderId: localOrderId,
      productId,
      slot,
      price,
      status: 'PENDING'
    });
    await newOrder.save();

    console.log(`[API] Created Order: ${localOrderId}`);

    // Return fake Razorpay-like response so frontend can proceed in demo
    return res.json({
      orderId: localOrderId,
      razorpayOrderId: `demo_rzp_${Date.now()}`,
      amount: price
    });
  } catch (err) {
    console.error('[API] Create Order Error:', err);
    return res.status(500).json({ error: 'Failed to create order' });
  }
});

app.post('/api/orders/:orderId/confirm-payment', async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate(
      { orderId: req.params.orderId },
      { status: 'PAID', currentStep: 'Payment Verified' },
      { new: true }
    );

    if (!order) return res.status(404).json({ error: 'Order not found' });

    console.log(`[API] Payment Confirmed: ${req.params.orderId}`);
    return res.json(order);
  } catch (err) {
    console.error('[API] Confirm Payment Error:', err);
    return res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

app.post('/api/orders/:orderId/dispense', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.status = 'DISPENSING';
    order.currentStep = 'Started Dispensing';
    await order.save();

    const payload = { type: 'dispense', orderId: order.orderId, slot: order.slot };
    mqttClient.publish(TOPIC_COMMAND, JSON.stringify(payload), (err) => {
      if (err) console.error('[MQTT] Publish error:', err);
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('[API] Dispense Error:', err);
    return res.status(500).json({ error: 'Failed to start dispensing' });
  }
});

app.get('/api/orders/:orderId/status', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    return res.json(order || { status: 'UNKNOWN' });
  } catch (err) {
    console.error('[API] Status Check Error:', err);
    return res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// Admin: Orders listing
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    return res.json(orders);
  } catch (err) {
    console.error('[API] Get Orders Error:', err);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Ads: Admin and machine endpoints
// Add/Manage Ads (Admin)
app.post('/api/admin/ads', async (req, res) => {
  try {
    const newAd = new Ad(req.body);
    await newAd.save();
    return res.json({ success: true, ad: newAd });
  } catch (err) {
    console.error('[API] Add Ad Error:', err);
    return res.status(500).json({ error: 'Failed to add ad' });
  }
});

// Get ads for admin (all ads)
app.get('/api/admin/ads', async (req, res) => {
  try {
    const ads = await Ad.find().sort({ sequence: 1, createdAt: -1 });
    return res.json(ads);
  } catch (err) {
    console.error('[API] Admin Get Ads Error:', err);
    return res.status(500).json({ error: 'Failed to fetch ads' });
  }
});

// Get ads for machines (filters active + machineId or ALL)
app.get('/api/ads', async (req, res) => {
  try {
    const { machineId } = req.query;
    const filter = {
      isActive: true,
      $or: [{ machineId: 'ALL' }]
    };
    if (machineId) filter.$or.push({ machineId });

    const ads = await Ad.find(filter).sort({ sequence: 1 });
    return res.json(ads);
  } catch (err) {
    console.error('[API] Get Ads Error:', err);
    return res.status(500).json({ error: 'Failed to fetch ads' });
  }
});

// ------------------------------
// --- Helper: Simulator ---
// ------------------------------
function simulateDispense(orderId) {
  // Simulated steps and delays (ms)
  const steps = [
    { progress: 20, step: 'Dispensing Powder', delay: 2000 },
    { progress: 50, step: 'Adding Water', delay: 4000 },
    { progress: 80, step: 'Mixing Shake', delay: 7000 },
    { progress: 100, step: 'Ready!', delay: 9000 }
  ];

  let elapsed = 0;
  steps.forEach((s) => {
    elapsed += s.delay;
    setTimeout(async () => {
      try {
        if (s.progress === 100) {
          // Publish ack
          mqttClient.publish(TOPIC_ACK, JSON.stringify({ orderId, status: 'completed' }));
          // Update DB too
          await Order.findOneAndUpdate({ orderId }, {
            status: 'COMPLETED',
            progress: 100,
            currentStep: 'Enjoy!'
          });
          console.log(`[SIM] Order ${orderId} completed`);
        } else {
          mqttClient.publish(TOPIC_TELEMETRY, JSON.stringify({
            orderId,
            progress: s.progress,
            currentStep: s.step
          }));
          // Update DB progress
          await Order.findOneAndUpdate({ orderId }, {
            progress: s.progress,
            currentStep: s.step
          });
          console.log(`[SIM] Order ${orderId} telemetry ${s.progress}% - ${s.step}`);
        }
      } catch (err) {
        console.error('[SIM] Error during simulateDispense:', err);
      }
    }, elapsed);
  });
}

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`[API] Demo Backend running on http://localhost:${PORT}`);
});
