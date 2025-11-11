// Notification schemas following snake_case convention

export const notificationRequestSchema = {
  type: 'object',
  properties: {
    notification_type: { 
      type: 'string', 
      enum: ['email', 'push'],
      description: 'Type of notification to send'
    },
    user_id: { 
      type: 'string', 
      format: 'uuid',
      description: 'Unique identifier for the user'
    },
    template_code: { 
      type: 'string',
      minLength: 1,
      maxLength: 100,
      description: 'Template identifier'
    },
    variables: { 
      type: 'object',
      description: 'Variables for template substitution',
      additionalProperties: true
    },
    request_id: { 
      type: 'string',
      minLength: 1,
      maxLength: 100,
      description: 'Unique request identifier for idempotency'
    },
    priority: { 
      type: 'integer',
      minimum: 1,
      maximum: 10,
      default: 5,
      description: 'Priority level (1-10, higher is more important)'
    },
    metadata: { 
      type: 'object',
      nullable: true,
      description: 'Additional metadata',
      additionalProperties: true
    }
  },
  required: ['notification_type', 'user_id', 'template_code', 'variables', 'request_id'],
  additionalProperties: false
}

export const notificationResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        notification_id: { type: 'string', format: 'uuid' },
        status: { type: 'string', enum: ['pending', 'queued', 'processing', 'sent', 'failed'] },
        queued_at: { type: 'string', format: 'date-time' },
        estimated_delivery: { type: 'string', format: 'date-time', nullable: true }
      }
    },
    error: { type: 'string', nullable: true },
    message: { type: 'string' }
  }
}

export const notificationStatusSchema = {
  type: 'object',
  properties: {
    notification_id: { 
      type: 'string', 
      format: 'uuid',
      description: 'Unique identifier for the notification'
    },
    status: { 
      type: 'string', 
      enum: ['delivered', 'pending', 'failed'],
      description: 'Current status of the notification'
    },
    timestamp: { 
      type: 'string', 
      format: 'date-time',
      nullable: true,
      description: 'Timestamp when status was updated'
    },
    error: { 
      type: 'string', 
      nullable: true,
      description: 'Error message if status is failed'
    }
  },
  required: ['notification_id', 'status'],
  additionalProperties: false
}

export const notificationStatusResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        notification_id: { type: 'string', format: 'uuid' },
        user_id: { type: 'string', format: 'uuid' },
        notification_type: { type: 'string', enum: ['email', 'push'] },
        status: { type: 'string', enum: ['pending', 'queued', 'processing', 'sent', 'delivered', 'failed'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        sent_at: { type: 'string', format: 'date-time', nullable: true },
        delivered_at: { type: 'string', format: 'date-time', nullable: true },
        error: { type: 'string', nullable: true },
        retry_count: { type: 'integer', minimum: 0 }
      }
    },
    message: { type: 'string' }
  }
}

export const notificationListResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          notification_id: { type: 'string', format: 'uuid' },
          user_id: { type: 'string', format: 'uuid' },
          notification_type: { type: 'string', enum: ['email', 'push'] },
          status: { type: 'string', enum: ['pending', 'queued', 'processing', 'sent', 'delivered', 'failed'] },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      }
    },
    message: { type: 'string' },
    meta: {
      type: 'object',
      properties: {
        total: { type: 'integer', minimum: 0 },
        limit: { type: 'integer', minimum: 1 },
        page: { type: 'integer', minimum: 1 },
        total_pages: { type: 'integer', minimum: 0 },
        has_next: { type: 'boolean' },
        has_previous: { type: 'boolean' }
      }
    }
  }
}

// Query parameters for listing notifications
export const notificationListQuerySchema = {
  type: 'object',
  properties: {
    user_id: { type: 'string', format: 'uuid' },
    notification_type: { type: 'string', enum: ['email', 'push'] },
    status: { type: 'string', enum: ['pending', 'queued', 'processing', 'sent', 'delivered', 'failed'] },
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    start_date: { type: 'string', format: 'date-time' },
    end_date: { type: 'string', format: 'date-time' }
  }
}

// Path parameters
export const notificationIdParamSchema = {
  type: 'object',
  properties: {
    notification_id: { type: 'string', format: 'uuid' }
  },
  required: ['notification_id']
}