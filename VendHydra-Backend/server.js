require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

// --- Environment Variables ---
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vendhydra';
const MQTT_URL = process.env.MQTT_URL;
const MQTT_CLIENT_ID = process.env.MQTT_CLIENT_ID || 'vending-mock-server';
const MACHINE_ID = process.env.MACHINE_ID || 'vm_001';

// Simulator Settings
const IS_SIMULATOR_ENABLED = process.env.DEMO_PI_SIMULATOR === 'true';
const SIM_DELAY = parseInt(process.env.DEMO_PI_RESPONSE_DELAY_MS, 10) || 2500;

// --- MQTT Topics ---
const TOPIC_COMMAND = `vending/${MACHINE_ID}/command`;
const TOPIC_TELEMETRY = `vending/${MACHINE_ID}/telemetry`;
const TOPIC_ACK = `vending/${MACHINE_ID}/ack`;

// --- MongoDB Setup ---

// 1. Define the Order Schema
const orderSchema = new mongoose.Schema({
  // We use our own 'ord_' ID to be more user-friendly than Mongo's _id
  orderId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  productId: { type: String, required: true },
  slot: { type: String, required: true },
  price: { type: Number, required: true },
  status: {
    type: String,
    required: true,
    enum: ['PENDING', 'PAID', 'DISPENSING', 'COMPLETED', 'FAILED'],
    default: 'PENDING',
  },
  progress: { type: Number, default: 0 },
  currentStep: { type: String, default: 'Waiting for payment' },
  dispatchId: { type: String }, // The ID for the MQTT command
  message: { type: String },     // Final message from the machine
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// 2. Create the Order Model
const Order = mongoose.model('Order', orderSchema);

// 3. Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[DB] Connected to MongoDB');
  } catch (err) {
    console.error('[DB] Connection error:', err.message);
    process.exit(1); // Exit process with failure
  }
};

// --- Express App Setup ---
const app = express();
app.use(cors());
app.use(express.json());

// --- MQTT Client Setup ---
console.log(`Connecting to MQTT broker at ${MQTT_URL}...`);
const mqttClient = mqtt.connect(MQTT_URL, {
  clientId: MQTT_CLIENT_ID,
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
});

mqttClient.on('connect', () => {
  console.log(`[MQTT] Connected to broker with client ID: ${MQTT_CLIENT_ID}`);
  mqttClient.subscribe(TOPIC_TELEMETRY, (err) => {
    if (!err) console.log(`[MQTT] Subscribed to: ${TOPIC_TELEMETRY}`);
  });
  mqttClient.subscribe(TOPIC_ACK, (err) => {
    if (!err) console.log(`[MQTT] Subscribed to: ${TOPIC_ACK}`);
  });
  if (IS_SIMULATOR_ENABLED) {
    mqttClient.subscribe(TOPIC_COMMAND, (err) => {
      if (!err) console.log(`[PI SIM] Simulator is ON. Subscribed to: ${TOPIC_COMMAND}`);
    });
  }
});

mqttClient.on('error', (err) => {
  console.error('[MQTT] Connection error:', err);
});

// MQTT Message Handler (now async to talk to DB)
mqttClient.on('message', async (topic, message) => {
  let payload;
  try {
    payload = JSON.parse(message.toString());
  } catch (err) {
    console.error(`[MQTT] Failed to parse JSON from topic ${topic}:`, err);
    return;
  }

  try {
    if (topic === TOPIC_TELEMETRY) {
      console.log(`[MQTT] Received Telemetry:`, JSON.stringify(payload));
      const { orderId, progress, currentStep } = payload;
      
      // Update the order in the database
      await Order.findOneAndUpdate(
        { orderId: orderId },
        { progress: progress, currentStep: currentStep }
      );
      console.log(`[DB] Updated order ${orderId} progress to ${progress}%`);
    }

    if (topic === TOPIC_ACK) {
      console.log(`[MQTT] Received Ack:`, JSON.stringify(payload));
      const { orderId, status, message } = payload;

      // Update the order in the database
      await Order.findOneAndUpdate(
        { orderId: orderId },
        { 
          status: status === 'completed' ? 'COMPLETED' : 'FAILED',
          progress: 100,
          message: message,
          currentStep: message,
        }
      );
      console.log(`[DB] Completed order ${orderId}`);
    }
  } catch (err) {
    console.error('[DB] Error updating order from MQTT message:', err);
  }

  // --- Handle Messages for Pi Simulator ---
  if (IS_SIMULATOR_ENABLED && topic === TOPIC_COMMAND) {
    console.log(`[PI SIM] Received Command:`, JSON.stringify(payload));
    if (payload.type === 'dispense') {
      simulateDispense(payload);
    }
  }
});

// --- REST API Endpoints (Now Async) ---

/**
 * GET /api/orders
 * (Dev) Lists all orders from MongoDB.
 */
app.get('/api/orders', async (req, res) => {
  try {
    const allOrders = await Order.find().sort({ createdAt: -1 }); // Show newest first
    res.json(allOrders);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching orders', message: err.message });
  }
});

/**
 * POST /api/orders
 * Creates a new pending order in MongoDB.
 * Body: { "productId": "...", "slot": "...", "price": ... }
 */
