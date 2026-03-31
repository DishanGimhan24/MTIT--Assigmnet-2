// require('dns').setServers(['1.1.1.1', '8.8.8.8']);

const express = require('express');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { v4: uuidv4 } = require('uuid');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = Number(process.env.PAYMENT_SERVICE_PORT) || 3004;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'movie_explorer';
const COLLECTION = 'payments';

let db;
let dbPromise;

const formatDoc = (doc) => {
  const { _id, ...rest } = doc;
  return { ...rest, id: rest.id || _id.toString() };
};

const buildIdQuery = (id) => {
  if (ObjectId.isValid(id)) {
    return { $or: [{ id }, { _id: new ObjectId(id) }] };
  }
  return { id };
};

const getCollection = async () => {
  if (!db) {
    await initDb();
  }
  return db.collection(COLLECTION);
};

const initDb = async () => {
  if (db) {
    return db;
  }

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is missing in environment variables');
  }

  if (!dbPromise) {
    const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    dbPromise = client.connect()
      .then(() => {
        db = client.db(DB_NAME);
        console.log(`Payment Service connected to MongoDB database: ${DB_NAME}`);
        return db;
      })
      .catch((error) => {
        dbPromise = null;
        throw error;
      });
  }

  return dbPromise;
};

// Middleware
app.use(cors());
app.use(express.json());

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Payment Service API',
      version: '1.0.0',
      description: 'Microservice for managing payments in the E-Commerce platform',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./index.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique payment identifier
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         orderId:
 *           type: string
 *           description: Associated order identifier
 *           example: "ORD-001"
 *         customerId:
 *           type: string
 *           description: Customer identifier
 *           example: "CUST-001"
 *         amount:
 *           type: number
 *           format: float
 *           description: Payment amount
 *           example: 149.99
 *         method:
 *           type: string
 *           enum: [credit_card, debit_card, paypal, bank_transfer]
 *           description: Payment method
 *           example: "credit_card"
 *         status:
 *           type: string
 *           enum: [pending, completed, failed, refunded]
 *           description: Payment status
 *           example: "pending"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Payment creation timestamp
 *       required:
 *         - id
 *         - orderId
 *         - customerId
 *         - amount
 *         - method
 *         - status
 *         - createdAt
 *     PaymentInput:
 *       type: object
 *       properties:
 *         orderId:
 *           type: string
 *           description: Associated order identifier
 *           example: "ORD-003"
 *         customerId:
 *           type: string
 *           description: Customer identifier
 *           example: "CUST-003"
 *         amount:
 *           type: number
 *           format: float
 *           description: Payment amount
 *           example: 59.99
 *         method:
 *           type: string
 *           enum: [credit_card, debit_card, paypal, bank_transfer]
 *           description: Payment method
 *           example: "paypal"
 *       required:
 *         - orderId
 *         - customerId
 *         - amount
 *         - method
 *     PaymentStatusUpdate:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [pending, completed, failed, refunded]
 *           description: New payment status
 *           example: "completed"
 *       required:
 *         - status
 */

// Data is persisted in MongoDB collection: payments

// Valid enum values
const VALID_METHODS = ['credit_card', 'debit_card', 'paypal', 'bank_transfer'];
const VALID_STATUSES = ['pending', 'completed', 'failed', 'refunded'];

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: Retrieve all payments
 *     description: Returns a list of all payments in the system.
 *     tags:
 *       - Payments
 *     responses:
 *       200:
 *         description: A list of payments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Payment'
 */
app.get('/api/payments', async (req, res) => {
  try {
    const payments = await (await getCollection()).find({}).sort({ createdAt: -1 }).toArray();
    res.json(payments.map(formatDoc));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments', details: error.message });
  }
});

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     summary: Retrieve a single payment by ID
 *     description: Returns a single payment object matching the provided ID.
 *     tags:
 *       - Payments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The payment ID
 *     responses:
 *       200:
 *         description: A single payment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Payment not found"
 */
app.get('/api/payments/:id', async (req, res) => {
  try {
    const payment = await (await getCollection()).findOne(buildIdQuery(req.params.id));
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(formatDoc(payment));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payment', details: error.message });
  }
});

/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Create and process a new payment
 *     description: Creates a new payment record with the provided details. The payment is initially set to "pending" status.
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentInput'
 *     responses:
 *       201:
 *         description: Payment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Missing required fields: orderId, customerId, amount, method"
 */
app.post('/api/payments', async (req, res) => {
  const { orderId, customerId, amount, method } = req.body;

  if (!orderId || !customerId || amount === undefined || !method) {
    return res.status(400).json({
      error: 'Missing required fields: orderId, customerId, amount, method',
    });
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  if (!VALID_METHODS.includes(method)) {
    return res.status(400).json({
      error: `Invalid payment method. Must be one of: ${VALID_METHODS.join(', ')}`,
    });
  }

  const newPayment = {
    id: uuidv4(),
    orderId,
    customerId,
    amount,
    method,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  try {
    await (await getCollection()).insertOne(newPayment);
    res.status(201).json(newPayment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create payment', details: error.message });
  }
});

/**
 * @swagger
 * /api/payments/{id}:
 *   put:
 *     summary: Update payment status
 *     description: Updates the status of an existing payment.
 *     tags:
 *       - Payments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The payment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentStatusUpdate'
 *     responses:
 *       200:
 *         description: Payment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Invalid status value
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid status. Must be one of: pending, completed, failed, refunded"
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Payment not found"
 */
app.put('/api/payments/:id', async (req, res) => {
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status field is required' });
  }

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
    });
  }

  try {
    const result = await (await getCollection()).findOneAndUpdate(
      buildIdQuery(req.params.id),
      { $set: { status } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(formatDoc(result));
  } catch (error) {
    res.status(500).json({ error: 'Failed to update payment', details: error.message });
  }
});

/**
 * @swagger
 * /api/payments/{id}:
 *   delete:
 *     summary: Delete a payment
 *     description: Removes a payment record from the system.
 *     tags:
 *       - Payments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The payment ID
 *     responses:
 *       200:
 *         description: Payment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Payment deleted successfully"
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Payment not found"
 */
app.delete('/api/payments/:id', async (req, res) => {
  try {
    const result = await (await getCollection()).deleteOne(buildIdQuery(req.params.id));
    if (!result.deletedCount) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete payment', details: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Payment Service running on port ${PORT}`);
  initDb().catch((error) => {
    console.error(`Payment Service MongoDB connection failed: ${error.message}`);
  });
});
