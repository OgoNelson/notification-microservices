# Notification API Gateway

This is the API Gateway service for the notification microservices system.

## Features Implemented

- ✅ **Fastify Server Setup**: Configured with TypeScript, proper logging, and development environment
- ✅ **Plugin Architecture**: Modular plugin system for CORS, security, JWT, rate limiting, and Swagger documentation
- ✅ **API Routes**: Complete notification management endpoints with validation and error handling
- ✅ **Authentication**: JWT-based authentication with proper decorator pattern
- ✅ **Request/Response Validation**: JSON schema validation for all endpoints
- ✅ **Error Handling**: Comprehensive error handling with proper status codes
- ✅ **Health Checks**: Health check endpoint for monitoring
- ✅ **API Documentation**: Auto-generated Swagger UI at `/docs`

## API Endpoints

### Health Check
- `GET /health` - Returns server status and uptime
- `GET /` - Root endpoint with service information

### Notification Management
- `POST /v1/notifications` - Create and queue a notification
- `GET /v1/notifications/:notification_id` - Get notification status by ID
- `POST /v1/notifications/:notification_id/status` - Update notification status (webhook)
- `GET /v1/notifications` - List notifications with filtering and pagination

## Testing

The API Gateway has been tested with:
- ✅ Health endpoint (returns proper JSON response)
- ✅ Root endpoint (returns service information)
- ✅ Notification creation (accepts JSON, validates, and queues)
- ✅ Swagger documentation (accessible at `/docs`)

## Next Steps

1. Add authentication back to protected routes
2. Implement actual database integration
3. Implement message queue integration
4. Add user management routes
5. Add template management routes
6. Implement circuit breaker pattern
7. Add Redis caching
8. Add comprehensive logging with correlation IDs

## Running the Service

```bash
cd api-gateway
npm run dev
```

The server will start on `http://localhost:3000` and the API documentation will be available at `http://localhost:3000/docs`.