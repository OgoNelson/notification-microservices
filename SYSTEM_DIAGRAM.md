# System Architecture Diagram

## Overall System Architecture

```mermaid
graph TB
    Client[Client Applications] --> LB[Load Balancer]
    LB --> AG[API Gateway :3000]
    
    AG --> US[User Service :3001]
    AG --> TS[Template Service :3004]
    AG --> MQ[RabbitMQ]
    
    MQ --> ES[Email Service :3002]
    MQ --> PS[Push Service :3003]
    MQ --> DLQ[Dead Letter Queue]
    
    US --> PG1[(PostgreSQL - Users)]
    TS --> PG2[(PostgreSQL - Templates)]
    
    AG --> Redis[(Redis Cache)]
    US --> Redis
    TS --> Redis
    
    ES --> SMTP[SMTP Server]
    PS --> FCM[Firebase Cloud Messaging]
    
    subgraph "Monitoring"
        AG --> M[Metrics Collection]
        US --> M
        ES --> M
        PS --> M
        TS --> M
    end
```

## Service Communication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant AG as API Gateway
    participant US as User Service
    participant TS as Template Service
    participant MQ as RabbitMQ
    participant ES as Email Service
    participant PS as Push Service
    
    C->>AG: POST /api/v1/notifications
    AG->>US: Get user preferences
    US-->>AG: User data & preferences
    AG->>TS: Get template
    TS-->>AG: Template content
    AG->>MQ: Route to email/push queue
    
    alt Email Notification
        MQ->>ES: Consume email message
        ES->>ES: Process template variables
        ES->>ES: Send via SMTP
    else Push Notification
        MQ->>PS: Consume push message
        PS->>PS: Process template variables
        PS->>FCM: Send push notification
    end
