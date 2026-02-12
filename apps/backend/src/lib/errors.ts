import { FastifyReply } from "fastify";

export interface AppError {
  code: string;
  message: string;
  details?: unknown;
}

export function toErrorShape(error: AppError) {
  return { error };
}

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
) {
  return reply.status(statusCode).send(toErrorShape({ code, message, details }));
}
