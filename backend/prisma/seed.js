import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRICE_LIST = [
  { name: 'Bakar 1 klasa - guljeno uze', price: 16.0 },
  { name: 'Bakar 2 klasa - komadi, limovi, cijevi', price: 15.0 },
  { name: 'Bakar 3 klasa - paljeno uze, lak, zica', price: 14.0 },
  { name: 'Bronza', price: 9.0 },
  { name: 'Mesing caure (krupna i sitna)', price: 9.0 },
  { name: 'Mesing sakupljacki', price: 8.0 },
  { name: 'Mesing spon', price: 7.2 },
  { name: 'Hladnjak kombinovani', price: 6.0 },
  { name: 'Hladnjak Cu/Ms ocisceni', price: 7.0 },
  { name: 'Hladnjak aluminijski', price: 1.6 },
  { name: 'Kablovi aluminijski', price: 1.0 },
  { name: 'Kablovi bakarni neocisceni', price: 3.0 },
  { name: 'Olovo', price: 1.6 },
  { name: 'Cink', price: 1.6 },
  { name: 'Akumulatori bez kiseline', price: 1.0 },
  { name: 'Aluminijum meki i stranice', price: 2.0 },
  { name: 'Aluminijum tvrdi', price: 1.8 },
  { name: 'Al uze ocisceno', price: 2.5 },
  { name: 'Al uze neocisceno', price: 1.3 },
  { name: 'Zeljezo 1 klasa', price: 0.4 },
  { name: 'Zeljezo 2 klasa', price: 0.36 },
  { name: 'Zeljezo 3 klasa', price: 0.3 },
  { name: 'Prokrom', price: 1.3 },
  { name: 'Prokrom spena', price: 0.9 },
  { name: 'Al limenke', price: 1.6 },
  { name: 'Spijalter', price: 0.5 },
  { name: 'Al spena', price: 0.6 },
  { name: 'Zeljezna spena', price: 0.2 },
  { name: 'Al neocisceni', price: 0.8 },
  { name: 'Al profili neobojeni novi i stari', price: 2.5 },
  { name: 'Al profil sa termoprekidom', price: 2.0 },
  { name: 'Al felge', price: 3.0 },
  { name: 'Euro-palete', price: 10.0 },
  { name: 'Bronzana spena', price: 6.0 },
  { name: 'Elektro motori', price: 0.7 },
];

function inferMetalFamily(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('bakar')) return 'Bakar';
  if (n.includes('mesing')) return 'Mesing';
  if (n.includes('zeljezo')) return 'Zeljezo';
  if (n.includes('prokrom')) return 'Prokrom';
  if (n.includes('olovo')) return 'Olovo';
  if (n.includes('cink')) return 'Cink';
  if (n.includes('bronza')) return 'Bronza';
  if (n.includes('akumulator')) return 'Akumulatori';
  if (n.startsWith('al') || n.includes(' alumin') || n.includes('felge') || n.includes('limenke') || n.includes('kablovi alumin')) return 'Aluminijum';
  return 'Ostalo';
}

async function truncateAllExceptUsersAndCompanies() {
  const tables = await prisma.$queryRaw`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  `;
  const protectedTables = new Set(['User', 'Company', '_prisma_migrations']);
  const toTruncate = tables
    .map((row) => row.tablename)
    .filter((tableName) => !protectedTables.has(tableName));
  if (!toTruncate.length) return;
  const sql = `TRUNCATE TABLE ${toTruncate.map((name) => `"${name}"`).join(', ')} RESTART IDENTITY CASCADE;`;
  await prisma.$executeRawUnsafe(sql);
}

async function ensureDefaultCompanies() {
  await prisma.company.upsert({
    where: { code: 'PALE' },
    update: {},
    create: { code: 'PALE', name: 'Pale', type: 'Centrala', address: 'Industrijska zona bb, 71420 Pale' },
  });
  await prisma.company.upsert({
    where: { code: 'BL' },
    update: {},
    create: { code: 'BL', name: 'Banja Luka', type: 'Filiala', address: 'Ramici bb, 78000 Banja Luka' },
  });
  await prisma.company.upsert({
    where: { code: 'BIJ' },
    update: {},
    create: { code: 'BIJ', name: 'Bijeljina', type: 'Filiala', address: 'Ugljevik put bb, 76300 Bijeljina' },
  });
}

async function main() {
  await ensureDefaultCompanies();
  await truncateAllExceptUsersAndCompanies();

  const companies = await prisma.company.findMany({ select: { id: true, code: true } });

  let index = 1;
  for (const item of PRICE_LIST) {
    const code = `MAT-${String(index).padStart(3, '0')}`;
    const familyName = inferMetalFamily(item.name);
    // Za traženu hijerarhiju: "bakar u bakar", "mesing u mesing", "zeljezo u zeljezo"
    const categoryName = familyName;
    const subcategoryName = familyName;
    const category = await prisma.materialCategory.upsert({
      where: { name: categoryName },
      update: {},
      create: { name: categoryName },
    });
    const subcategory = await prisma.materialSubcategory.upsert({
      where: {
        categoryId_name: {
          categoryId: category.id,
          name: subcategoryName,
        },
      },
      update: {},
      create: {
        categoryId: category.id,
        name: subcategoryName,
      },
    });
    const material = await prisma.material.create({
      data: {
        code,
        name: item.name,
        category: `${categoryName} / ${subcategoryName}`,
        categoryId: category.id,
        subcategoryId: subcategory.id,
        baseUnit: 'KG',
        lmeLinked: false,
        basePrice: item.price,
        buyPrice: item.price,
        margin: 0,
      },
    });
    const baseVariant = await prisma.materialVariant.create({
      data: {
        materialId: material.id,
        grade: 'Osnovni kvalitet',
        condition: 'Standard',
        buyPrice: item.price,
        chemicalData: {},
      },
    });

    for (const company of companies) {
      await prisma.inventoryStock.create({
        data: {
          materialId: material.id,
          materialVariantId: baseVariant.id,
          zone: 'DEFAULT',
          stockKg: 0,
          avgBuyPrice: item.price,
          mktPrice: item.price,
          margin: 0,
          companyId: company.id,
        },
      });
    }

    index += 1;
  }

  console.log(`Seed completed: ${PRICE_LIST.length} materials inserted, users preserved.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
