import fastify from 'fastify'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Create Fastify instance with configuration
const server = fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    } : undefined
  },
  trustProxy: true
})

// Register plugins
async function registerPlugins() {
  // CORS plugin
  await server.register(import('@fastify/cors'), {
    origin: process.env.NODE_ENV === 'production' ? ['https://yourdomain.com'] : true,
    credentials: true
  })

  // Security headers
  await server.register(import('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"]
      }
    }
  })

  // Rate limiting
  await server.register(import('@fastify/rate-limit'), {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '15m',
    skipOnError: false
  })

  // Swagger documentation
  await server.register(import('@fastify/swagger'), {
    swagger: {
      info: {
        title: 'User Service',
        description: 'User Management Service for Notification Microservices',
        version: '1.0.0',
        contact: {
          name: 'API Support',
          email: 'support@example.com'
        }
      },
      host: 'localhost:3001',
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'Health', description: 'Health check endpoints' },
        { name: 'Users', description: 'User management' }
      ],
      securityDefinitions: {
        Bearer: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header'
        }
      }
    }
  })

  // Swagger UI
  await server.register(import('@fastify/swagger-ui'), {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  })

  // Register user routes
  server.register(import('./routes/users'))
}

// Health check endpoint
server.get('/health', {
  schema: {
    tags: ['Health'],
    description: 'Health check endpoint',
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          timestamp: { type: 'string' },
          uptime: { type: 'number' },
          version: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  }
})

// Basic route
server.get('/', {
  schema: {
    tags: ['Health'],
    description: 'Root endpoint',
    response: {
      200: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          service: { type: 'string' },
          version: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  return {
    message: 'User Service is running',
    service: 'user-service',
    version: '1.0.0'
  }
})

// Error handler
server.setErrorHandler(function (error: any, request, reply) {
  server.log.error(error)

  // Handle validation errors
  if (error.validation) {
    reply.status(400).send({
      success: false,
      error: 'Validation Error',
      message: 'Invalid request data',
      details: error.validation
    })
    return
  }

  // Handle JWT errors
  if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
    reply.status(401).send({
      success: false,
      error: 'Unauthorized',
      message: 'Missing authorization header'
    })
    return
  }

  if (error.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED') {
    reply.status(401).send({
      success: false,
      error: 'Unauthorized',
      message: 'Token expired'
    })
    return
  }

  // Handle rate limit errors
  if (error.statusCode === 429) {
    reply.status(429).send({
      success: false,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded'
    })
    return
  }

  // Default error response
  reply.status(error.statusCode || 500).send({
    success: false,
    error: error.name || 'Internal Server Error',
    message: error.message || 'Something went wrong'
  })
})

// Graceful shutdown
process.on('SIGINT', async () => {
  server.log.info('Shutting down gracefully...')
  await server.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  server.log.info('Shutting down gracefully...')
  await server.close()
  process.exit(0)
})

// Start server
async function start() {
  try {
    await registerPlugins()

    const port = parseInt(process.env.PORT || '3001')
    const host = process.env.HOST || '0.0.0.0'

    await server.listen({ port, host })
    server.log.info(`🚀 User Service listening on http://${host}:${port}`)
    server.log.info(`📚 API Documentation: http://${host}:${port}/docs`)
  } catch (err: any) {
    server.log.error('Error starting server:', err.message)
    process.exit(1)
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  server.log.error('Unhandled Rejection at: %s, reason: %s', promise, reason)
})

process.on('uncaughtException', (error: Error) => {
  server.log.error('Uncaught Exception: %s', error.message)
  process.exit(1)
})

// Start the server
start()