```

## Database Schema Design

```mermaid
erDiagram
    USERS {
        uuid id PK
        string name
        string email
        string push_token
        json preferences
        timestamp created_at
        timestamp updated_at
    }
    
    TEMPLATES {
        uuid id PK
        string code
        string language
        string subject
        text content
        text variables
        int version
        timestamp created_at
        timestamp updated_at
    }
    
    NOTIFICATIONS {
        uuid id PK
        string request_id
        uuid user_id FK
        string notification_type
        string template_code
        json variables
        string status
        timestamp created_at
        timestamp updated_at
        json metadata
    }
    
    NOTIFICATION_STATUS {
        uuid id PK
        uuid notification_id FK
        string status
        timestamp timestamp
        string error
    }
    
    USERS ||--o{ NOTIFICATIONS : sends
    TEMPLATES ||--o{ NOTIFICATIONS : uses
    NOTIFICATIONS ||--o{ NOTIFICATION_STATUS : tracks
```

## Queue Structure

```mermaid
graph LR
    subgraph "RabbitMQ Exchange"
        E[notifications.direct]
    end
    
    subgraph "Queues"
        EQ[email.queue]
        PQ[push.queue]
        FQ[failed.queue]
    end
    
    subgraph "Consumers"
        ES[Email Service]
        PS[Push Service]
        DLQ[Dead Letter Handler]
    end
    
    E --> EQ
    E --> PQ
    E --> FQ
    
    EQ --> ES
    PQ --> PS
    FQ --> DLQ
```

## Circuit Breaker Pattern

```mermaid
stateDiagram-v2
    [*] --> Closed
    Closed --> Open: Failure threshold reached
    Open --> Half_Open: Timeout expires
    Half_Open --> Closed: Success
    Half_Open --> Open: Failure
    Open --> Closed: Reset manually
    
    note right of Closed
        Normal operation
        Requests pass through
        Track failures
    end note
    
    note right of Open
        Circuit is open
        Fail fast
        No requests pass
    end note
    
    note right of Half_Open
        Limited requests
        Test service health
        Decide next state
    end note
```

## Retry Flow with Exponential Backoff

```mermaid
flowchart TD
    Start[Message Received] --> Process{Process Message}
    Process -->|Success| Complete[Mark Complete]
    Process -->|Failure| CheckRetry{Retry Count < Max?}
    
    CheckRetry -->|Yes| Wait[Wait: 2^n seconds]
    Wait --> Process
    
    CheckRetry -->|No| DLQ[Send to Dead Letter Queue]
    
    Complete --> End[End]
    DLQ --> End
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        subgraph "Kubernetes Cluster"
            subgraph "Services"
                AG1[API Gateway Pod 1]
                AG2[API Gateway Pod 2]
                US1[User Service Pod 1]
                US2[User Service Pod 2]
                ES1[Email Service Pod 1]
                ES2[Email Service Pod 2]
                PS1[Push Service Pod 1]
                PS2[Push Service Pod 2]
                TS1[Template Service Pod 1]
                TS2[Template Service Pod 2]
            end
            
            subgraph "Infrastructure"
                PG[PostgreSQL Cluster]
                Redis[Redis Cluster]
                MQ[RabbitMQ Cluster]
            end
        end
        
        subgraph "External Services"
            SMTP[SMTP Provider]
            FCM[Firebase]
        end
    end
    
    subgraph "CI/CD Pipeline"
        Git[Git Repository]
        CI[CI/CD Pipeline]
        Registry[Docker Registry]
    end
    
    Git --> CI
    CI --> Registry
    Registry --> Kubernetes
```

## Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        subgraph "Network Security"
            HTTPS[HTTPS/TLS]
            WAF[Web Application Firewall]
            DDoS[DDoS Protection]
        end
        
        subgraph "Application Security"
            Auth[Authentication]
            AuthZ[Authorization]
            Valid[Input Validation]
            Rate[Rate Limiting]
        end
        
        subgraph "Data Security"
            Encrypt[Encryption at Rest]
            Mask[Data Masking]
            Audit[Audit Logging]
        end
    end
    
    Client --> HTTPS
    HTTPS --> Auth
    Auth --> Valid
    Valid --> Encrypt
```

## Monitoring and Observability

```mermaid
graph TB
    subgraph "Monitoring Stack"
        subgraph "Metrics"
            Prometheus[Prometheus]
            Grafana[Grafana Dashboard]
        end
        
        subgraph "Logging"
            ELK[ELK Stack]
            Loki[Loki]
        end
        
        subgraph "Tracing"
            Jaeger[Jaeger]
            Zipkin[Zipkin]
        end
        
        subgraph "Alerting"
            AlertManager[Alert Manager]
            PagerDuty[PagerDuty]
        end
    end
    
    subgraph "Services"
        AG[API Gateway]
        US[User Service]
        ES[Email Service]
        PS[Push Service]
        TS[Template Service]
    end
    
    AG --> Prometheus
    US --> Prometheus
    ES --> Prometheus
    PS --> Prometheus
    TS --> Prometheus
    
    AG --> ELK
    US --> ELK
    ES --> ELK
    PS --> ELK
    TS --> ELK
    
    Prometheus --> Grafana
    ELK --> Loki
    Prometheus --> AlertManager
    AlertManager --> PagerDuty
```

## Performance Optimization Strategies

```mermaid
mindmap
  root((Performance))
    Database
      Connection Pooling
      Query Optimization
      Indexing Strategy
      Read Replicas
    Caching
      Redis Cluster
      Application Cache
      CDN
      Query Results
    Load Balancing
      Horizontal Scaling
      Auto-scaling
      Health Checks
      Circuit Breakers
    Message Queue
      Queue Partitioning
      Consumer Scaling
      Batch Processing
      Priority Queues
    Code Optimization
      Async Processing
      Memory Management
      CPU Profiling
      Bundle Optimization
```

## Development Workflow

```mermaid
gitgraph
    commit id: "Initial Setup"
    branch feature/api-gateway
    checkout feature/api-gateway
    commit id: "Basic Fastify Server"
    commit id: "Add Authentication"
    commit id: "Add Validation"
    checkout main
    merge feature/api-gateway
    
    branch feature/user-service
    checkout feature/user-service
    commit id: "Database Setup"
    commit id: "User CRUD"
    commit id: "Preferences"
    checkout main
    merge feature/user-service
    
    branch feature/email-service
    checkout feature/email-service
    commit id: "Queue Consumer"
    commit id: "SMTP Integration"
    commit id: "Template Processing"
    checkout main
    merge feature/email-service
    
    branch feature/push-service
    checkout feature/push-service
    commit id: "FCM Integration"
    commit id: "Push Processing"
    checkout main
    merge feature/push-service
    
    commit id: "Integration Testing"
    commit id: "Performance Tuning"
    commit id: "Production Deploy"