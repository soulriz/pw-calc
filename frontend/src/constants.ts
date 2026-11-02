import type { StatKey } from './types';

// refine multipliers +0…+12
export const REF = [0, 1, 2, 3.05, 4.3, 5.75, 7.55, 9.95, 13.05, 17.05, 22.3, 29, 37.5];

export const STAT_KEYS: StatKey[] = ['vit', 'str', 'int', 'dex'];
export const STAT_NAME: Record<StatKey, string> = { vit: 'Витривалість', str: 'Сила', int: 'Інтелект', dex: 'Спритність' };
export const ABBR: Record<StatKey, string> = { vit: 'Витр', int: 'Інтл', str: 'Сила', dex: 'Спрт' };
export const REQ_SHORT: Record<StatKey, string> = { str: 'сила', dex: 'спритність', int: 'інтелект', vit: 'витривалість' };
export const REQ_GAME: Record<StatKey, string> = { str: 'Необхідна сила', dex: 'Необхідна спритність', int: 'Необхідний інтелект', vit: 'Необхідна статура' };

export interface ClassDef {
  name: string;
  /** HP per vitality / per level, MP per intellect / per level */
  hpV: number; hpL: number; mpI: number; mpL: number;
  /** base run speed, accuracy and evasion per dexterity */
  run: number; acc: number; eva: number;
  /** share of level in physical / magic attack */
  pL: number; mL: number;
  magic?: boolean;
}

// coefficients from mypers.world (the server's six classes)
export const CLASSES: Record<string, ClassDef> = {
  warrior: { name: 'Воїн', hpV: 15, hpL: 30, mpI: 9, mpL: 18, run: 5.0, acc: 10, eva: 10, pL: 1, mL: 0.0095 },
  mage: { name: 'Чарівник', hpV: 10, hpL: 20, mpI: 14, mpL: 28, run: 4.8, acc: 5, eva: 2, pL: 0.21, mL: 1, magic: true },
  archer: { name: 'Лучник', hpV: 13, hpL: 26, mpI: 11, mpL: 22, run: 5.2, acc: 8, eva: 6, pL: 1, mL: 0.0095 },
  priest: { name: 'Жрець', hpV: 10, hpL: 20, mpI: 14, mpL: 28, run: 4.8, acc: 5, eva: 2, pL: 0.21, mL: 1, magic: true },
  beast: { name: 'Перевертень', hpV: 17, hpL: 34, mpI: 7, mpL: 14, run: 4.9, acc: 8, eva: 8, pL: 1, mL: 0.0095 },
  druid: { name: 'Друїд', hpV: 12, hpL: 24, mpI: 12, mpL: 24, run: 5.1, acc: 7, eva: 6, pL: 0.6, mL: 0.6 },
};

// bit of each class in the item class mask (order of professions in the client)
export const CLASS_BIT: Record<string, number> = { warrior: 0, mage: 1, druid: 3, beast: 4, archer: 6, priest: 7 };
export const CLASS_NAMES = ['Воїн', 'Чарівник', 'Шаман', 'Друїд', 'Перевертень', 'Вбивця', 'Лучник', 'Жрець', 'Страж', 'Містик', 'Примара', 'Жнець'];
export const CLASS_ICON: Record<string, string> = { warrior: '🪓', mage: '🔥', archer: '🏹', priest: '✨', beast: '🐯', druid: '🦊' };

export interface SlotDef { id: string; type?: string; name: string; title?: string; x: number; y: number; off?: boolean; img?: string }

