import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcrypt'
import {
  userCreateSchema,
  userResponseSchema,
  userUpdateSchema,
  userLoginSchema,
  userLoginResponseSchema,
  passwordChangeSchema,
  userListResponseSchema,
  userListQuerySchema,
  userIdParamSchema
} from '../schemas/user'

// Type declarations for Fastify decorators
declare module 'fastify' {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>
  }
}

export default async function userRoutes(fastify: FastifyInstance) {
  // Create user
  fastify.post('/users', {
    schema: {
      tags: ['Users'],
      description: 'Create a new user',
      body: userCreateSchema,
      response: {
        201: userResponseSchema,
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        409: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    },
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { name, email, push_token, preferences, password } = request.body as any
    
    try {
      // Check if user already exists by email
      const existingUser = await getUserByEmail(email)
      if (existingUser) {
        reply.code(409)
        return {
          success: false,
          error: 'Conflict',
          message: 'User with this email already exists'
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)
      
      // Generate user ID
      const user_id = uuidv4()
      
      // Create user
      await createUser({
        user_id,
        name,
        email,
        push_token,
        preferences,
        password: hashedPassword
      })
      
      return {
        success: true,
        data: {
          user_id,
          name,
          email,
          preferences,
          created_at: new Date().toISOString()
        },
        message: 'User created successfully'
      }
    } catch (error: any) {
      fastify.log.error('Error creating user:', error)
      reply.code(500)
      return {
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to create user'
      }
    }
  })

  // Get user by ID
  fastify.get('/users/:user_id', {
    schema: {
      tags: ['Users'],
      description: 'Get user by ID',
      params: userIdParamSchema,
      response: {
        200: userResponseSchema,
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    },
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { user_id } = request.params as any
    
    try {
      const user = await getUserById(user_id)
      
      if (!user) {
        reply.code(404)
        return {
          success: false,
          error: 'Not Found',
          message: `User with ID ${user_id} not found`
        }
      }
      
      return {
        success: true,
        data: user,
        message: 'User retrieved successfully'
      }
    } catch (error: any) {
      fastify.log.error('Error getting user:', error)
      reply.code(500)
      return {
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve user'
      }
    }
  })

  // Update user
  fastify.put('/users/:user_id', {
    schema: {
      tags: ['Users'],
      description: 'Update user information',
      params: userIdParamSchema,
      body: userUpdateSchema,
      response: {
        200: userResponseSchema,
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    },
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { user_id } = request.params as any
    const { name, email, push_token, preferences } = request.body as any
    
    try {
      // Check if user exists
      const existingUser = await getUserById(user_id)
      
      if (!existingUser) {
        reply.code(404)
        return {
          success: false,
          error: 'Not Found',
          message: `User with ID ${user_id} not found`
        }
      }
      
      // Update user
      await updateUser(user_id, {
        name,
        email,
        push_token,
        preferences
      })
      
      return {
        success: true,
        data: {
          user_id,
          name,
          email,
          push_token,
          preferences,
          updated_at: new Date().toISOString()
        },
        message: 'User updated successfully'
      }
    } catch (error: any) {
      fastify.log.error('Error updating user:', error)
      reply.code(500)
      return {
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to update user'
      }
    }
  })

  // User login
  fastify.post('/users/login', {
    schema: {
      tags: ['Users'],
      description: 'User login',
      body: userLoginSchema,
      response: {
        200: userLoginResponseSchema,
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as any
    
    try {
      // Get user by email
      const user = await getUserByEmail(email)
      
      if (!user) {
        reply.code(401)
        return {
          success: false,
          error: 'Unauthorized',
          message: 'Invalid email or password'
        }
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password)
      
      if (!isPasswordValid) {
        reply.code(401)
        return {
          success: false,
          error: 'Unauthorized',
          message: 'Invalid email or password'
        }
      }
      
      // Generate JWT token (simplified - in real app, use fastify-jwt)
      const token = Buffer.from(`${user.user_id}:${Date.now() + 86400000}`).toString('base64')
      
      return {
        success: true,
        data: {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          preferences: user.preferences,
          token,
          expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hour expiry
        },
        message: 'Login successful'
      }
    } catch (error: any) {
      fastify.log.error('Error during login:', error)
      reply.code(500)
      return {
        success: false,
        error: 'Internal Server Error',
        message: 'Login failed'
      }
    }
  })

  // Change password
  fastify.post('/users/change-password', {
    schema: {
      tags: ['Users'],
      description: 'Change user password',
      body: passwordChangeSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    },
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { user_id } = request.params as any
    const { current_password, new_password } = request.body as any
    
    try {
      // Get user
      const user = await getUserById(user_id)
      
      if (!user) {
        reply.code(404)
        return {
          success: false,
          error: 'Not Found',
          message: `User with ID ${user_id} not found`
        }
      }
      
      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password)
      
      if (!isCurrentPasswordValid) {
        reply.code(400)
        return {
          success: false,
          error: 'Invalid Current Password',
          message: 'Current password is incorrect'
        }
      }
      
      // Hash new password
      const hashedNewPassword = await bcrypt.hash(new_password, 10)
      
      // Update password
      await updateUser(user_id, { password: hashedNewPassword })
      
      return {
        success: true,
        message: 'Password changed successfully'
      }
    } catch (error: any) {
      fastify.log.error('Error changing password:', error)
      reply.code(500)
      return {
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to change password'
      }
    }
  })

  // List users
  fastify.get('/users', {
    schema: {
      tags: ['Users'],
      description: 'List users with filtering and pagination',
      querystring: userListQuerySchema,
      response: {
        200: userListResponseSchema,
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    },
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const {
      page = 1,
      limit = 20,
      search,
      email_enabled,
      push_enabled,
      created_after,
      created_before
    } = request.query as any
    
    try {
      const result = await listUsers({
        page,
        limit,
        search,
        email_enabled,
        push_enabled,
        created_after,
        created_before
      })
      
      return {
        success: true,
        data: result.users,
        message: 'Users retrieved successfully',
        meta: {
          total: result.total,
          limit,
          page,
          total_pages: Math.ceil(result.total / limit),
          has_next: page < Math.ceil(result.total / limit),
          has_previous: page > 1
        }
      }
    } catch (error: any) {
      fastify.log.error('Error listing users:', error)
      reply.code(500)
      return {
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve users'
      }
    }
  })
}

// Helper functions (these would typically be in a service layer)
async function getUserByEmail(email: string): Promise<any> {
  // TODO: Implement database query
  return null
}

async function getUserById(user_id: string): Promise<any> {
  // TODO: Implement database query
  return {
    user_id,
    name: 'Test User',
    email: 'test@example.com',
    preferences: {
      email: true,
      push: true
    },
    password: '$2a$10$12$5$6$7$8$9$4$3$2$7' // bcrypt hash of 'password'
  }
}

async function createUser(user: any): Promise<void> {
  // TODO: Implement database insertion
  console.log('Creating user:', user)
}

async function updateUser(user_id: string, updates: any): Promise<void> {
  // TODO: Implement database update
  console.log('Updating user:', { user_id, ...updates })
}

async function listUsers(filters: any): Promise<{ users: any[], total: number }> {
  // TODO: Implement database query with filters
  return {
    users: [],
    total: 0
  }
}