app.post('/api/orders', async (req, res) => {
  const { productId, slot, price } = req.body;
  if (!productId || !slot || price === undefined) {
    return res.status(400).json({ error: 'Missing productId, slot, or price' });
  }

  try {
    const newOrder = new Order({
      orderId: `ord_${uuidv4().split('-')[0]}`,
      productId,
      slot,
      price,
      // Status defaults to 'PENDING'
    });

    await newOrder.save(); // Save to database
    console.log(`[API] Created new order: ${newOrder.orderId}`);
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(500).json({ error: 'Error creating order', message: err.message });
  }
});

/**
 * GET /api/orders/:orderId/status
 * Checks the status and progress of a specific order from MongoDB.
 */
app.get('/api/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId: orderId });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      orderId: order.orderId,
      status: order.status,
      progress: order.progress,
      currentStep: order.currentStep,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching order status', message: err.message });
  }
});

/**
 * POST /api/orders/:orderId/confirm-payment
 * (Demo) Simulates that a payment has been successfully received.
 */
app.post('/api/orders/:orderId/confirm-payment', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOneAndUpdate(
      { orderId: orderId, status: 'PENDING' }, // Find PENDING order
      { status: 'PAID', currentStep: 'Payment confirmed' },
      { new: true } // Return the updated document
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found or was not in PENDING state' });
    }

    console.log(`[API] Payment confirmed for order: ${orderId}`);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Error confirming payment', message: err.message });
  }
});

/**
 * POST /api/orders/:orderId/dispense
 * Triggers the dispense command via MQTT.
 */
app.post('/api/orders/:orderId/dispense', async (req, res) => {
  try {
    const { orderId } = req.params;
    const dispatchId = `disp_${uuidv4()}`;

    // Find the PAID order and update it to DISPENSING
    const order = await Order.findOneAndUpdate(
      { orderId: orderId, status: 'PAID' }, // Must be PAID
      { 
        status: 'DISPENSING', 
        currentStep: 'Sending command to machine',
        dispatchId: dispatchId
      },
      { new: true }
    );

    if (!order) {
      return res.status(400).json({ error: `Order not found or status was not 'PAID'.` });
    }

    // Create MQTT command payload
    const commandPayload = {
      type: 'dispense',
      dispatchId: order.dispatchId,
      orderId: order.orderId,
      slot: order.slot,
      productId: order.productId,
      addWater: true,
      mixDurationSeconds: 10,
      timestamp: new Date().toISOString(),
    };

    // Publish command to the machine
    mqttClient.publish(TOPIC_COMMAND, JSON.stringify(commandPayload), (err) => {
      if (err) {
        console.error('[MQTT] Failed to publish command:', err);
        // Note: In a real app, you might want to roll back the status update
        return res.status(500).json({ error: 'Failed to send dispense command' });
      }
      
      console.log(`[MQTT] Published command for order: ${orderId}`);
      res.status(202).json({ 
        message: 'Dispense command sent', 
        dispatchId: order.dispatchId 
      });
    });
  } catch (err) {
    res.status(500).json({ error: 'Error triggering dispense', message: err.message });
  }
});

// --- Pi Simulator Logic ---

function simulateDispense(command) {
  const { orderId, dispatchId } = command;

  const steps = [
    { delay: SIM_DELAY * 1, progress: 20, step: 'Dispensing protein powder' },
    { delay: SIM_DELAY * 2, progress: 40, step: 'Adding water' },
    { delay: SIM_DELAY * 3, progress: 60, step: 'Mixing your shake' },
    { delay: SIM_DELAY * 4, progress: 80, step: 'Almost ready' },
  ];

  // 1. Simulate Telemetry (Progress)
  steps.forEach((step) => {
    setTimeout(() => {
      const telemetryPayload = {
        dispatchId,
        orderId,
        progress: step.progress,
        status: 'in_progress',
        currentStep: step.step,
        timestamp: new Date().toISOString(),
      };
      mqttClient.publish(TOPIC_TELEMETRY, JSON.stringify(telemetryPayload));
      console.log(`[PI SIM] Sent Telemetry: ${step.progress}% for ${orderId}`);
    }, step.delay);
  });

  // 2. Simulate Ack (Completion)
  setTimeout(() => {
    const ackPayload = {
      dispatchId,
      orderId,
      status: 'completed',
      message: 'Done - pickup ready',
      timestamp: new Date().toISOString(),
    };
    mqttClient.publish(TOPIC_ACK, JSON.stringify(ackPayload));
    console.log(`[PI SIM] Sent Ack: COMPLETED for ${orderId}`);
  }, SIM_DELAY * 5);
}

// --- Start Server ---
const startServer = async () => {
  await connectDB(); // Connect to database first
  
  app.listen(PORT, () => { // Then start the web server
    console.log(`[API] Mock backend server running on http://localhost:${PORT}`);
    if (IS_SIMULATOR_ENABLED) {
      console.log(`[INFO] Pi Simulator is ENABLED.`);
    } else {
      console.log(`[INFO] Pi Simulator is DISABLED. Waiting for real hardware.`);
    }
  });
};

startServer();