// the 24 cells of the game inventory window (coordinates from interfaces/inventory_m.xml)
export const SLOTS: SlotDef[] = [
  { id: 'charm_hp', name: 'Талісман ЖС', x: 15, y: 66, off: true },
  { id: 'charm_mp', name: 'Талісман МЕ', x: 53, y: 66, off: true },
  { id: 'wings', name: 'Крила', x: 91, y: 66, off: true },
  { id: 'necklace', type: 'necklace', name: 'Намисто', x: 15, y: 111 },
  { id: 'cloak', type: 'cloak', name: 'Плащ', x: 53, y: 111 },
  { id: 'book', type: 'book', name: 'Трактат', x: 91, y: 111, img: 'tome' },
  { id: 'wrists', type: 'wrists', name: 'Наручі', x: 15, y: 156 },
  { id: 'belt', type: 'belt', name: 'Пояс', x: 53, y: 156 },
  { id: 'tome', type: 'tome', name: 'Збірник цитат', x: 91, y: 156, img: 'pouch' },
  { id: 'ring1', type: 'ring', name: 'Кільце', title: 'Перше кільце', x: 15, y: 201 },
  { id: 'ring2', type: 'ring', name: 'Кільце', title: 'Друге кільце', x: 53, y: 201 },
  { id: 'genie', name: 'Джин', x: 91, y: 201, off: true },
  { id: 'voucher', name: 'Квитанція', x: 204, y: 66, off: true },
  { id: 'token', name: 'Знак фракції', x: 204, y: 111, off: true },
  { id: 'itemskill', name: 'Вміння предмета', x: 204, y: 156, off: true },
  { id: 'astrolabe', name: 'Зоряна карта', x: 204, y: 201, off: true },
  { id: 'helmet', type: 'helmet', name: 'Шолом', x: 242, y: 66 },
  { id: 'armor', type: 'armor', name: 'Броня', x: 242, y: 111 },
  { id: 'pants', type: 'pants', name: 'Штани', x: 242, y: 156 },
  { id: 'boots', type: 'boots', name: 'Взуття', x: 242, y: 201 },
  { id: 'horn', name: 'Ріг', x: 280, y: 66, off: true },
  { id: 'charm', name: 'Оберіг', x: 280, y: 111, off: true },
  { id: 'weapon', type: 'weapon', name: 'Зброя', x: 280, y: 156 },
  { id: 'ammo', name: 'Боєприпаси', x: 280, y: 201, off: true },
];
export const ACTIVE_SLOTS = SLOTS.filter(s => !s.off);
export const SLOT = Object.fromEntries(SLOTS.map(s => [s.id, s])) as Record<string, SlotDef>;
export const TYPE_NAME: Record<string, string> = {
  helmet: 'Шолом', necklace: 'Намисто', cloak: 'Плащ', belt: 'Пояс', armor: 'Броня', pants: 'Штани', wrists: 'Наручі',
  boots: 'Взуття', ring: 'Кільце', tome: 'Збірник цитат', book: 'Трактат', weapon: 'Зброя',
};

export const RANGED = ['Лук', 'Арбалет', 'Праща']; // physical attack scales with dexterity
export const FIST = { pmin: 0, pmax: 0, mmin: 0, mmax: 0, speed: 1.25, sub: '', maj: '' };

// stats a user can add to an item by hand
export const CUSTOM: Record<string, string> = {
  patk: 'Фізична атака', patkMax: 'Макс. фізична атака', pct_patk: 'Фізична атака %', matk: 'Магічна атака',
  matkMax: 'Макс. магічна атака', pct_matk: 'Магічна атака %', pdef: 'Фізичний захист', pct_pdef: 'Фізичний захист %',
  mdef: 'Захист від стихій (усіх)', pct_mdef: 'Захист від стихій %', eMetal: 'Захист від металу', eWood: 'Захист від дерева',
  eWater: 'Захист від води', eFire: 'Захист від вогню', eEarth: 'Захист від землі', hp: "Здоров'я", pct_hp: "Здоров'я %",
  mp: 'Мана', pct_mp: 'Мана %', str: 'Сила', dex: 'Спритність', int: 'Інтелект', vit: 'Статура',
  crit: 'Шанс крит. удару %', critDmg: 'Крит. шкода %', acc: 'Влучність', pct_acc: 'Влучність %', eva: 'Ухилення',
  pct_eva: 'Ухилення %', pct_aspd: 'Швидкість атаки %', speed: 'Швидкість руху', pct_speed: 'Швидкість руху %',
  aspdIv: 'Інтервал атаки, −сек', cast: 'Час співу −%', physRed: 'Зменшення фіз. шкоди %', magRed: 'Зменшення маг. шкоди %',
  atkLvl: 'Показник атаки', defLvl: 'Показник захисту', soul: 'Сила духу', pPen: 'Фізичне пробивання',
  mPen: 'Магічне пробивання', dmgMon: 'Шкода монстрам', defMon: 'Захист від монстрів',
};

export const BUFF_TYPES = { rs: 'Світл.', je: 'Темн.' } as const;
export const INV_MAX = 48;
export const MAX_LEVEL = 105;
export const STORAGE_KEY = 'pw-calc-web-v1';
