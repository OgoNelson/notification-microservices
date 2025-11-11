# Getting Started with Fastify Notification System

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or higher)
- npm or yarn
- Docker and Docker Compose
- Git
- PostgreSQL client tools (optional)
- Redis client tools (optional)

## Quick Start

### 1. Clone and Initialize the Project

```bash
# Create project directory
mkdir notification-microservices
cd notification-microservices

# Initialize git repository
git init

# Create shared directory for common utilities
mkdir shared
mkdir shared/types
mkdir shared/utils
mkdir shared/plugins
```

### 2. Set Up Development Environment

Create `docker-compose.dev.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: notification_user
      POSTGRES_PASSWORD: notification_pass
      POSTGRES_DB: notification_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: notification_user
      RABBITMQ_DEFAULT_PASS: notification_pass
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

volumes:
  postgres_data:
  rabbitmq_data:
```

Start the development environment:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 3. Initialize First Service (API Gateway)

```bash
# Create API Gateway directory
mkdir api-gateway
cd api-gateway

# Initialize Node.js project
npm init -y

# Install Fastify and essential plugins
npm install fastify fastify-cli fastify-cors fastify-helmet fastify-jwt fastify-rate-limit fastify-swagger

# Install development dependencies
npm install -D typescript @types/node ts-node nodemon jest @types/jest supertest @types/supertest

# Install additional dependencies
npm install amqplib ioredis pino opossum

# Create TypeScript configuration
npx tsc --init
```

### 4. Create Basic Fastify Server

Create `src/server.ts`:

```typescript
import fastify from 'fastify'

const server = fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    }
  }
})

// Register plugins
server.register(import('@fastify/cors'))
server.register(import('@fastify/helmet'))
server.register(import('@fastify/swagger'), {
  exposeRoute: true,
  routePrefix: '/docs'
})

// Health check endpoint
server.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Basic route
server.get('/', async (request, reply) => {
  return { message: 'Notification API Gateway' }
})

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000')
    await server.listen({ port, host: '0.0.0.0' })
    server.log.info(`Server listening on port ${port}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
```

### 5. Add Development Scripts

Update `package.json`:

```json
{
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest"
  },
  "keywords": ["fastify", "microservices", "notifications"],
  "author": "Your Name",
  "license": "MIT"
}
```

### 6. Create Environment Configuration

Create `.env`:

```env
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=notification_user
DB_PASSWORD=notification_pass
DB_NAME=notification_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=notification_user
RABBITMQ_PASSWORD=notification_pass

# JWT
JWT_SECRET=your-super-secret-jwt-key

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Firebase
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
```

## Learning Fastify - Step by Step

### Step 1: Understanding Fastify Basics

Run your first server:

```bash
cd api-gateway
npm run dev
```

Visit `http://localhost:3000/docs` to see the Swagger documentation.

### Step 2: Adding Validation and Serialization

Create `src/schemas/notification.ts`:

```typescript
export const notificationSchema = {
  type: 'object',
  properties: {
    notification_type: { type: 'string', enum: ['email', 'push'] },
    user_id: { type: 'string', format: 'uuid' },
    template_code: { type: 'string' },
    variables: { type: 'object' },
    request_id: { type: 'string' },
    priority: { type: 'integer', minimum: 1, maximum: 10 },
    metadata: { type: 'object', nullable: true }
  },
  required: ['notification_type', 'user_id', 'template_code', 'variables', 'request_id'],
  additionalProperties: false
}

export const responseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: { type: 'object', nullable: true },
    error: { type: 'string', nullable: true },
    message: { type: 'string' },
    meta: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        limit: { type: 'number' },
        page: { type: 'number' },
        total_pages: { type: 'number' },
        has_next: { type: 'boolean' },
        has_previous: { type: 'boolean' }
      }
    }
  }
}
```

### Step 3: Creating Routes with Validation

Create `src/routes/notifications.ts`:

```typescript
import { FastifyInstance } from 'fastify'
import { notificationSchema, responseSchema } from '../schemas/notification'

export default async function notificationRoutes(fastify: FastifyInstance) {
  fastify.post('/api/v1/notifications', {
    schema: {
      body: notificationSchema,
      response: {
        200: responseSchema
      }
    }
  }, async (request, reply) => {
    const { notification_type, user_id, template_code, variables, request_id, priority, metadata } = request.body as any
    
    // TODO: Implement notification logic
    fastify.log.info(`Processing ${notification_type} notification for user ${user_id}`)
    
    return {
      success: true,
      data: {
        notification_id: generateUUID(),
        status: 'pending'
      },
      message: 'Notification queued successfully',
      meta: {
        total: 1,
        limit: 1,
        page: 1,
        total_pages: 1,
        has_next: false,
        has_previous: false
      }
    }
  })
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}
```

