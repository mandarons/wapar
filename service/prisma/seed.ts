import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

const main = async () => {
  await prisma.installation.createMany({
    data: [
      {
        appName: 'icloud-drive-docker',
        appVersion: '1.0.0',
        ipAddress: '1.2.3.4',
      },
      {
        appName: 'ha-bouncie',
        appVersion: '1.0.0',
        ipAddress: '5.6.7.8',
      },
    ],
  });
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
