// The Stolen Words. Story beats unfold over many runs; each is shown once (save.adventure.storySeen).
// `key` words are shown pinyin-first so the story itself teaches a little vocabulary.

export const STORY = {
  intro: {
    title: 'The Stolen Words',
    key: { py: 'zì', zh: '字', en: 'word / character' },
    lines: [
      'Long ago the world was painted in words. Every river knew it was a river; every mountain knew its name.',
      'Then the Ink Dragon, mò lóng, swallowed the words, and the world began to fade into blank paper.',
      'Every word you learn is a word restored. Speak them, and they become magic.',
    ],
  },
  act2: {
    title: 'Colour Returns',
    key: { py: 'yán sè', zh: '颜色', en: 'colour' },
    lines: [
      'Beyond the first guardian the land is greyer, older. But where you walk, colour seeps back into the ink.',
      'Some paths only open for travellers who know the right word. Learn more, and more of the world will remember itself.',
    ],
  },
  lair: {
    title: "The Dragon's Lair",
    key: { py: 'lóng', zh: '龙', en: 'dragon' },
    lines: ['The air tastes of ink. Somewhere ahead, enormous wings rustle like a thousand turning pages.'],
  },
  dragon1: {
    title: 'The Dragon Falls',
    key: { py: 'shèng lì', zh: '胜利', en: 'victory' },
    lines: [
      'The Ink Dragon dissolves into a rain of letters. Words you have never heard drift back into the sky.',
      'But as the ink settles, you notice teeth marks on the edges of the words. Something has been eating them.',
    ],
  },
  dragon2: {
    title: 'Teeth Marks',
    key: { py: 'yá chǐ', zh: '牙齿', en: 'teeth' },
    lines: ['The dragon returns, weaker, frightened. It was not hoarding the words. It was hiding them from something.'],
  },
  dragon3: {
    title: 'Beyond the Lair',
    key: { py: 'yí wàng', zh: '遗忘', en: 'to forget' },
    lines: [
      'With its last breath the dragon opens a door behind its lair: the Forgotten Beyond.',
      'There lives the Word Eater, tūn zì shòu, who devours not just words but their meanings.',
      'From now on, after defeating the dragon, you may press on.',
    ],
  },
  beyond: {
    title: 'The Forgotten Beyond',
    key: { py: 'yì si', zh: '意思', en: 'meaning' },
    lines: ['Nothing here has a name. Shapes flicker between meanings. Hold on to your words; this place will try to take them.'],
  },
  wordeater: {
    title: 'Meaning Restored',
    key: { py: 'jì yì', zh: '记忆', en: 'memory' },
    lines: [
      'The Word Eater bursts, and a flood of meanings pours back into the world.',
      'Yet far away, a lantern flickers in an empty temple, and a rabbit made of moonlight is watching. The story is not over.',
    ],
  },
};
