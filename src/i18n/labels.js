// Pinyin-first UI labels, kept in one place so terminology stays consistent across the game.
// Each entry: py (shown large, with tone marks) · zh (optional, small) · en (smaller, secondary).
// Tones are dictionary (citation) tones, matching the vocabulary data.
// Use with <Bi k="victory" /> (components/Bi.jsx) or label('victory') for plain text.

export const LABELS = {
  victory: { py: 'shèng lì', zh: '胜利', en: 'Victory' },
  defeat: { py: 'shī bài', zh: '失败', en: 'Defeat' },
  continue: { py: 'jì xù', zh: '继续', en: 'Continue' },
  start: { py: 'kāi shǐ', zh: '开始', en: 'Start' },
  choose: { py: 'xuǎn zé', zh: '选择', en: 'Choose' },
  reward: { py: 'jiǎng lì', zh: '奖励', en: 'Reward' },
  skip: { py: 'tiào guò', zh: '跳过', en: 'Skip' },
  cancel: { py: 'qǔ xiāo', zh: '取消', en: 'Cancel' },
  replace: { py: 'tì huàn', zh: '替换', en: 'Replace' },
  equip: { py: 'zhuāng bèi', zh: '装备', en: 'Equip' },
  leave: { py: 'lí kāi', zh: '离开', en: 'Leave' },
  route: { py: 'lù xiàn', zh: '路线', en: 'Route' },
  map: { py: 'dì tú', zh: '地图', en: 'Map' },
  hero: { py: 'yīng xióng', zh: '英雄', en: 'Hero' },
  adventure: { py: 'mào xiǎn', zh: '冒险', en: 'Adventure' },
  spell: { py: 'fǎ shù', zh: '法术', en: 'Spell' },
  spells: { py: 'fǎ shù', zh: '法术', en: 'Spells' },
  signature: { py: 'jué zhāo', zh: '绝招', en: 'Signature' },
  pickup: { py: 'shí qǔ', zh: '拾取', en: 'Pickup' },
  empty: { py: 'kòng wèi', zh: '空位', en: 'Empty' },
  success: { py: 'chéng gōng', zh: '成功', en: 'Success' },
  fizzle: { py: 'shī bài', zh: '失败', en: 'Fizzle' },
  back: { py: 'fǎn huí', zh: '返回', en: 'Back' },
  home: { py: 'huí jiā', zh: '回家', en: 'Home' },
  items: { py: 'wù pǐn', zh: '物品', en: 'Items' },
  treasure: { py: 'bǎo xiāng', zh: '宝箱', en: 'Treasure' },
  learn: { py: 'xué xí', zh: '学习', en: 'Learn' },
  buy: { py: 'gòu mǎi', zh: '购买', en: 'Buy' },
  rest: { py: 'xiū xi', zh: '休息', en: 'Rest' },
  newSpell: { py: 'xīn fǎ shù', zh: '新法术', en: 'New spell' },
  boss: { py: 'shǒu lǐng', zh: '首领', en: 'Boss' },
  tryAgain: { py: 'zài lái', zh: '再来', en: 'Try again' },
  newRun: { py: 'xīn mào xiǎn', zh: '新冒险', en: 'New Run' },
  continueRun: { py: 'jì xù mào xiǎn', zh: '继续冒险', en: 'Continue Run' },
  abandonRun: { py: 'fàng qì mào xiǎn', zh: '放弃冒险', en: 'Abandon Run' },
  keepPlaying: { py: 'jì xù wán', zh: '继续玩', en: 'Keep Playing' },
  chooseHero: { py: 'xuǎn zé yīng xióng', zh: '选择英雄', en: 'Choose your hero' },
};

/** "py · English" as one plain string, for aria-labels and titles. */
export const label = (k) => (LABELS[k] ? `${LABELS[k].py} · ${LABELS[k].en}` : k);
