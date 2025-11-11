
import { FastifySchema } from 'fastify'

// User schemas following snake_case convention
export const userCreateSchema: FastifySchema = {
  type: 'object',
  properties: {
    name: { 
      type: 'string', 
      minLength: 1, 
      maxLength: 100,
      description: 'Full name of the user' 
    },
    email: { 
      type: 'string', 
      format: 'email',
      description: 'Email address for notifications' 
    },
    push_token: { 
      type: 'string', 
      nullable: true,
      description: 'Push notification token for mobile devices' 
    },
    preferences: {
      type: 'object',
      properties: {
        email: { type: 'boolean', default: true },
        push: { type: 'boolean', default: true }
      },
      required: ['email', 'push'],
      description: 'User notification preferences'
    },
    password: { 
      type: 'string', 
      minLength: 8, 
      maxLength: 128,
      description: 'User password'
    }
  },
  required: ['name', 'email', 'preferences', 'password'],
  additionalProperties: false
}

export const userUpdateSchema: FastifySchema = {
  type: 'object',
  properties: {
    name: { 
      type: 'string', 
      minLength: 1, 
      maxLength: 100,
      nullable: true
    },
    email: { 
      type: 'string', 
      format: 'email',
      nullable: true
    },
    push_token: { 
      type: 'string', 
      nullable: true
    },
    preferences: {
      type: 'object',
      properties: {
        email: { type: 'boolean', nullable: true },
        push: { type: 'boolean', nullable: true }
      },
      nullable: true
    }
  },
  additionalProperties: false
}

export const userResponseSchema: FastifySchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        user_id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        push_token: { type: 'string', nullable: true },
        preferences: {
          type: 'object',
          properties: {
            email: { type: 'boolean' },
            push: { type: 'boolean' }
          }
        },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    },
    message: { type: 'string' }
  }
}

export const userListResponseSchema: FastifySchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          user_id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          preferences: {
            type: 'object',
            properties: {
              email: { type: 'boolean' },
              push: { type: 'boolean' }
            }
          },
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

export const userLoginSchema: FastifySchema = {
  type: 'object',
  properties: {
    email: { 
      type: 'string', 
      format: 'email',
      description: 'User email address' 
    },
    password: { 
      type: 'string', 
      description: 'User password' 
    }
  },
  required: ['email', 'password'],
  additionalProperties: false
}

export const userLoginResponseSchema: FastifySchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        user_id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        preferences: {
          type: 'object',
          properties: {
            email: { type: 'boolean' },
            push: { type: 'boolean' }
          }
        },
        token: { type: 'string' },
        expires_at: { type: 'string', format: 'date-time' }
      }
    },
    message: { type: 'string' }
  }
}

export const passwordChangeSchema: FastifySchema = {
  type: 'object',
  properties: {
    current_password: { 
      type: 'string', 
      description: 'Current password' 
    },
    new_password: { 
      type: 'string', 
      minLength: 8, 
