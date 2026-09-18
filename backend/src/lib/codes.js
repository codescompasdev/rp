export function nextCode(prefix, lastNum) {
  const n = (lastNum || 0) + 1;
  return `${prefix}-${String(n).padStart(prefix === 'S' ? 4 : 3, '0')}`;
}

export async function getNextCode(prisma, model, prefix, field = 'code') {
  const items = await prisma[model].findMany({
    orderBy: { [field]: 'desc' },
    take: 1,
  });
  const last = items[0]?.[field] || '';
  const match = last.match(/(\d+)$/);
  const lastNum = match ? parseInt(match[1], 10) : 0;
  return nextCode(prefix, lastNum);
}
