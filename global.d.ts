import { PrismaClient } from '@prisma/client'

declare global {
  // allow global `prisma` var
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}
