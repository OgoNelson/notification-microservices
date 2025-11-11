import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { v4 as uuidv4 } from "uuid";
import {
  notificationRequestSchema,
  notificationResponseSchema,
  notificationStatusSchema,
  notificationStatusResponseSchema,
  notificationListResponseSchema,
  notificationListQuerySchema,
  notificationIdParamSchema,
} from "../schemas/notification";

// Type declarations for Fastify decorators
declare module "fastify" {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}

export default async function notificationRoutes(fastify: FastifyInstance) {
  // Create/send notification
  fastify.post(
    "/api/v1/notifications",
    {
      schema: {
        tags: ["Notifications"],
        description: "Create and send a notification",
        body: notificationRequestSchema,
        response: {
          200: notificationResponseSchema,
          400: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
              message: { type: "string" },
            },
          },
          401: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
              message: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
              message: { type: "string" },
            },
          },
          429: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
              message: { type: "string" },
            },
          },
          500: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const {
        notification_type,
        user_id,
        template_code,
        variables,
        request_id,
        priority = 5,
        metadata,
      } = request.body as any;

      try {
        // Check for idempotency - check if this request_id was already processed
        const existingNotification = await checkExistingNotification(
          request_id
        );
        if (existingNotification) {
          return {
            success: true,
            data: {
              notification_id: existingNotification.notification_id,
              status: existingNotification.status,
              queued_at: existingNotification.created_at,
              estimated_delivery: null,
            },
            message: "Notification already processed (idempotent request)",
          };
        }

        // Validate user exists and has preferences
        const user = await getUserById(user_id);
        if (!user) {
          reply.code(404);
          return {
            success: false,
            error: "User Not Found",
            message: `User with ID ${user_id} not found`,
          };
        }

        // Check user preferences for this notification type
        if (notification_type === "email" && !user.preferences.email) {
          return {
            success: true,
            data: {
              notification_id: uuidv4(),
              status: "skipped",
              queued_at: new Date().toISOString(),
              estimated_delivery: null,
            },
            message: "Notification skipped due to user preferences",
          };
        }

        if (notification_type === "push" && !user.preferences.push) {
          return {
            success: true,
            data: {
              notification_id: uuidv4(),
              status: "skipped",
              queued_at: new Date().toISOString(),
              estimated_delivery: null,
            },
            message: "Notification skipped due to user preferences",
          };
        }

        // Validate template exists
        const template = await getTemplateByCode(template_code);
        if (!template) {
          reply.code(400);
          return {
            success: false,
            error: "Template Not Found",
            message: `Template with code ${template_code} not found`,
          };
        }

        // Generate notification ID
        const notification_id = uuidv4();

        // Create notification record
        await createNotification({
          notification_id,
          request_id,
          user_id,
          notification_type,
          template_code,
          variables,
          priority,
          metadata,
          status: "pending",
        });

        // Queue notification for processing
        await queueNotification({
          notification_id,
          notification_type,
          user_id,
          template_code,
          variables,
          priority,
          metadata,
        });

        // Calculate estimated delivery time based on priority
        const estimatedDelivery = calculateEstimatedDelivery(priority);

        return {
          success: true,
          data: {
            notification_id,
            status: "queued",
            queued_at: new Date().toISOString(),
            estimated_delivery: estimatedDelivery,
          },
          message: "Notification queued successfully",
        };
      } catch (error: any) {
        fastify.log.error("Error creating notification:", error);
        reply.code(500);
        return {
          success: false,
          error: "Internal Server Error",
          message: "Failed to create notification",
        };
      }
    }
  );

  // Get notification status
  fastify.get(
    "/api/v1/notifications/:notification_id",
    {
      schema: {
        tags: ["Notifications"],
        description: "Get notification status by ID",
        params: notificationIdParamSchema,
        response: {
          200: notificationStatusResponseSchema,
          404: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
              message: { type: "string" },
            },
          },
          500: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { notification_id } = request.params as any;

      try {
        const notification = await getNotificationById(notification_id);

        if (!notification) {
          reply.code(404);
          return {
            success: false,
            error: "Not Found",
            message: `Notification with ID ${notification_id} not found`,
          };
        }

        return {
          success: true,
          data: notification,
          message: "Notification status retrieved successfully",
        };
      } catch (error: any) {
        fastify.log.error("Error getting notification status:", error);
        reply.code(500);
        return {
          success: false,
          error: "Internal Server Error",
          message: "Failed to retrieve notification status",
        };
      }
    }
  );

  // Update notification status (for webhooks from worker services)
  fastify.post(
    "/api/v1/notifications/:notification_id/status",
    {
      schema: {
        tags: ["Notifications"],
        description: "Update notification status (webhook endpoint)",
        params: notificationIdParamSchema,
        body: notificationStatusSchema,
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
              message: { type: "string" },
            },
          },
          500: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { notification_id } = request.params as any;
      const { status, timestamp, error } = request.body as any;

      try {
        const notification = await getNotificationById(notification_id);

        if (!notification) {
          reply.code(404);
          return {
            success: false,
            error: "Not Found",
            message: `Notification with ID ${notification_id} not found`,
          };
        }

        await updateNotificationStatus(notification_id, {
          status,
          timestamp: timestamp || new Date().toISOString(),
          error,
        });

        return {
          success: true,
          message: "Notification status updated successfully",
        };
      } catch (error: any) {
        fastify.log.error("Error updating notification status:", error);
        reply.code(500);
        return {
          success: false,
          error: "Internal Server Error",
          message: "Failed to update notification status",
        };
      }
    }
  );

  // List notifications
  fastify.get(
    "/api/v1/notifications",
    {
      schema: {
        tags: ["Notifications"],
        description: "List notifications with filtering and pagination",
        querystring: notificationListQuerySchema,
        response: {
          200: notificationListResponseSchema,
          500: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              error: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const {
        user_id,
        notification_type,
        status,
        page = 1,
        limit = 20,
        start_date,
        end_date,
      } = request.query as any;

      try {
        const result = await listNotifications({
          user_id,
          notification_type,
          status,
          page,
          limit,
          start_date,
          end_date,
        });

        return {
          success: true,
          data: result.notifications,
          message: "Notifications retrieved successfully",
          meta: {
            total: result.total,
            limit,
            page,
            total_pages: Math.ceil(result.total / limit),
            has_next: page < Math.ceil(result.total / limit),
            has_previous: page > 1,
          },
        };
      } catch (error: any) {
        fastify.log.error("Error listing notifications:", error);
        reply.code(500);
        return {
          success: false,
          error: "Internal Server Error",
          message: "Failed to retrieve notifications",
        };
      }
    }
  );
}

// Helper functions (these would typically be in a service layer)
async function checkExistingNotification(request_id: string): Promise<any> {
  // TODO: Implement Redis check for existing request_id
  return null;
}

async function getUserById(user_id: string): Promise<any> {
  // TODO: Implement user service call or database query
  return {
    user_id,
    name: "Test User",
    email: "test@example.com",
    preferences: {
      email: true,
      push: true,
    },
  };
}

async function getTemplateByCode(template_code: string): Promise<any> {
  // TODO: Implement template service call or database query
  return {
    template_code,
    subject: "Test Template",
    content: "Hello {{name}}",
  };
}

async function createNotification(notification: any): Promise<void> {
  // TODO: Implement database insertion
  console.log("Creating notification:", notification);
}

async function queueNotification(notification: any): Promise<void> {
  // TODO: Implement RabbitMQ message queuing
  console.log("Queueing notification:", notification);
}

function calculateEstimatedDelivery(priority: number): string {
  // Higher priority = faster delivery
  const delayMinutes = Math.max(1, 11 - priority) * 5;
  const estimated = new Date(Date.now() + delayMinutes * 60 * 1000);
  return estimated.toISOString();
}

async function getNotificationById(notification_id: string): Promise<any> {
  // TODO: Implement database query
  return {
    notification_id,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    notification_type: "email",
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sent_at: null,
    delivered_at: null,
    error: null,
    retry_count: 0,
  };
}

async function updateNotificationStatus(
  notification_id: string,
  statusUpdate: any
): Promise<void> {
  // TODO: Implement database update
  console.log("Updating notification status:", {
    notification_id,
    ...statusUpdate,
  });
}

async function listNotifications(
  filters: any
): Promise<{ notifications: any[]; total: number }> {
  // TODO: Implement database query with filters
  return {
    notifications: [],
    total: 0,
  };
}
