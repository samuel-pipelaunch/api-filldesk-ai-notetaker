import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { validateParams, validateQuery } from '../../lib/validation.js';
import { MeetingService } from '../../services/meeting.service.js';

const userParamsSchema = z.object({
  userId: z.string().uuid(),
});

const meetingParamsSchema = z.object({
  userId: z.string().uuid(),
  meetingId: z.string().uuid(),
});

const listMeetingsQuerySchema = z
  .object({
    status: z.string().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
  })
  .strict();

export const userMeetingsRoute: FastifyPluginAsync = async (app): Promise<void> => {
  const meetingService = new MeetingService({ db: app.db });

  app.get('/:userId/meetings', async (request) => {
    const { userId } = validateParams(userParamsSchema, request.params);
    const query = validateQuery(listMeetingsQuerySchema, request.query);

    const result = await meetingService.listMeetings(userId, request.userContext.org.id, query);

    return {
      data: result.meetings,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
      },
    };
  });

  app.get('/:userId/meetings/stats', async (request) => {
    const { userId } = validateParams(userParamsSchema, request.params);
    return meetingService.getMeetingStats(userId, request.userContext.org.id);
  });

  app.get('/:userId/meetings/:meetingId', async (request) => {
    const { userId, meetingId } = validateParams(meetingParamsSchema, request.params);
    return meetingService.getMeeting(meetingId, userId);
  });
};
