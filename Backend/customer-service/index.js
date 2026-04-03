require("dns").setServers(["1.1.1.1", "8.8.8.8"]);

const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const { MongoClient, ObjectId } = require("mongodb");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = Number(process.env.CUSTOMER_SERVICE_PORT) || 3002;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || "movie_explorer";
const COLLECTION = "customers";

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
    throw new Error("MONGODB_URI is missing in environment variables");
  }

  if (!dbPromise) {
    const client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    dbPromise = client
      .connect()
      .then(() => {
        db = client.db(DB_NAME);
        console.log(
          `Customer Service connected to MongoDB database: ${DB_NAME}`,
        );
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
    openapi: "3.0.0",
    info: {
      title: "Customer Service API",
      version: "1.0.0",
      description:
        "Microservice for managing customers in the E-Commerce platform",
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server",
      },
    ],
  },
  apis: ["./index.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * components:
 *   schemas:
 *     Customer:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the customer
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         name:
 *           type: string
 *           description: Full name of the customer
 *           example: "John Doe"
 *         email:
 *           type: string
 *           format: email
 *           description: Email address of the customer
 *           example: "john.doe@example.com"
 *         phone:
 *           type: string
 *           description: Phone number of the customer
 *           example: "+1-555-0101"
 *         address:
 *           type: string
 *           description: Mailing address of the customer
 *           example: "123 Main St, Springfield, IL 62701"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the customer was created
 *     CustomerInput:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - phone
 *         - address
 *       properties:
 *         name:
 *           type: string
 *           example: "Jane Smith"
 *         email:
 *           type: string
 *           format: email
 *           example: "jane.smith@example.com"
 *         phone:
 *           type: string
 *           example: "+1-555-0202"
 *         address:
 *           type: string
 *           example: "456 Oak Ave, Metropolis, NY 10001"
 */

// Data is persisted in MongoDB collection: customers

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Retrieve all customers
 *     description: Returns a list of all customers in the system.
 *     tags:
 *       - Customers
 *     responses:
 *       200:
 *         description: A list of customers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Customer'
 */
app.get("/api/customers", async (req, res) => {
  try {
    const customers = await (await getCollection())
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.json(customers.map(formatDoc));
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch customers", error: error.message });
  }
});

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     summary: Retrieve a single customer by ID
 *     description: Returns the customer matching the given UUID.
 *     tags:
 *       - Customers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The customer ID
 *     responses:
 *       200:
 *         description: A single customer object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       404:
 *         description: Customer not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Customer not found"
 */
app.get("/api/customers/:id", async (req, res) => {
  try {
    const customer = await (
      await getCollection()
    ).findOne(buildIdQuery(req.params.id));
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json(formatDoc(customer));
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch customer", error: error.message });
  }
});

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Create a new customer
 *     description: Adds a new customer to the system.
 *     tags:
 *       - Customers
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerInput'
 *     responses:
 *       201:
 *         description: Customer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Fields name, email, phone, and address are required"
 */
app.post("/api/customers", async (req, res) => {
  const { name, email, phone, address } = req.body;

  if (!name || !email || !phone || !address) {
    return res
      .status(400)
      .json({ message: "Fields name, email, phone, and address are required" });
  }

  const newCustomer = {
    id: uuidv4(),
    name,
    email,
    phone,
    address,
    createdAt: new Date().toISOString(),
  };

  try {
    await (await getCollection()).insertOne(newCustomer);
    res.status(201).json(newCustomer);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to create customer", error: error.message });
  }
});

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     summary: Update an existing customer
 *     description: Updates the customer matching the given UUID with the provided fields.
 *     tags:
 *       - Customers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerInput'
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       404:
 *         description: Customer not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Customer not found"
 */
app.put("/api/customers/:id", async (req, res) => {
  const { name, email, phone, address } = req.body;
  const update = {
    ...(name !== undefined && { name }),
    ...(email !== undefined && { email }),
    ...(phone !== undefined && { phone }),
    ...(address !== undefined && { address }),
  };

  try {
    const result = await (
      await getCollection()
    ).findOneAndUpdate(
      buildIdQuery(req.params.id),
      { $set: update },
      { returnDocument: "after" },
    );

    if (!result) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(formatDoc(result));
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update customer", error: error.message });
  }
});

/**
 * @swagger
 * /api/customers/{id}:
 *   delete:
 *     summary: Delete a customer
 *     description: Removes the customer matching the given UUID from the system.
 *     tags:
 *       - Customers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The customer ID
 *     responses:
 *       200:
 *         description: Customer deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Customer deleted successfully"
 *       404:
 *         description: Customer not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Customer not found"
 */
app.delete("/api/customers/:id", async (req, res) => {
  try {
    const result = await (
      await getCollection()
    ).deleteOne(buildIdQuery(req.params.id));
    if (!result.deletedCount) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({ message: "Customer deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete customer", error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Customer Service running on port ${PORT}`);
  initDb().catch((error) => {
    console.error(
      `Customer Service MongoDB connection failed: ${error.message}`,
    );
  });
});
