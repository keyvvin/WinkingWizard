import { TerrainId } from './terrain';

export type Affinity = Exclude<TerrainId, 'leer'> | 'neutral';

export type Card = {
  id: string;
  name: string;
  cost: number;
  affinity?: Affinity;
  text?: string;
};

export type CardZones = {
  deck: Card[];
  hand: Card[];
  discard: Card[];
};

export const CARD_LIBRARY: Record<string, Card> = {
  'sapling-spirit': { id: 'sapling-spirit', name: 'Sapling Spirit', cost: 2, affinity: 'wald', text: 'Beschwöre einen 1/1 Waldgeist. Kosten -1 pro Wald in Reichweite.' },
  'lava-surge': { id: 'lava-surge', name: 'Lava Surge', cost: 4, affinity: 'berg', text: 'Füge 3 Schaden an einer Einheit oder einem Spieler zu.' },
  'tidal-pull': { id: 'tidal-pull', name: 'Tidal Pull', cost: 3, affinity: 'wasser', text: 'Verschiebe eine Einheit um 1 Hex in Richtung Wasser.' },
  'stone-guard': { id: 'stone-guard', name: 'Stone Guard', cost: 3, affinity: 'ebene', text: '2/3 Wächter. Kosten -1 wenn angrenzend an Ebene.' },
  'bog-lurker': { id: 'bog-lurker', name: 'Bog Lurker', cost: 2, affinity: 'sumpf', text: '1/4 Tarnung auf Sumpf.' },
  'geyser-mage': { id: 'geyser-mage', name: 'Geysir-Mage', cost: 4, affinity: 'geysir', text: 'Ziehe 1 Karte. Wenn Geysir in Reichweite, ziehe 2.' },
  'plain-rider': { id: 'plain-rider', name: 'Plain Rider', cost: 1, affinity: 'ebene', text: 'Eilige 1/1. +1/+0 wenn auf Ebene gespielt.' },
  'sand-djinn': { id: 'sand-djinn', name: 'Sand Djinn', cost: 3, affinity: 'wuste', text: 'Fliegend 2/2. Erhalte +1 Ausweichen in Wüste.' },
  'spirit-beacon': { id: 'spirit-beacon', name: 'Spirit Beacon', cost: 2, affinity: 'spirit', text: 'Permanent: Affinitätskarten kosten 1 weniger, einmal pro Zug.' }
};

export function cardFromId(id: string): Card {
  return CARD_LIBRARY[id] ?? { id, name: id, cost: 1, affinity: 'neutral', text: 'Custom Card' };
}

export function shuffle(deck: Card[]): Card[] {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createDemoDeck(): Card[] {
  const ids: string[] = [
    'sapling-spirit', 'sapling-spirit',
    'lava-surge',
    'tidal-pull',
    'stone-guard',
    'bog-lurker',
    'geyser-mage',
    'plain-rider', 'plain-rider',
    'sand-djinn',
    'spirit-beacon'
  ];
  return shuffle(ids.map(cardFromId));
}
