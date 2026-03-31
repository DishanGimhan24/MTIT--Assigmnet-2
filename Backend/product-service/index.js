// require('dns').setServers(['1.1.1.1', '8.8.8.8']);

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { MongoClient, ObjectId } = require('mongodb');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = Number(process.env.PRODUCT_SERVICE_PORT) || 3001;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'movie_explorer';
const COLLECTION = 'products';

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
        console.log(`Product Service connected to MongoDB database: ${DB_NAME}`);
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
      title: 'Product Service API',
      version: '1.0.0',
      description: 'A microservice for managing products in an E-Commerce platform',
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
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the product
 *           example: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *         name:
 *           type: string
 *           description: Name of the product
 *           example: "Wireless Mouse"
 *         description:
 *           type: string
 *           description: Detailed description of the product
 *           example: "Ergonomic wireless mouse with USB receiver"
 *         price:
 *           type: number
 *           format: float
 *           description: Price of the product
 *           example: 29.99
 *         category:
 *           type: string
 *           description: Product category
 *           example: "Electronics"
 *         stock:
 *           type: integer
 *           description: Number of items in stock
 *           example: 150
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the product was created
 *       required:
 *         - id
 *         - name
 *         - description
 *         - price
 *         - category
 *         - stock
 *         - createdAt
 *     ProductInput:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the product
 *           example: "Wireless Mouse"
 *         description:
 *           type: string
 *           description: Detailed description of the product
 *           example: "Ergonomic wireless mouse with USB receiver"
 *         price:
 *           type: number
 *           format: float
 *           description: Price of the product
 *           example: 29.99
 *         category:
 *           type: string
 *           description: Product category
 *           example: "Electronics"
 *         stock:
 *           type: integer
 *           description: Number of items in stock
 *           example: 150
 *       required:
 *         - name
 *         - description
 *         - price
 *         - category
 *         - stock
 */

// Data is persisted in MongoDB collection: products

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Retrieve all products
 *     description: Returns a list of all products in the catalog.
 *     tags:
 *       - Products
 *     responses:
 *       200:
 *         description: A list of products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
app.get('/api/products', async (req, res) => {
  try {
    const products = await (await getCollection()).find({}).sort({ createdAt: -1 }).toArray();
    res.json(products.map(formatDoc));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch products', error: error.message });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Retrieve a single product by ID
 *     description: Returns a single product matching the given ID.
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The product ID
 *     responses:
 *       200:
 *         description: A single product
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product not found"
 */
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await (await getCollection()).findOne(buildIdQuery(req.params.id));
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(formatDoc(product));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch product', error: error.message });
  }
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     description: Adds a new product to the catalog.
 *     tags:
 *       - Products
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "All fields are required: name, description, price, category, stock"
 */
app.post('/api/products', async (req, res) => {
  const { name, description, price, category, stock } = req.body;

  if (!name || !description || price == null || !category || stock == null) {
    return res.status(400).json({
      message: 'All fields are required: name, description, price, category, stock',
    });
  }

  const newProduct = {
    id: uuidv4(),
    name,
    description,
    price: parseFloat(price),
    category,
    stock: parseInt(stock, 10),
    createdAt: new Date().toISOString(),
  };

  try {
    await (await getCollection()).insertOne(newProduct);
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create product', error: error.message });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update an existing product
 *     description: Updates the fields of an existing product by ID.
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product not found"
 */
app.put('/api/products/:id', async (req, res) => {
  const { name, description, price, category, stock } = req.body;
  const update = {
    ...(name !== undefined && { name }),
    ...(description !== undefined && { description }),
    ...(price != null && { price: parseFloat(price) }),
    ...(category !== undefined && { category }),
    ...(stock != null && { stock: parseInt(stock, 10) }),
  };

  try {
    const result = await (await getCollection()).findOneAndUpdate(
      buildIdQuery(req.params.id),
      { $set: update },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(formatDoc(result));
  } catch (error) {
    res.status(500).json({ message: 'Failed to update product', error: error.message });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product
 *     description: Removes a product from the catalog by ID.
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product deleted successfully"
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product not found"
 */
app.delete('/api/products/:id', async (req, res) => {
  try {
    const result = await (await getCollection()).deleteOne(buildIdQuery(req.params.id));
    if (!result.deletedCount) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete product', error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Product Service running on port ${PORT}`);
  initDb().catch((error) => {
    console.error(`Product Service MongoDB connection failed: ${error.message}`);
  });
});
