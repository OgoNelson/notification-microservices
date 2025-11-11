# Distributed Notification System Architecture

## Overview
This document outlines the architecture for a distributed notification system built with Fastify, consisting of multiple microservices that communicate through RabbitMQ.

## System Components

### 1. API Gateway Service (Port: 3000)
- **Purpose**: Entry point for all notification requests
- **Responsibilities**:
  - Request validation and authentication
  - Route messages to appropriate queues
  - Track notification status
  - Rate limiting and request throttling

### 2. User Service (Port: 3001)
- **Purpose**: Manages user contact information and preferences
- **Database**: PostgreSQL
- **Responsibilities**:
  - User authentication and authorization
  - Store email addresses and push tokens
  - Manage notification preferences
  - Expose REST APIs for user management

### 3. Email Service (Port: 3002)
- **Purpose**: Processes email notifications
- **Queue**: email.queue
- **Responsibilities**:
  - Process email messages from queue
  - Template variable substitution
  - SMTP email delivery
  - Handle delivery confirmations and bounces

### 4. Push Service (Port: 3003)
- **Purpose**: Processes push notifications
- **Queue**: push.queue
- **Responsibilities**:
  - Process push messages from queue
  - Firebase Cloud Messaging (FCM) integration
  - Device token validation
  - Support rich notifications

### 5. Template Service (Port: 3004)
- **Purpose**: Manages notification templates
- **Database**: PostgreSQL
- **Responsibilities**:
  - Store and manage templates
  - Handle variable substitution
  - Multi-language support
  - Template versioning

## Infrastructure Components

### Message Queue (RabbitMQ)
```
Exchange: notifications.direct
├── email.queue → Email Service
├── push.queue → Push Service
└── failed.queue → Dead Letter Queue
```

### Databases
- **PostgreSQL**: User data, templates, preferences
- **Redis**: Caching, rate limiting, session management

### External Services
- **SMTP Provider**: Email delivery
- **Firebase Cloud Messaging**: Push notifications

## Key Technical Patterns

### 1. Circuit Breaker
- Prevents cascading failures
- Implemented using `opossum` or similar library
- Configurable thresholds for each service

### 2. Retry System
- Exponential backoff for failed messages
- Dead letter queue for permanent failures
- Configurable retry limits per service

### 3. Idempotency
- Unique request IDs for all notifications
- Prevent duplicate processing
- Idempotency keys stored in Redis

### 4. Service Discovery
- Services register themselves on startup
- Dynamic service location resolution
- Health check monitoring

## Data Flow

### Notification Request Flow
1. Client sends request to API Gateway
2. Gateway validates and authenticates request
3. Gateway retrieves user preferences from User Service
4. Gateway routes to appropriate queue (email/push)
5. Worker service processes message from queue
6. Template Service provides formatted content
7. Notification is sent via appropriate channel
8. Status is updated and tracked

### Status Update Flow
1. Worker service updates notification status
2. Status is stored in shared cache
3. Client can query status through API Gateway
4. Status callbacks sent to configured endpoints

## Performance Considerations

### Scaling Strategy
- Horizontal scaling for all services
- Queue-based load distribution
- Database connection pooling
- Redis clustering for cache scaling

### Performance Targets
- 1,000+ notifications per minute
- API Gateway response < 100ms
- 99.5% delivery success rate

### Monitoring Metrics
- Message rate per queue
- Service response times
- Error rates
- Queue length and lag
- Database performance metrics

## Security Considerations

### Authentication & Authorization
- JWT-based authentication
- Role-based access control
- API key management for service-to-service communication

### Data Protection
- Encrypted data at rest
- Secure communication channels (HTTPS/TLS)
- Sensitive data masking in logs

## Development Workflow

### Local Development
- Docker Compose for local environment
- Service-specific configuration files
- Database migrations and seeding

### Deployment
- Containerized services (Docker)
- CI/CD pipeline for automated deployment
- Environment-specific configurations
- Blue-green deployment strategy

## Learning Path for Fastify

### Phase 1: Basics
1. Fastify server setup and basic routing
2. Plugin system and middleware
3. Request/response handling
4. Validation and serialization

### Phase 2: Advanced Features
1. Hook system (preHandler, preValidation, etc.)
2. Custom decorators and encapsulation
3. Error handling and logging
4. Testing strategies

### Phase 3: Production Features
1. Performance optimization
2. Clustering and scaling
3. Security best practices
4. Monitoring and observability