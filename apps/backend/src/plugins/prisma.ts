import type { FastifyInstance } from "fastify";
import { prisma } from "../prisma.js";

export async function prismaPlugin(fastify: FastifyInstance) {
  fastify.decorate("prisma", prisma);

  fastify.addHook("onClose", async (instance: FastifyInstance) => {
    await instance.prisma.$disconnect();
  });
}
