const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = Number(process.env.API_GATEWAY_PORT) || 3000;
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001';
const CUSTOMER_SERVICE_URL = process.env.CUSTOMER_SERVICE_URL || 'http://localhost:3002';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3003';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004';

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
app.use(cors());

// ---------------------------------------------------------------------------
// Logging middleware - logs every incoming request
// ---------------------------------------------------------------------------
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// ---------------------------------------------------------------------------
// Swagger / OpenAPI configuration
// ---------------------------------------------------------------------------
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'E-Commerce API Gateway',
    version: '1.0.0',
    description:
      'Unified API Gateway for the E-Commerce microservices architecture. ' +
      'All requests are proxied through this gateway (port 3000) to the ' +
      'appropriate microservice, so clients never need to know the ' +
      'individual service ports.',
  },
  servers: [
    {
      url: `http://localhost:${PORT}`,
      description: 'API Gateway',
    },
  ],
  tags: [
    { name: 'Gateway', description: 'Gateway information' },
    { name: 'Products', description: 'Product Service (port 3001)' },
    { name: 'Customers', description: 'Customer Service (port 3002)' },
    { name: 'Orders', description: 'Order Service (port 3003)' },
    { name: 'Payments', description: 'Payment Service (port 3004)' },
  ],
  paths: {
    // ----- Gateway root -----
    '/': {
      get: {
        tags: ['Gateway'],
        summary: 'Gateway information',
        description: 'Returns a list of available services and their route mappings.',
        responses: {
          200: {
            description: 'Gateway info with route mappings',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    services: {
                      type: 'object',
                      additionalProperties: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ========================  PRODUCTS  ========================
    '/api/products': {
      get: {
        tags: ['Products'],
        summary: 'Get all products',
        description: 'Retrieves the full list of products from the Product Service.',
        responses: {
          200: { description: 'List of products' },
        },
      },
      post: {
        tags: ['Products'],
        summary: 'Create a new product',
        description: 'Creates a new product in the Product Service.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Laptop' },
                  description: { type: 'string', example: 'High-performance laptop' },
                  price: { type: 'number', example: 999.99 },
                  stock: { type: 'integer', example: 50 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Product created' },
        },
      },
    },
    '/api/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Get a product by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Product details' },
          404: { description: 'Product not found' },
        },
      },
      put: {
        tags: ['Products'],
        summary: 'Update a product by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  price: { type: 'number' },
                  stock: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Product updated' },
          404: { description: 'Product not found' },
        },
      },
      delete: {
        tags: ['Products'],
        summary: 'Delete a product by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Product deleted' },
          404: { description: 'Product not found' },
        },
      },
    },

    // ========================  CUSTOMERS  ========================
    '/api/customers': {
      get: {
        tags: ['Customers'],
        summary: 'Get all customers',
        description: 'Retrieves the full list of customers from the Customer Service.',
        responses: {
          200: { description: 'List of customers' },
        },
      },
      post: {
        tags: ['Customers'],
        summary: 'Create a new customer',
        description: 'Creates a new customer in the Customer Service.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'John Doe' },
                  email: { type: 'string', example: 'john@example.com' },
                  address: { type: 'string', example: '123 Main St' },
                  phone: { type: 'string', example: '+1234567890' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Customer created' },
        },
      },
    },
    '/api/customers/{id}': {
      get: {
        tags: ['Customers'],
        summary: 'Get a customer by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Customer details' },
          404: { description: 'Customer not found' },
        },
      },
      put: {
        tags: ['Customers'],
        summary: 'Update a customer by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  address: { type: 'string' },
                  phone: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Customer updated' },
          404: { description: 'Customer not found' },
        },
      },
      delete: {
        tags: ['Customers'],
        summary: 'Delete a customer by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Customer deleted' },
          404: { description: 'Customer not found' },
        },
      },
    },

    // ========================  ORDERS  ========================
    '/api/orders': {
      get: {
        tags: ['Orders'],
        summary: 'Get all orders',
        description: 'Retrieves the full list of orders from the Order Service.',
        responses: {
          200: { description: 'List of orders' },
        },
      },
      post: {
        tags: ['Orders'],
        summary: 'Create a new order',
        description: 'Creates a new order in the Order Service.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  customerId: { type: 'string', example: '1' },
                  products: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        productId: { type: 'string', example: '1' },
                        quantity: { type: 'integer', example: 2 },
                      },
                    },
                  },
                  totalAmount: { type: 'number', example: 1999.98 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Order created' },
        },
      },
    },
    '/api/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Get an order by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Order details' },
          404: { description: 'Order not found' },
        },
      },
      put: {
        tags: ['Orders'],
        summary: 'Update an order by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  customerId: { type: 'string' },
                  products: { type: 'array', items: { type: 'object' } },
                  totalAmount: { type: 'number' },
                  status: { type: 'string', example: 'shipped' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Order updated' },
          404: { description: 'Order not found' },
        },
      },
      delete: {
        tags: ['Orders'],
        summary: 'Delete an order by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Order deleted' },
          404: { description: 'Order not found' },
        },
      },
    },

    // ========================  PAYMENTS  ========================
    '/api/payments': {
      get: {
        tags: ['Payments'],
        summary: 'Get all payments',
        description: 'Retrieves the full list of payments from the Payment Service.',
        responses: {
          200: { description: 'List of payments' },
        },
      },
      post: {
        tags: ['Payments'],
        summary: 'Create a new payment',
        description: 'Creates a new payment in the Payment Service.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  orderId: { type: 'string', example: '1' },
                  amount: { type: 'number', example: 1999.98 },
                  method: { type: 'string', example: 'credit_card' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Payment created' },
        },
      },
    },
    '/api/payments/{id}': {
      get: {
        tags: ['Payments'],
        summary: 'Get a payment by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Payment details' },
          404: { description: 'Payment not found' },
        },
      },
      put: {
        tags: ['Payments'],
        summary: 'Update a payment by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  orderId: { type: 'string' },
                  amount: { type: 'number' },
                  method: { type: 'string' },
                  status: { type: 'string', example: 'completed' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Payment updated' },
          404: { description: 'Payment not found' },
        },
      },
      delete: {
        tags: ['Payments'],
        summary: 'Delete a payment by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Payment deleted' },
          404: { description: 'Payment not found' },
        },
      },
    },
  },
};

