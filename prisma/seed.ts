import { PrismaClient, PlanCode } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const plans = [
    { code: PlanCode.INFORME, name: "Informe", priceClp: 4990, interval: "one_shot" },
    { code: PlanCode.PRO, name: "Pro", priceClp: 14990, interval: "month" },
    { code: PlanCode.CUMPLIMIENTO, name: "Cumplimiento", priceClp: 34990, interval: "month" },
    { code: PlanCode.AGENCIA, name: "Agencia", priceClp: 0, interval: "month" },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      create: plan,
      update: { name: plan.name, priceClp: plan.priceClp, interval: plan.interval },
    });
  }

  await prisma.retentionPolicy.upsert({
    where: { name: "consent_logs" },
    create: {
      name: "consent_logs",
      days: Number(process.env.CONSENT_RETENTION_DAYS || 365),
      description:
        "Logs de consentimiento: site_key, decisión, versión banner, IP truncada hasheada, UA.",
    },
    update: {
      days: Number(process.env.CONSENT_RETENTION_DAYS || 365),
    },
  });

  console.log("Seed OK: planes + retención");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
