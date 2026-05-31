/**
 * Swagger/OpenAPI Configuration
 * API documentation for Susu-BG backend
 */

let swaggerJsdoc;
try {
  swaggerJsdoc = require('swagger-jsdoc');
} catch {
  swaggerJsdoc = null;
}

if (!swaggerJsdoc) {
  module.exports = { swaggerSpec: null, swaggerJsdoc: null };
} else {

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Susu-BG API',
      version: '1.0.0',
      description: 'Fintech API for Ghana daily savings (SUSU) and wallet management',
      contact: {
        name: 'API Support',
        email: 'support@susu-bg.com',
      },
    },
    servers: [
      {
        url: process.env.BACKEND_URL || 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    tags: [
      { name: 'auth', description: 'Authentication endpoints' },
      { name: 'wallet', description: 'Wallet operations' },
      { name: 'transactions', description: 'Transaction history' },
      { name: 'susu', description: 'SUSU group management' },
      { name: 'admin', description: 'Admin operations' },
      { name: 'teller', description: 'Teller operations' },
      { name: 'ussd', description: 'USSD mobile money' },
      { name: 'webhooks', description: 'Payment webhooks' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            phone_number: { type: 'string' },
            email: { type: 'string' },
            full_name: { type: 'string' },
            kyc_status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
          },
        },
        Wallet: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            balance: { type: 'number', format: 'decimal' },
            currency: { type: 'string', example: 'GHS' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            reference: { type: 'string' },
            amount: { type: 'number', format: 'decimal' },
            type: { type: 'string', enum: ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER'] },
            status: { type: 'string', enum: ['PENDING', 'SUCCESS', 'FAILED'] },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        SusuGroup: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            group_name: { type: 'string' },
            group_code: { type: 'string' },
            target_group: { type: 'string', enum: ['MARKET_WOMEN', 'TAXI_DRIVERS', 'OFFICE_WORKERS', 'GENERAL'] },
            daily_contribution: { type: 'number', format: 'decimal' },
            max_members: { type: 'integer' },
            current_members: { type: 'integer' },
            status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED', 'CLOSED'] },
          },
        },
      },
    },
    paths: {
      '/api/auth/login': {
        post: {
          tags: ['auth'],
          summary: 'User login with OTP',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['phone_number'],
                  properties: {
                    phone_number: { type: 'string' },
                    pin: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
            '400': { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/wallet/deposit': {
        post: {
          tags: ['wallet'],
          summary: 'Initialize deposit',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['amount'],
                  properties: {
                    amount: { type: 'number', minimum: 1 },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Deposit initialized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
            '400': { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/wallet/withdraw': {
        post: {
          tags: ['wallet'],
          summary: 'Initialize withdrawal',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['amount'],
                  properties: {
                    amount: { type: 'number', minimum: 1 },
                    recipient_code: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Withdrawal initialized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
            '400': { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '402': { description: 'Insufficient funds', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/transactions': {
        get: {
          tags: ['transactions'],
          summary: 'Get user transactions',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER'] } },
          ],
          responses: {
            '200': { description: 'Transactions list', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } },
          },
        },
      },
      '/api/susu/groups': {
        get: {
          tags: ['susu'],
          summary: 'Get all SUSU groups',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Groups list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/SusuGroup' } } } } },
          },
        },
        post: {
          tags: ['susu'],
          summary: 'Create SUSU group',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['groupName', 'targetGroup'],
                  properties: {
                    groupName: { type: 'string' },
                    targetGroup: { type: 'string', enum: ['MARKET_WOMEN', 'TAXI_DRIVERS', 'OFFICE_WORKERS', 'GENERAL'] },
                    collectorId: { type: 'string', format: 'uuid' },
                    maxMembers: { type: 'integer', default: 30 },
                    dailyContribution: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Group created', content: { 'application/json': { schema: { $ref: '#/components/schemas/SusuGroup' } } } },
          },
        },
      },
      '/health': {
        get: {
          tags: ['admin'],
          summary: 'Health check',
          responses: {
            '200': { description: 'Server is healthy', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } } },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js'], // Path to the API routes
};

// Generate Swagger specification
const swaggerSpec = swaggerJsdoc(options);
module.exports = { swaggerSpec, swaggerJsdoc };
}