// Encounters met while walking through an area. Everything here is data: the generator in
// game/run.js turns it into a hidden, pre-rolled sequence per area (saved with the run).
//
// ENCOUNTERS: display info per type (shown when the encounter appears, never in advance)
// AREA_PACING: how many of each type an area holds, by act ([min, max], or a chance for rare ones)
// STRANGERS: small Mandarin help quests. `template` is a puzzle from learn/signaturePuzzles.js, or
//   'vocab' for one question about a word the player has already met. All work without audio.

export const ENCOUNTERS = {
  battle: { py: 'zhàn dòu', zh: '战斗', en: 'Battle', combat: true },
  elite: { py: 'jīng yīng', zh: '精英', en: 'Elite', combat: true },
  merchant: { py: 'shāng rén', zh: '商人', en: 'Merchant' },
  chest: { py: 'bǎo xiāng', zh: '宝箱', en: 'Treasure chest' },
  stranger: { py: 'lù rén', zh: '路人', en: 'Stranger' },
  spring: { py: 'wēn quán', zh: '温泉', en: 'Hot spring' },
  shrine: { py: 'shén miào', zh: '神庙', en: 'Shrine' },
  guardian: { py: 'shǒu wèi', zh: '守卫', en: 'Guardian', combat: true, boss: true },
  boss: { py: 'dà wáng', zh: '大王', en: 'Boss', combat: true, boss: true },
  secretboss: { py: 'yù tù', zh: '玉兔', en: 'Moon Rabbit', combat: true },
};

// Starting values for each act's area. The generator rolls a count in each range, then arranges
// the encounters with pacing rules (see arrangeArea in run.js). The boss always comes last.
export const AREA_PACING = {
  1: { battle: [4, 6], elite: [0, 1], chest: [1, 2], merchant: [0, 1], stranger: [1, 2], spring: [0, 1], shrine: 0.15 },
  2: { battle: [4, 6], elite: [1, 2], chest: [1, 2], merchant: [1, 1], stranger: [0, 2], spring: [1, 1], shrine: 0.2 },
  3: { battle: [2, 3], elite: [0, 1], chest: [1, 1], merchant: [1, 1], stranger: [0, 1], spring: [1, 1], shrine: 0.25 },
  4: { battle: [3, 4], elite: [1, 2], chest: [1, 1], merchant: [1, 1], stranger: [0, 1], spring: [1, 1], shrine: 0.3 },
};

// Seconds of walking before each kind of encounter appears (rolled per encounter, then divided by
// the exploration speed setting). Fights come quickly; special discoveries take a little longer.
export const WALK_SECONDS = { battle: [5, 9], elite: [6, 10], default: [6, 12], boss: [8, 11] };

export const STRANGERS = [
  {
    id: 'farmer', py: 'nóng mín', zh: '农民', en: 'A worried farmer', npc: 'xinyi', template: 'fruit',
    text: '“My cart tipped over and I can’t remember what this fruit is called! Can you help me sort it?”',
    reward: { kind: 'ink', amount: 35 }, thanks: 'The farmer laughs with relief and pays you in ink.',
  },
  {
    id: 'scholar', py: 'shū shēng', zh: '书生', en: 'A forgetful scholar', npc: 'ruizhe', template: 'number',
    text: '“I’ve been counting all day and now the numbers have slipped out of my head. Which one is this?”',
    reward: { kind: 'item' }, thanks: 'The scholar bows and presses a curious trinket into your hands.',
  },
  {
    id: 'child', py: 'xiǎo hái', zh: '小孩', en: 'A curious child', npc: 'fuyun', template: 'body',
    text: 'A child points at a drawing in their book. “Dà gē gē, dà jiě jie, what’s this part called?”',
    reward: { kind: 'ink', amount: 30 }, thanks: 'The child giggles and gives you a handful of shiny ink drops.',
  },
  {
    id: 'spirit', py: 'yōu líng', zh: '幽灵', en: 'A shy spirit', npc: 'mei', template: 'negation',
    text: 'A pale spirit floats over a half-finished sentence. “I can’t rest until it’s said correctly…”',
    reward: { kind: 'item' }, thanks: 'The spirit smiles, fades, and leaves a gift where it hovered.',
  },
  {
    id: 'student', py: 'xué sheng', zh: '学生', en: 'A nervous student', npc: 'huojin', template: 'cheer',
    text: '“My exam is tomorrow and I’m so scared! Can you tell me only the encouraging words?”',
    reward: { kind: 'ink', amount: 40 }, thanks: 'The student stands a little taller and shares their lunch money with you.',
  },
  {
    id: 'traveller', py: 'lǚ kè', zh: '旅客', en: 'A lost traveller', npc: 'lei', template: 'tone',
    text: '“I asked for directions, but I keep mixing up the tones! Which way of saying it is right?”',
    reward: { kind: 'item' }, thanks: 'The traveller thanks you and hands over a souvenir from far away.',
  },
  {
    id: 'shopkeeper', py: 'diàn zhǔ', zh: '店主', en: 'A muddled shopkeeper', npc: 'xinyi', template: 'vocab',
    text: '“A customer asked for something and I’ve forgotten what the word means. Do you know it?”',
    reward: { kind: 'ink', amount: 30 }, thanks: 'The shopkeeper pays you for your help.',
  },
  {
    id: 'poet', py: 'shī rén', zh: '诗人', en: 'A wandering poet', npc: 'ruizhe', template: 'vocab',
    text: '“My poem is missing a word. I wrote it down but can’t recall its meaning. Help a poet out?”',
    reward: { kind: 'item' }, thanks: 'The poet recites a verse in your honour and gives you a keepsake.',
  },
];
export const STRANGER_CONSOLATION = { kind: 'ink', amount: 8, text: 'No harm done. They thank you for trying and share a little ink anyway.' };

// The merchant: one polished character for now (merchants can get their own looks and stock later).
export const MERCHANT = {
  py: 'hú li shāng rén', zh: '狐狸商人', en: 'Fox Merchant',
  hello: ['“Rare goods for brave travellers! Ink only, no haggling.”', '“Ah, a customer! Everything here was found on this very road.”', '“Psst. That one glows at night. Very lucky. Probably.”'],
  bye: '“Safe travels! The road ahead has teeth.”',
};
