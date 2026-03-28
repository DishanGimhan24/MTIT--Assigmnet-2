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
const PORT = Number(process.env.ORDER_SERVICE_PORT) || 3003;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'movie_explorer';
const COLLECTION = 'orders';

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
        console.log(`Order Service connected to MongoDB database: ${DB_NAME}`);
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
      title: 'Order Service API',
      version: '1.0.0',
      description: 'Microservice for managing orders in the E-Commerce platform',
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
 *     Product:
 *       type: object
 *       properties:
 *         productId:
 *           type: string
 *           description: The product identifier
 *           example: "prod-001"
 *         quantity:
 *           type: integer
 *           description: Quantity ordered
 *           example: 2
 *         price:
 *           type: number
 *           format: float
 *           description: Price per unit
 *           example: 29.99
 *     Order:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Auto-generated UUID
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         customerId:
 *           type: string
 *           description: The customer identifier
 *           example: "cust-001"
 *         products:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Product'
 *         totalAmount:
 *           type: number
 *           format: float
 *           description: Total order amount
 *           example: 89.97
 *         status:
 *           type: string
 *           enum: [pending, confirmed, shipped, delivered, cancelled]
 *           description: Current order status
 *           example: "pending"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Order creation timestamp
 *     OrderInput:
 *       type: object
 *       required:
 *         - customerId
 *         - products
 *         - totalAmount
 *       properties:
 *         customerId:
 *           type: string
 *           description: The customer identifier
 *           example: "cust-003"
 *         products:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Product'
 *         totalAmount:
 *           type: number
 *           format: float
 *           description: Total order amount
 *           example: 59.98
 *         status:
 *           type: string
 *           enum: [pending, confirmed, shipped, delivered, cancelled]
 *           description: Order status (defaults to pending)
 *           example: "pending"
 */

// Data is persisted in MongoDB collection: orders

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Retrieve all orders
 *     description: Returns a list of all orders in the system.
 *     tags:
 *       - Orders
 *     responses:
 *       200:
 *         description: A list of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 */
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await (await getCollection()).find({}).sort({ createdAt: -1 }).toArray();
    res.json(orders.map(formatDoc));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Retrieve a single order by ID
 *     description: Returns a single order matching the given ID.
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The order ID (UUID)
 *     responses:
 *       200:
 *         description: A single order
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Order not found"
 */
app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await (await getCollection()).findOne(buildIdQuery(req.params.id));
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(formatDoc(order));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch order', error: error.message });
  }
});

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     description: Creates a new order with the provided details. A UUID and timestamp are generated automatically.
 *     tags:
 *       - Orders
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderInput'
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "customerId, products, and totalAmount are required"
 */
app.post('/api/orders', async (req, res) => {
  const { customerId, products, totalAmount, status } = req.body;

  if (!customerId || !products || totalAmount === undefined) {
    return res.status(400).json({
      message: 'customerId, products, and totalAmount are required',
    });
  }

  const newOrder = {
    id: uuidv4(),
    customerId,
    products,
    totalAmount,
    status: status || 'pending',
    createdAt: new Date().toISOString(),
  };

  try {
    await (await getCollection()).insertOne(newOrder);
    res.status(201).json(newOrder);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   put:
 *     summary: Update an existing order
 *     description: Updates the specified order with the provided fields.
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The order ID (UUID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderInput'
 *     responses:
 *       200:
 *         description: Order updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Order not found"
 */
app.put('/api/orders/:id', async (req, res) => {
  const { customerId, products, totalAmount, status } = req.body;
  const update = {
    ...(customerId !== undefined && { customerId }),
    ...(products !== undefined && { products }),
    ...(totalAmount !== undefined && { totalAmount }),
    ...(status !== undefined && { status }),
  };

  try {
    const result = await (await getCollection()).findOneAndUpdate(
      buildIdQuery(req.params.id),
      { $set: update },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(formatDoc(result.value));
  } catch (error) {
    res.status(500).json({ message: 'Failed to update order', error: error.message });
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
 *     summary: Delete an order
 *     description: Removes the specified order from the system.
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The order ID (UUID)
 *     responses:
 *       200:
 *         description: Order deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Order deleted successfully"
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Order not found"
 */
app.delete('/api/orders/:id', async (req, res) => {
  try {
    const result = await (await getCollection()).deleteOne(buildIdQuery(req.params.id));
    if (!result.deletedCount) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete order', error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Order Service running on port ${PORT}`);
  initDb().catch((error) => {
    console.error(`Order Service MongoDB connection failed: ${error.message}`);
  });
});
