/**
 * Filtre basique FR/EN pour les chats.
 * Liste non exhaustive — à enrichir côté admin plus tard.
 */
const BLOCKED = [
  'pute',
  'putain',
  'salope',
  'connard',
  'connasse',
  'enculé',
  'encule',
  'pd',
  'fdp',
  'ntm',
  'nique',
  'niquer',
  'bite',
  'couille',
  'trou du cul',
  'ta gueule',
  'tg',
  'fils de pute',
  'salaud',
  'salope',
  'batard',
  'bâtard',
  'idiot',
  'debile',
  'débile',
  'mongol',
  'fuck',
  'fucking',
  'shit',
  'asshole',
  'bitch',
  'bastard',
  'cunt',
  'dick',
  'motherfucker',
  'nigga',
  'nigger',
  'retard',
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[*$._]/g, '');
}

export type ProfanityCheck = {
  ok: boolean;
  /** Message utilisateur si bloqué */
  error?: string;
  /** Version censurée (si on voulait masquer plutôt que bloquer) */
  censored: string;
};

/** Bloque l’envoi si un mot interdit est détecté. */
export function checkChatMessage(text: string): ProfanityCheck {
  const raw = text.trim();
  if (!raw) {
    return { ok: false, error: 'Message vide.', censored: '' };
  }

  const norm = ` ${normalize(raw)} `;
  const hit = BLOCKED.find((word) => {
    const w = normalize(word);
    if (w.includes(' ')) return norm.includes(` ${w} `) || norm.includes(w);
    const re = new RegExp(`(?:^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^a-z0-9])`, 'i');
    return re.test(norm);
  });

  if (hit) {
    return {
      ok: false,
      error:
        'Message refusé : langage insultant ou interdit. Garde un ton respectueux sur Jumelo.',
      censored: raw.replace(new RegExp(hit, 'gi'), '***'),
    };
  }

  return { ok: true, censored: raw };
}
