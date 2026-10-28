// Encounter events ("qí yù"). Each asks one question about a word you already know; the answer
// decides the reward. Wrong answers still teach the word (the review schedule updates).
// reward kinds: item (random unlocked item, optionally of the word's element) · ink · heal · maxHp · spellPower

export const EVENTS = [
  {
    id: 'lost_scribe',
    py: 'shū shēng', zh: '书生', title: 'The Lost Scribe',
    text: 'A scribe sits by the road, staring at a half-erased page. “I’ve forgotten what this word means. Can you help me?”',
    success: { text: 'The scribe beams and presses a trinket into your hand.', reward: { kind: 'item', ofWordElement: true } },
    failure: { text: 'You both stare at the page. The scribe thanks you anyway and shares some ink.', reward: { kind: 'ink', amount: 15 } },
  },
  {
    id: 'riddle_bridge',
    py: 'qiáo', zh: '桥', title: 'The Riddle Bridge',
    text: 'A stone bridge with a carved face rumbles: “Only those who know the word may cross for free.”',
    success: { text: 'The bridge laughs and showers you with ink.', reward: { kind: 'ink', amount: 45 } },
    failure: { text: 'The bridge sighs and charges a small toll of patience. You cross, slightly bruised.', reward: { kind: 'heal', pct: -0.05 } },
  },
  {
    id: 'tea_house',
    py: 'chá guǎn', zh: '茶馆', title: 'The Tea House',
    text: 'An old woman pours tea. “Tell me a word you know, and I’ll pour you something special.”',
    success: { text: 'The tea glows. You feel tougher.', reward: { kind: 'maxHp', amount: 12 } },
    failure: { text: 'She smiles and pours plain tea. It’s still lovely.', reward: { kind: 'heal', pct: 0.15 } },
  },
  {
    id: 'word_shrine',
    py: 'zì miào', zh: '字庙', title: 'A Shrine of Words',
    text: 'Faded characters float above an altar. One of them flickers, almost remembered.',
    success: { text: 'The word blazes back to life, and your spells resonate with it.', reward: { kind: 'spellPower', amount: 0.1 } },
    failure: { text: 'The word fades. You’ll recognise it next time.', reward: { kind: 'ink', amount: 10 } },
  },
  {
    id: 'fox_trader',
    py: 'hú li', zh: '狐狸', title: 'A Fox Trader',
    text: 'A fox in a merchant’s hat blocks the path. “Answer my question and you may pick from my sack.”',
    success: { text: 'The fox grins and hands over something shiny.', reward: { kind: 'item', ofWordElement: false } },
    failure: { text: 'The fox snickers and vanishes, leaving a few drops of ink behind.', reward: { kind: 'ink', amount: 10 } },
  },
];
