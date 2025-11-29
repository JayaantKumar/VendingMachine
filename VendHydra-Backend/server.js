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

const IS_SIMULATOR_ENABLED = true; 

// --- MQTT Topics ---
const TOPIC_COMMAND = `vending/${MACHINE_ID}/command`;
const TOPIC_TELEMETRY = `vending/${MACHINE_ID}/telemetry`;
const TOPIC_ACK = `vending/${MACHINE_ID}/ack`;

// --- MongoDB Schemas ---

// 1. Order Item Schema (Sub-document for Cart)
const orderItemSchema = new mongoose.Schema({
  productId: String,
  name: String,
  slot: String,
  price: Number,
  scoops: Number,
  image: String
});

// 2. Order Schema (Updated to hold an array of items)
const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  razorpayOrderId: String,
  items: [orderItemSchema], // Array of items
  totalAmount: Number,
  status: { type: String, default: 'PENDING' },
  progress: { type: Number, default: 0 },
  currentStep: { type: String, default: 'Waiting for payment' },
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

// 3. Ad Schema (With mediaType for Video support)
const adSchema = new mongoose.Schema({
  name: String,
  mediaUrl: { type: String, required: true },
  mediaType: { type: String, default: 'image' }, // 'image' or 'video'
  duration: { type: Number, default: 10 },
  sequence: { type: Number, default: 1 },
  machineId: { type: String, default: 'ALL' },
  isActive: { type: Boolean, default: true }
});
const Ad = mongoose.model('Ad', adSchema);

// --- Connect DB ---
mongoose.connect(MONGODB_URI)
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
  mqttClient.subscribe(TOPIC_TELEMETRY);
  mqttClient.subscribe(TOPIC_ACK);
});

mqttClient.on('message', async (topic, message) => {
  const payload = JSON.parse(message.toString());

  if (topic === TOPIC_TELEMETRY) {
    await Order.findOneAndUpdate({ orderId: payload.orderId }, { 
      progress: payload.progress, 
      currentStep: payload.currentStep 
    });
  }

  if (topic === TOPIC_ACK) {
    await Order.findOneAndUpdate({ orderId: payload.orderId }, { 
      status: 'COMPLETED', 
      progress: 100, 
      currentStep: 'Enjoy!' 
    });
  }
});

// --- API Routes ---

// 1. Create Order (Cart Support)
app.post('/api/orders', async (req, res) => {
  const { items, totalAmount } = req.body;
  const localOrderId = `ord_${uuidv4().split('-')[0]}`;

  try {
    const newOrder = new Order({
      orderId: localOrderId,
      items: items,
      totalAmount: totalAmount,
      status: 'PENDING'
    });
    await newOrder.save();

    console.log(`[API] Created Order ${localOrderId} with ${items.length} items.`);
    
    res.json({ 
      orderId: localOrderId, 
      razorpayOrderId: "demo_rzp_" + Date.now(),
      amount: totalAmount 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// 2. Confirm Payment
app.post('/api/orders/:orderId/confirm-payment', async (req, res) => {
  const order = await Order.findOneAndUpdate(
    { orderId: req.params.orderId },
    { status: 'PAID', currentStep: 'Payment Verified' },
    { new: true }
  );
  console.log(`[API] Payment Confirmed: ${req.params.orderId}`);
  res.json(order);
});

// 3. Dispense (Handles Cart Logic for Simulator)
app.post('/api/orders/:orderId/dispense', async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId });
  if (!order) return res.status(404).json({ error: "Not found" });
  
  order.status = 'DISPENSING';
  await order.save();

  // Send simplified command to Pi
  const payload = {
    type: 'dispense',
    orderId: order.orderId,
    itemCount: order.items.length
  };

  mqttClient.publish(TOPIC_COMMAND, JSON.stringify(payload));
  
  // Start Simulator
  if (IS_SIMULATOR_ENABLED) {
    simulateDispense(order.orderId, order.items.length);
  }
  
  res.json({ success: true });
});

// 4. Status Check
app.get('/api/orders/:orderId/status', async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId });
  res.json(order || { status: 'UNKNOWN' });
});

// 5. Admin: Get Orders
app.get('/api/orders', async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
});

// 6. Promotions (Ad Management)
app.post('/api/promotions', async (req, res) => {
  const newAd = new Ad(req.body);
  await newAd.save();
  res.json({ success: true });
});

app.get('/api/promotions', async (req, res) => {
  const ads = await Ad.find();
  res.json(ads);
});

// --- Helper: Simulator (Multi-Item Aware) ---
function simulateDispense(orderId, itemCount) {
  // It takes longer to dispense multiple items
  // We simulate 10 steps total, but stretch the time based on item count
  const totalSteps = 10; 
  const durationPerStep = (2000 * itemCount) / totalSteps; 

  let currentStep = 0;
  
  const interval = setInterval(() => {
    currentStep++;
    const progress = Math.round((currentStep / totalSteps) * 100);
    
    // Calculate which item is currently being made for the UI text
    const currentItemIndex = Math.floor((progress / 100) * itemCount);
    const itemNum = Math.min(currentItemIndex + 1, itemCount);

    if (progress >= 100) {
      clearInterval(interval);
      mqttClient.publish(TOPIC_ACK, JSON.stringify({ orderId, status: 'completed' }));
    } else {
      mqttClient.publish(TOPIC_TELEMETRY, JSON.stringify({ 
        orderId, 
        progress: progress, 
        currentStep: `Dispensing Drink ${itemNum} of ${itemCount}...` 
      }));
    }
  }, durationPerStep);
}

// --- Start ---
app.listen(PORT, () => {
  console.log(`[API] Backend running on http://localhost:${PORT}`);
});