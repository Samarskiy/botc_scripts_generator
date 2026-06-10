import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import type { Script } from '@botc/shared';

const ICON_BASE =
  'https://raw.githubusercontent.com/bra1n/townsquare/develop/src/assets/icons/';
const FONT_PATH = fileURLToPath(new URL('../../assets/NotoSans-Regular.ttf', import.meta.url));

const TEAM_ORDER = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller', 'fabled', 'loric'];
const TEAM_LABEL: Record<string, string> = {
  townsfolk: 'Townsfolk',
  outsider: 'Outsiders',
  minion: 'Minions',
  demon: 'Demon',
  traveller: 'Travellers',
  fabled: 'Fabled',
  loric: 'Loric',
};
const TEAM_COLOR: Record<string, string> = {
  townsfolk: '#3b6fd6',
  outsider: '#2f9e63',
  minion: '#c8902f',
  demon: '#c0392b',
  traveller: '#7a7f95',
  fabled: '#7a7f95',
  loric: '#7a7f95',
};

// Icons are fetched once per process and memoised (null = unavailable).
const iconCache = new Map<string, Buffer | null>();
async function getIcon(id: string): Promise<Buffer | null> {
  if (iconCache.has(id)) return iconCache.get(id)!;
  let buf: Buffer | null = null;
  try {
    const res = await fetch(`${ICON_BASE}${id}.png`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) buf = Buffer.from(await res.arrayBuffer());
  } catch {
    /* fall back to placeholder */
  }
  iconCache.set(id, buf);
  return buf;
}

/** Render a printable, official-style script roster as a PDF buffer. */
export async function renderScriptPdf(script: Script): Promise<Buffer> {
  const icons = new Map<string, Buffer | null>();
  await Promise.all(script.characters.map(async (c) => icons.set(c.id, await getIcon(c.id))));

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.registerFont('noto', FONT_PATH);
  doc.font('noto');

  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const bottom = doc.page.height - doc.page.margins.bottom;
  const iconSize = 30;

  doc.fontSize(22).fillColor('#15171f').text(script.name, left, doc.y, { width: right - left });
  doc.moveDown(0.4);

  const groups = TEAM_ORDER.map((team) => ({
    team,
    chars: script.characters.filter((c) => c.team === team),
  })).filter((g) => g.chars.length > 0);

  for (const g of groups) {
    if (doc.y + 50 > bottom) doc.addPage();
    doc.moveDown(0.4);
    doc
      .fontSize(13)
      .fillColor(TEAM_COLOR[g.team] ?? '#333333')
      .text(`${TEAM_LABEL[g.team] ?? g.team} · ${g.chars.length}`, left, doc.y);
    doc.moveDown(0.25);

    for (const c of g.chars) {
      if (doc.y + 56 > bottom) doc.addPage();
      const y0 = doc.y;
      const icon = icons.get(c.id) ?? null;
      if (icon) {
        try {
          doc.image(icon, left, y0, { width: iconSize, height: iconSize });
        } catch {
          drawPlaceholder(doc, left, y0, iconSize, g.team);
        }
      } else {
        drawPlaceholder(doc, left, y0, iconSize, g.team);
      }

      const textX = left + iconSize + 12;
      const textW = right - textX;
      doc.fontSize(11.5).fillColor('#15171f').text(c.name, textX, y0, { width: textW });
      doc.fontSize(9.5).fillColor('#444444').text(c.ability, textX, doc.y, { width: textW });

      doc.y = Math.max(y0 + iconSize, doc.y);
      doc.moveDown(0.5);
    }
  }

  doc.end();
  return done;
}

function drawPlaceholder(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  size: number,
  team: string,
): void {
  doc.save();
  doc
    .circle(x + size / 2, y + size / 2, size / 2)
    .fill(TEAM_COLOR[team] ?? '#888888');
  doc.restore();
}
