import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import type { Script, Character } from '@botc/shared';
import { loadRoles } from '../data/roles.js';
import { loadNightOrder } from '../data/nightorder.js';
import { resolveIcon } from '../icons.js';

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

// Non-character steps that appear in the wake order.
const META: Record<string, { label: string; first?: string; other?: string }> = {
  dusk: {
    label: 'DUSK',
    first: 'Sunset. Let the players close their eyes.',
    other: 'Sunset. Let the players close their eyes.',
  },
  minioninfo: {
    label: 'MINION INFO',
    first:
      'If 7 or more players: wake the Minions. Show the "This is the Demon" token; point to the Demon.',
  },
  demoninfo: {
    label: 'DEMON INFO & BLUFFS',
    first:
      'If 7 or more players: wake the Demon. Show the "These are your Minions" tokens; point to each Minion. Show 3 good characters not in play as bluffs.',
  },
  dawn: {
    label: 'DAWN',
    first: 'Dawn. Wait a moment, then call for eyes open.',
    other: 'Dawn. Wait a moment, then call for eyes open.',
  },
};

/** Decode a `data:image/...;base64,...` URL into a Buffer, or null. */
function dataUrlToBuffer(url: string): Buffer | null {
  const m = /^data:[^;]+;base64,(.+)$/.exec(url);
  return m ? Buffer.from(m[1], 'base64') : null;
}

// Strip dataset markup from reminder text: ":reminder:" placeholders and
// "*WORD*" emphasis markers.
export const cleanReminder = (s: string): string =>
  s
    .replace(/:reminder:/g, '')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

/** Render a printable, official-style script roster (with night order) as a PDF. */
export async function renderScriptPdf(script: Script): Promise<Buffer> {
  const icons = new Map<string, Buffer | null>();
  await Promise.all(
    script.characters.map(async (c) => {
      // Homebrew uses its uploaded data-URL icon; official roles fetch by id.
      const buf =
        c.homebrew && c.icon?.startsWith('data:') ? dataUrlToBuffer(c.icon) : await resolveIcon(c.id);
      icons.set(c.id, buf);
    }),
  );

  const roleById = new Map(loadRoles().map((c) => [c.id, c]));
  const nightOrder = loadNightOrder();
  const scriptIds = new Set(script.characters.map((c) => c.id));

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

  // ---- helpers ----
  const charRow = (id: string, title: string, body: string, team: string) => {
    if (doc.y + 56 > bottom) doc.addPage();
    const y0 = doc.y;
    const icon = icons.get(id) ?? null;
    if (icon) {
      try {
        doc.image(icon, left, y0, { width: iconSize, height: iconSize });
      } catch {
        drawPlaceholder(doc, left, y0, iconSize, team);
      }
    } else {
      drawPlaceholder(doc, left, y0, iconSize, team);
    }
    const textX = left + iconSize + 12;
    const textW = right - textX;
    doc.fontSize(11.5).fillColor('#15171f').text(title, textX, y0, { width: textW });
    if (body) doc.fontSize(9.5).fillColor('#444444').text(body, textX, doc.y, { width: textW });
    doc.y = Math.max(y0 + iconSize, doc.y);
    doc.moveDown(0.5);
  };

  const metaRow = (label: string, body: string) => {
    if (doc.y + 44 > bottom) doc.addPage();
    doc.fontSize(11).fillColor('#7a5bd6').text(label, left, doc.y, { width: right - left });
    if (body) doc.fontSize(9.5).fillColor('#666666').text(body, left, doc.y, { width: right - left });
    doc.moveDown(0.5);
  };

  const sectionHeader = (text: string, color: string, space = 50) => {
    if (doc.y + space > bottom) doc.addPage();
    doc.moveDown(0.4);
    doc.fontSize(13).fillColor(color).text(text, left, doc.y);
    doc.moveDown(0.25);
  };

  const nightList = (ids: string[], kind: 'first' | 'other') => {
    for (const id of ids) {
      if (!META[id] && !scriptIds.has(id)) continue;
      const meta = META[id];
      if (meta) {
        metaRow(meta.label, (kind === 'first' ? meta.first : meta.other) ?? '');
        continue;
      }
      const c = roleById.get(id);
      if (!c) continue;
      const reminder = (kind === 'first' ? c.firstNightReminder : c.otherNightReminder) ?? '';
      charRow(id, c.name, cleanReminder(reminder), c.team);
    }
  };

  // ---- roster ----
  doc.fontSize(22).fillColor('#15171f').text(script.name, left, doc.y, { width: right - left });
  doc.moveDown(0.4);

  const groups = TEAM_ORDER.map((team) => ({
    team,
    chars: script.characters.filter((c) => c.team === team),
  })).filter((g) => g.chars.length > 0);

  for (const g of groups) {
    sectionHeader(`${TEAM_LABEL[g.team] ?? g.team} · ${g.chars.length}`, TEAM_COLOR[g.team] ?? '#333333');
    for (const c of g.chars as Character[]) charRow(c.id, c.name, c.ability, c.team);
  }

  // ---- night order ----
  doc.addPage();
  doc.fontSize(20).fillColor('#15171f').text('Night Order', left, doc.y);
  doc.moveDown(0.2);

  sectionHeader('First Night', '#15171f', 40);
  nightList(nightOrder.firstNight, 'first');

  sectionHeader('Other Nights', '#15171f', 40);
  nightList(nightOrder.otherNight, 'other');

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
  doc.circle(x + size / 2, y + size / 2, size / 2).fill(TEAM_COLOR[team] ?? '#888888');
  doc.restore();
}