const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: [], // all paths are defined inline above
});

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ---------------------------------------------------------------------------
// Gateway root - service info
// ---------------------------------------------------------------------------
app.get('/', (_req, res) => {
  res.json({
    message: 'E-Commerce API Gateway',
    description:
      `All microservices are accessible through this single gateway on port ${PORT}.`,
    services: {
      products: `/api/products  ->  ${PRODUCT_SERVICE_URL}`,
      customers: `/api/customers  ->  ${CUSTOMER_SERVICE_URL}`,
      orders: `/api/orders  ->  ${ORDER_SERVICE_URL}`,
      payments: `/api/payments  ->  ${PAYMENT_SERVICE_URL}`,
    },
    documentation: `http://localhost:${PORT}/api-docs`,
  });
});

// ---------------------------------------------------------------------------
// Proxy routes - forward requests to the appropriate microservice
// ---------------------------------------------------------------------------
const services = [
  { path: '/api/products', target: PRODUCT_SERVICE_URL, name: 'Product Service' },
  { path: '/api/customers', target: CUSTOMER_SERVICE_URL, name: 'Customer Service' },
  { path: '/api/orders', target: ORDER_SERVICE_URL, name: 'Order Service' },
  { path: '/api/payments', target: PAYMENT_SERVICE_URL, name: 'Payment Service' },
];

services.forEach(({ path, target, name }) => {
  app.use(
    createProxyMiddleware(path, {
      target,
      changeOrigin: true,
      logLevel: 'warn',
      onError: (err, _req, res) => {
        const details = err.message || err.code || 'Upstream connection failed';
        console.error(`[Proxy Error] ${name} (${target}): ${details}`);
        res.status(502).json({
          error: `${name} is unavailable`,
          details,
        });
      },
    })
  );
});

// ---------------------------------------------------------------------------
// Start the gateway
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log('-----------------------------------');
  console.log('Route mappings:');
  services.forEach(({ path, target, name }) => {
    console.log(`  ${path}/* -> ${target}  (${name})`);
  });
  console.log('-----------------------------------');
  console.log(`Swagger docs: http://localhost:${PORT}/api-docs`);
});