### Step 4: Adding Authentication Plugin

Create `src/plugins/auth.ts`:

```typescript
import { FastifyPluginAsync } from 'fastify'
import jwt from '@fastify/jwt'

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'fallback-secret'
  })

  fastify.decorate('authenticate', async function(request, reply) {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })
}

declare module 'fastify' {
  export interface FastifyInstance {
    authenticate(): Promise<void>
  }
  
  export interface FastifyRequest {
    jwt: {
      verify(): Promise<any>
      decode(): any
    }
  }
}

export default authPlugin
```

### Step 5: Adding Database Plugin

Create `src/plugins/database.ts`:

```typescript
import { FastifyPluginAsync } from 'fastify'
import { Pool } from 'pg'

const databasePlugin: FastifyPluginAsync = async (fastify) => {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  })

  fastify.decorate('db', pool)

  // Test database connection
  try {
    const client = await pool.connect()
    await client.query('SELECT NOW()')
    client.release()
    fastify.log.info('Database connected successfully')
  } catch (err) {
    fastify.log.error('Database connection failed:', err)
    process.exit(1)
  }

  // Close database connection on shutdown
  fastify.addHook('onClose', async () => {
    await pool.end()
  })
}

declare module 'fastify' {
  export interface FastifyInstance {
    db: Pool
  }
}

export default databasePlugin
```

## Next Steps

### 1. Complete the API Gateway
- Register all plugins in the main server file
- Implement the complete notification route
- Add error handling
- Add logging with correlation IDs

### 2. Set Up Other Services
Follow the same pattern to create:
- User Service
- Template Service
- Email Service
- Push Service

### 3. Implement Message Queue
- Create RabbitMQ connection plugin
- Set up queues and exchanges
- Implement producers and consumers

### 4. Add Testing
Create `tests/notifications.test.ts`:

```typescript
import { build } from '../src/server'
import { expect } from 'chai'

describe('Notification Routes', () => {
  let app: any

  before(async () => {
    app = build()
  })

  after(async () => {
    await app.close()
  })

  it('should create a notification', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications',
      payload: {
        notification_type: 'email',
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        template_code: 'welcome_email',
        variables: { name: 'John Doe' },
        request_id: 'req-123',
        priority: 5
      }
    })

    expect(response.statusCode).to.equal(200)
    const payload = JSON.parse(response.payload)
    expect(payload.success).to.be.true
  })
})
```

## Common Fastify Patterns

### 1. Error Handling
```typescript
fastify.setErrorHandler(function (error, request, reply) {
  this.log.error(error)
  reply.status(500).send({ 
    success: false, 
    error: 'Internal Server Error',
    message: error.message 
  })
})
```

### 2. Custom Hooks
```typescript
fastify.addHook('preHandler', async (request, reply) => {
  // Add correlation ID
  request.id = request.headers['x-request-id'] || generateUUID()
})
```

### 3. Middleware Pattern
```typescript
fastify.register(async function (fastify) {
  fastify.addHook('preHandler', async (request, reply) => {
    // Custom middleware logic
  })
})
```

## Resources for Learning Fastify

1. [Official Fastify Documentation](https://www.fastify.io/docs/latest/)
2. [Fastify Plugins Ecosystem](https://github.com/fastify/fastify/blob/master/docs/Plugins.md)
3. [Fastify Best Practices](https://github.com/fastify/fastify/blob/master/docs/Best-Practices.md)
4. [Fastify Examples](https://github.com/fastify/fastify/blob/master/docs/Examples.md)

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```

2. **Database connection issues**
   - Check if PostgreSQL is running
   - Verify connection string
   - Check network connectivity

3. **RabbitMQ connection issues**
   - Verify RabbitMQ is running
   - Check credentials
   - Ensure ports are accessible

### Debugging Tips

1. Enable detailed logging:
   ```typescript
   const server = fastify({
     logger: {
       level: 'debug'
     }
   })
   ```

2. Use Fastify's built-in tools:
   ```bash
   # List all routes
   fastify routes
   ```

3. Monitor performance:
   ```bash
   # Enable metrics
   fastify metrics
   ```

This guide should help you get started with building your Fastify notification system. Remember to take it step by step, and don't hesitate to refer back to the official Fastify documentation as you learn!