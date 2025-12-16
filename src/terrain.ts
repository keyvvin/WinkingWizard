export type TerrainId =
  | 'wuste'
  | 'kueste'
  | 'wasser'
  | 'ebene'
  | 'sternenebene'
  | 'wald'
  | 'regenwald'
  | 'waldtempel'
  | 'sumpf'
  | 'berg'
  | 'bergkamm'
  | 'himmelberge'
  | 'geysir'
  | 'feuertempel'
  | 'spirit'
  | 'ruine'
  | 'tempelruine'
  | 'leer';

export type Terrain = {
  id: TerrainId;
  label: string;
  color?: string | null;
  image?: string;
  info?: string;
};

export const TERRAIN: Terrain[] = [
  { id: 'wuste', label: 'Wüste', color: '#C9B27B', info: 'Heiße Dünen und trockene Winde' },
  { id: 'kueste', label: 'Küste', color: '#3A9AB7', image: 'assets/tiles/coast.png', info: 'Sandiger Übergang zum Meer' },
  { id: 'wasser', label: 'Wasser', color: '#2F6E8E', info: 'Klare See mit kleiner Strömung' },
  { id: 'ebene', label: 'Ebene', color: '#7A8A5B', info: 'Weite Gräser und sanfte Hügel' },
  { id: 'sternenebene', label: 'Sternenebene', color: '#8B7CC9', image: 'assets/tiles/star plains.png', info: 'Felder unter leuchtendem Nachthimmel' },
  { id: 'wald', label: 'Wald', color: '#3E6B55', image: 'assets/tiles/forest.png', info: 'Dichter Wald mit hohen Kiefern' },
  { id: 'regenwald', label: 'Regenwald', color: '#2F7A5A', image: 'assets/tiles/rainforest.png', info: 'Feuchte, dichte Vegetation' },
  { id: 'waldtempel', label: 'Waldtempel', color: '#5F7D5F', image: 'assets/tiles/forest temple.png', info: 'Verwachsener Tempel im Grün' },
  { id: 'sumpf', label: 'Sumpf', color: '#4E5B49', image: 'assets/tiles/swamp.png', info: 'Nebliger Morast mit Tümpeln' },
  { id: 'berg', label: 'Berg', color: '#6A6F7B', image: 'assets/tiles/mountain.png', info: 'Felsige Steilhänge' },
  { id: 'bergkamm', label: 'Bergkamm', color: '#747A88', image: 'assets/tiles/mountain2.png', info: 'Karger Grat mit Geröll' },
  { id: 'himmelberge', label: 'Himmelsberge', color: '#9AB4D9', image: 'assets/tiles/heavenly mountains.png', info: 'Helle Gipfel über den Wolken' },
  { id: 'geysir', label: 'Geysir', color: '#4CA3D9', image: 'assets/tiles/geysir.png', info: 'Sprudelnde Quelle mit Dampf' },
  { id: 'feuertempel', label: 'Feuertempel', color: '#C26A3F', image: 'assets/tiles/fire temple.png', info: 'Glühender Tempel im Lavastrom' },
  { id: 'spirit', label: 'Spirit', color: '#8C6DB6', info: 'Schimmernde Geisterlande' },
  { id: 'ruine', label: 'Ruine', color: '#9A8A7A', image: 'assets/tiles/ancient ruine.png', info: 'Alte Mauern voller Geheimnisse' },
  { id: 'tempelruine', label: 'Tempelruine', color: '#BFA56A', image: 'assets/tiles/temple ruin.png', info: 'Eingestürzter Tempelkomplex' },
  { id: 'leer', label: 'Leer', color: null, image: 'assets/tiles/leer.png', info: 'Kein Terrain' }
];

export const TERRAIN_BY_ID = new Map(TERRAIN.map(t => [t.id, t] as const));
