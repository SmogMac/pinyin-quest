// Character signature puzzles. Every hero always plays the same kind of Mandarin minigame (Xinyi
// names fruit, Mei reads number words, Lei hears tones…); only the question changes. Pure logic: the UI
// lives in components/SignaturePuzzle.jsx and the combat effect in game/data/signatures.js.
//
// A template has:   pool (curated, verified vocabulary) · generate({ save, rng, last, soundless, level })
//                    → puzzle · check(puzzle, answer) → boolean
//
// Ascension (`level` 0–10) makes the same minigame harder without changing its kind: entries carry
// a `tier` (0 from the start, 1 from Ascension 3, 2 from Ascension 6; numbers step up more finely).
// A word the player hasn't met yet is always taught on the spot first (teach mode), never tested.
// A puzzle has:      { template, kind: 'choice' | 'multi' | 'blank', prompt, options, answer,
//                      words (zh of every word practised), teach (first meeting: answer shown),
//                      choice (passed to the combat effect, e.g. the fruit that was named) }
//
// Pinyin is written the standard way (syllables of one word joined) with dictionary tones.
// Hanzi is always optional and secondary: no puzzle ever needs it.
import { baseOf, toneOf, withTone } from './pinyinTools.js';

// ------------------------------------------------------------------ vocabulary pools
export const FRUITS = [
  { id: 'apple', zh: '苹果', py: 'píngguǒ', en: 'apple', emoji: '🍎' },
  { id: 'banana', zh: '香蕉', py: 'xiāngjiāo', en: 'banana', emoji: '🍌' },
  { id: 'orange', zh: '橘子', py: 'júzi', en: 'orange (tangerine)', emoji: '🍊' },
  { id: 'grape', zh: '葡萄', py: 'pútao', en: 'grape', emoji: '🍇' },
  { id: 'watermelon', zh: '西瓜', py: 'xīguā', en: 'watermelon', emoji: '🍉' },
  { id: 'strawberry', zh: '草莓', py: 'cǎoméi', en: 'strawberry', emoji: '🍓' },
  { id: 'mango', zh: '芒果', py: 'mángguǒ', en: 'mango', emoji: '🥭' },
  { id: 'pear', zh: '梨', py: 'lí', en: 'pear', emoji: '🍐' },
  { id: 'peach', zh: '桃子', py: 'táozi', en: 'peach', emoji: '🍑' },
  { id: 'lemon', zh: '柠檬', py: 'níngméng', en: 'lemon', emoji: '🍋' },
  // Ascension 3+
  { id: 'pineapple', zh: '菠萝', py: 'bōluó', en: 'pineapple', emoji: '🍍', tier: 1 },
  { id: 'cherry', zh: '樱桃', py: 'yīngtáo', en: 'cherry', emoji: '🍒', tier: 1 },
  { id: 'kiwi', zh: '猕猴桃', py: 'míhóutáo', en: 'kiwi fruit', emoji: '🥝', tier: 1 },
  { id: 'blueberry', zh: '蓝莓', py: 'lánméi', en: 'blueberry', emoji: '🫐', tier: 1 },
  // Ascension 6+
  { id: 'cantaloupe', zh: '哈密瓜', py: 'hāmìguā', en: 'cantaloupe (Hami melon)', emoji: '🍈', tier: 2 },
  { id: 'coconut', zh: '椰子', py: 'yēzi', en: 'coconut', emoji: '🥥', tier: 2 },
  { id: 'green_apple', zh: '青苹果', py: 'qīng píngguǒ', en: 'green apple', emoji: '🍏', tier: 2 },
];
// fruit that look alike (offered together as distractors from Ascension 3)
const FRUIT_LOOKS = [
  ['apple', 'cherry', 'strawberry', 'peach', 'green_apple'],
  ['watermelon', 'cantaloupe', 'coconut'],
  ['banana', 'lemon', 'pineapple', 'mango', 'pear'],
  ['grape', 'blueberry'],
  ['kiwi', 'green_apple', 'pear', 'lemon'],
  ['orange', 'mango', 'peach', 'lemon'],
];

export const NUMBERS = [
  { id: 'n1', zh: '一', py: 'yī', en: 'one', n: 1 },
  { id: 'n2', zh: '二', py: 'èr', en: 'two', n: 2 },
  { id: 'n3', zh: '三', py: 'sān', en: 'three', n: 3 },
  { id: 'n4', zh: '四', py: 'sì', en: 'four', n: 4 },
  { id: 'n5', zh: '五', py: 'wǔ', en: 'five', n: 5 },
  { id: 'n6', zh: '六', py: 'liù', en: 'six', n: 6 },
  { id: 'n7', zh: '七', py: 'qī', en: 'seven', n: 7 },
  { id: 'n8', zh: '八', py: 'bā', en: 'eight', n: 8 },
  { id: 'n9', zh: '九', py: 'jiǔ', en: 'nine', n: 9 },
  { id: 'n10', zh: '十', py: 'shí', en: 'ten', n: 10 },
];

// Clearly positive (praise / encouragement) vs clearly negative (criticism / discouragement).
// bù cuò and méi wèntí are deliberately included: they contain a negation but are positive.
export const CHEERS = [
  { id: 'hen_hao', zh: '很好', py: 'hěn hǎo', en: 'Very good', positive: true },
  { id: 'jia_you', zh: '加油', py: 'jiā yóu', en: 'Keep going! / You can do it!', positive: true },
  { id: 'tai_bang_le', zh: '太棒了', py: 'tài bàng le', en: 'Awesome!', positive: true },
  { id: 'chu_se', zh: '出色', py: 'chūsè', en: 'Outstanding', positive: true },
  { id: 'zhen_lihai', zh: '真厉害', py: 'zhēn lìhai', en: 'Really impressive!', positive: true },
  { id: 'hao_ji_le', zh: '好极了', py: 'hǎo jí le', en: 'Excellent!', positive: true },
  { id: 'gan_de_hao', zh: '干得好', py: 'gàn de hǎo', en: 'Well done!', positive: true },
  { id: 'ni_neng_xing', zh: '你能行', py: 'nǐ néng xíng', en: 'You can do it!', positive: true },
  { id: 'bu_cuo', zh: '不错', py: 'bùcuò', en: 'Pretty good (literally “not wrong”)', positive: true },
  { id: 'mei_wenti', zh: '没问题', py: 'méi wèntí', en: 'No problem!', positive: true },
  { id: 'bu_hao', zh: '不好', py: 'bù hǎo', en: 'Not good', positive: false },
  { id: 'zao_gao', zh: '糟糕', py: 'zāogāo', en: 'Terrible / Oh no', positive: false },
  { id: 'tai_cha_le', zh: '太差了', py: 'tài chà le', en: 'Awful (far too poor)', positive: false },
  { id: 'bu_xing', zh: '不行', py: 'bù xíng', en: 'No good / That won’t do', positive: false },
  { id: 'mei_yong', zh: '没用', py: 'méi yòng', en: 'Useless', positive: false },
  { id: 'fang_qi', zh: '放弃', py: 'fàngqì', en: 'Give up', positive: false },
  { id: 'hen_nanguo', zh: '很难过', py: 'hěn nánguò', en: 'Very sad', positive: false },
  { id: 'hai_pa', zh: '害怕', py: 'hàipà', en: 'Scared', positive: false },
  // Ascension 3+: longer phrases; `ctx` says when it's said (shown with the phrase)
  { id: 'ni_zuo_de_hen_hao', zh: '你做得很好', py: 'nǐ zuò de hěn hǎo', en: 'You did really well', positive: true, tier: 1 },
  { id: 'ni_zhen_bang', zh: '你真棒', py: 'nǐ zhēn bàng', en: 'You’re amazing', positive: true, tier: 1 },
  { id: 'bie_danxin', zh: '别担心', py: 'bié dānxīn', en: 'Don’t worry', positive: true, tier: 1 },
  { id: 'mei_guanxi', zh: '没关系', py: 'méi guānxi', en: 'It’s okay / never mind', positive: true, tier: 1, ctx: 'said after someone makes a mistake' },
  { id: 'tai_nan_le', zh: '太难了', py: 'tài nán le', en: 'It’s too hard', positive: false, tier: 1 },
  { id: 'wo_zuo_bu_dao', zh: '我做不到', py: 'wǒ zuò bu dào', en: 'I can’t do it', positive: false, tier: 1 },
  { id: 'zhen_mei_yong', zh: '真没用', py: 'zhēn méi yòng', en: 'Truly useless', positive: false, tier: 1 },
  { id: 'bie_zuomeng', zh: '别做梦了', py: 'bié zuòmèng le', en: 'Stop dreaming', positive: false, tier: 1, ctx: 'mocking someone’s hopes' },
  // Ascension 6+: nuanced (negations that encourage, gentle-sounding put-downs)
  { id: 'bie_fangqi', zh: '别放弃', py: 'bié fàngqì', en: 'Don’t give up!', positive: true, tier: 2 },
  { id: 'bu_yong_pa', zh: '不用怕', py: 'bú yòng pà', en: 'No need to be afraid', positive: true, tier: 2 },
  { id: 'yiding_xing', zh: '一定行', py: 'yídìng xíng', en: 'You’ll definitely make it', positive: true, tier: 2 },
  { id: 'manman_lai', zh: '慢慢来', py: 'mànmàn lái', en: 'Take your time', positive: true, tier: 2, ctx: 'calming someone who is rushing' },
  { id: 'suan_le_ba', zh: '算了吧', py: 'suàn le ba', en: 'Forget it (just give up)', positive: false, tier: 2, ctx: 'telling someone to stop trying' },
  { id: 'mei_xiwang_le', zh: '没希望了', py: 'méi xīwàng le', en: 'There’s no hope', positive: false, tier: 2 },
  { id: 'zenme_you_cuo_le', zh: '你怎么又错了', py: 'nǐ zěnme yòu cuò le', en: 'How are you wrong again?!', positive: false, tier: 2 },
  { id: 'ni_bu_xing', zh: '你不行', py: 'nǐ bù xíng', en: 'You can’t do it', positive: false, tier: 2 },
];

// Negation sentences. The English meaning is always shown, so exactly one choice fits:
//   bù negates the present/future, habits, wishes, adjectives, shì and huì;
//   méi negates the past (didn't / haven't) and yǒu (have).
// Sentences where méi and méiyǒu would both be correct only offer one of them.
export const NEGATIONS = [
  { id: 'wo_bu_yao', zh: '我不要。', before: 'wǒ', after: 'yào.', en: 'I don’t want it.', answer: 'bù', options: ['bù', 'méi'], why: 'Not wanting (now) → bù.' },
  { id: 'ta_bu_shi_laoshi', zh: '他不是老师。', before: 'tā', after: 'shì lǎoshī.', en: 'He isn’t a teacher.', answer: 'bù', options: ['bù', 'méi'], why: 'shì (to be) is always negated with bù.' },
  { id: 'wo_mei_you_qian', zh: '我没有钱。', before: 'wǒ', after: 'yǒu qián.', en: 'I don’t have money.', answer: 'méi', options: ['bù', 'méi'], why: 'yǒu (to have) is always negated with méi.' },
  { id: 'ta_zuotian_mei_lai', zh: '他昨天没来。', before: 'tā zuótiān', after: 'lái.', en: 'He didn’t come yesterday.', answer: 'méi', options: ['bù', 'méi'], why: 'Something that didn’t happen in the past → méi.' },
  { id: 'wo_bu_chi_rou', zh: '我不吃肉。', before: 'wǒ', after: 'chī ròu.', en: 'I don’t eat meat.', answer: 'bù', options: ['bù', 'méi'], why: 'Habits → bù.' },
  { id: 'wo_hai_mei_chi', zh: '我还没吃饭。', before: 'wǒ hái', after: 'chī fàn.', en: 'I haven’t eaten yet.', answer: 'méi', options: ['bù', 'méi'], why: '“Not yet” (hái méi) → méi.' },
  { id: 'zhege_bu_gui', zh: '这个不贵。', before: 'zhège', after: 'guì.', en: 'This isn’t expensive.', answer: 'bù', options: ['bù', 'méi'], why: 'Adjectives are negated with bù.' },
  { id: 'wo_bu_xihuan', zh: '我不喜欢咖啡。', before: 'wǒ', after: 'xǐhuan kāfēi.', en: 'I don’t like coffee.', answer: 'bù', options: ['bù', 'méi'], why: 'Likes and wishes → bù.' },
  { id: 'ta_mei_quguo', zh: '她没去过北京。', before: 'tā', after: 'qùguo Běijīng.', en: 'She has never been to Beijing.', answer: 'méi', options: ['bù', 'méi'], why: 'Experiences with guo → méi.' },
  { id: 'jintian_bu_leng', zh: '今天不冷。', before: 'jīntiān', after: 'lěng.', en: 'It isn’t cold today.', answer: 'bù', options: ['bù', 'méi'], why: 'Adjectives are negated with bù.' },
  { id: 'wo_mei_kanjian', zh: '我没看见他。', before: 'wǒ', after: 'kànjiàn tā.', en: 'I didn’t see him.', answer: 'méi', options: ['bù', 'méi'], why: 'Something that didn’t happen → méi.' },
  { id: 'zher_meiyou_ren', zh: '这儿没有人。', before: 'zhèr', after: 'rén.', en: 'There’s nobody here.', answer: 'méiyǒu', options: ['bù', 'méiyǒu'], why: '“There is no…” → méiyǒu.' },
  { id: 'wo_bu_hui_riyu', zh: '我不会说日语。', before: 'wǒ', after: 'huì shuō Rìyǔ.', en: 'I can’t speak Japanese.', answer: 'bù', options: ['bù', 'méi'], why: 'huì (can, know how to) takes bù.' },
  { id: 'wo_meiyou_shijian', zh: '我没有时间。', before: 'wǒ', after: 'shíjiān.', en: 'I don’t have time.', answer: 'méiyǒu', options: ['bù', 'méiyǒu'], why: 'Not having something → méiyǒu.' },
  { id: 'mingtian_bu_qu', zh: '我明天不去。', before: 'wǒ míngtiān', after: 'qù.', en: 'I’m not going tomorrow.', answer: 'bù', options: ['bù', 'méi'], why: 'The future → bù.' },
  { id: 'zuotian_mei_shangban', zh: '我昨天没上班。', before: 'wǒ zuótiān', after: 'shàngbān.', en: 'I didn’t go to work yesterday.', answer: 'méi', options: ['bù', 'méi'], why: 'The past → méi.' },
  { id: 'ta_bu_shi_zhongguoren', zh: '他不是中国人。', before: 'tā', after: 'shì Zhōngguó rén.', en: 'He isn’t Chinese.', answer: 'bù', options: ['bù', 'méi'], why: 'shì (to be) is always negated with bù.' },
  { id: 'wo_meiyou_gege', zh: '我没有哥哥。', before: 'wǒ', after: 'gēge.', en: 'I don’t have an older brother.', answer: 'méiyǒu', options: ['bù', 'méiyǒu'], why: 'Not having something → méiyǒu.' },
  // Ascension 3+: bié (don't!) and "can't manage it" (verb + bu + result)
  { id: 'bie_shuohua', zh: '别说话！', before: '', after: 'shuōhuà!', en: 'Don’t talk!', answer: 'bié', options: ['bù', 'méi', 'bié'], why: 'Telling someone not to do something → bié.', tier: 1 },
  { id: 'ni_bie_danxin', zh: '你别担心。', before: 'nǐ', after: 'dānxīn.', en: 'Don’t you worry.', answer: 'bié', options: ['bù', 'méi', 'bié'], why: 'Telling someone not to do something → bié.', tier: 1 },
  { id: 'ta_hai_mei_dao', zh: '他还没到。', before: 'tā hái', after: 'dào.', en: 'He hasn’t arrived yet.', answer: 'méi', options: ['bù', 'méi', 'bié'], why: '“Not yet” (hái méi) → méi.', tier: 1 },
  { id: 'wo_ting_bu_dong', zh: '我听不懂。', before: 'wǒ tīng', after: 'dǒng.', en: 'I can’t understand (what I hear).', answer: 'bù', options: ['bù', 'méi'], why: 'Can’t manage it: verb + bu + result (said lightly: tīng bu dǒng).', tier: 1 },
  { id: 'wo_zhao_bu_dao', zh: '我找不到钥匙。', before: 'wǒ zhǎo', after: 'dào yàoshi.', en: 'I can’t find the keys.', answer: 'bù', options: ['bù', 'méi'], why: 'Can’t manage it: verb + bu + result (zhǎo bu dào).', tier: 1 },
  // Ascension 6+: two or three blanks in one sentence (filled left to right)
  { id: 'mei_lai_bu_lai', zh: '他昨天没来，今天也不来。', parts: ['tā zuótiān', 'lái, jīntiān yě', 'lái.'], en: 'He didn’t come yesterday, and he isn’t coming today either.', answer: ['méi', 'bù'], options: ['bù', 'méi'], why: 'The past → méi; today and the future → bù.', tier: 2 },
  { id: 'bu_shi_bu_xiang', zh: '我不是不想去，是没有时间。', parts: ['wǒ', 'shì', 'xiǎng qù, shì', 'shíjiān.'], en: 'It’s not that I don’t want to go; I don’t have time.', answer: ['bù', 'bù', 'méiyǒu'], options: ['bù', 'méiyǒu'], why: 'shì and wishes take bù; not having something → méiyǒu.', tier: 2 },
  { id: 'bie_ku_mei_shengqi', zh: '别哭了，我没生气。', parts: ['', 'kū le, wǒ', 'shēngqì.'], en: 'Stop crying, I didn’t get angry.', answer: ['bié', 'méi'], options: ['bù', 'méi', 'bié'], why: 'Telling someone not to → bié; something that didn’t happen → méi.', tier: 2 },
  { id: 'mei_zuowan_bie_zou', zh: '我还没做完，你别走。', parts: ['wǒ hái', 'zuò wán, nǐ', 'zǒu.'], en: 'I haven’t finished yet, so don’t go.', answer: ['méi', 'bié'], options: ['bù', 'méi', 'bié'], why: '“Not yet” → méi; telling someone not to → bié.', tier: 2 },
  { id: 'bu_gui_meiyou_qian', zh: '这个不贵，可是我没有钱。', parts: ['zhège', 'guì, kěshì wǒ', 'qián.'], en: 'This isn’t expensive, but I don’t have money.', answer: ['bù', 'méiyǒu'], options: ['bù', 'méiyǒu'], why: 'Adjectives take bù; not having something → méiyǒu.', tier: 2 },
];

// Body parts. `emoji` where an emoji is unambiguous; `figure` draws a body with that part lit.
export const BODY_PARTS = [
  { id: 'hand', zh: '手', py: 'shǒu', en: 'hand', emoji: '✋' },
  { id: 'eye', zh: '眼睛', py: 'yǎnjing', en: 'eye', emoji: '👁️' },
  { id: 'mouth', zh: '嘴巴', py: 'zuǐba', en: 'mouth', emoji: '👄' },
  { id: 'foot', zh: '脚', py: 'jiǎo', en: 'foot', emoji: '🦶' },
  { id: 'head', zh: '头', py: 'tóu', en: 'head', figure: 'head' },
  { id: 'nose', zh: '鼻子', py: 'bízi', en: 'nose', emoji: '👃' },
  { id: 'ear', zh: '耳朵', py: 'ěrduo', en: 'ear', emoji: '👂' },
  { id: 'leg', zh: '腿', py: 'tuǐ', en: 'leg', emoji: '🦵' },
  { id: 'tooth', zh: '牙齿', py: 'yáchǐ', en: 'tooth', emoji: '🦷' },
  { id: 'belly', zh: '肚子', py: 'dùzi', en: 'belly', figure: 'belly' },
  // Ascension 3+
  { id: 'tongue', zh: '舌头', py: 'shétou', en: 'tongue', emoji: '👅', tier: 1 },
  { id: 'arm', zh: '胳膊', py: 'gēbo', en: 'arm', emoji: '💪', tier: 1 },
  { id: 'finger', zh: '手指', py: 'shǒuzhǐ', en: 'finger', emoji: '👆', tier: 1 },
  { id: 'shoulder', zh: '肩膀', py: 'jiānbǎng', en: 'shoulder', figure: 'shoulder', tier: 1 },
  { id: 'knee', zh: '膝盖', py: 'xīgài', en: 'knee', figure: 'knee', tier: 1 },
  { id: 'neck', zh: '脖子', py: 'bózi', en: 'neck', figure: 'neck', tier: 1 },
  // Ascension 6+
  { id: 'bone', zh: '骨头', py: 'gǔtou', en: 'bone', emoji: '🦴', tier: 2 },
  { id: 'brain', zh: '大脑', py: 'dànǎo', en: 'brain', emoji: '🧠', tier: 2 },
  { id: 'heart', zh: '心脏', py: 'xīnzàng', en: 'heart (the organ)', emoji: '🫀', tier: 2 },
  { id: 'lungs', zh: '肺', py: 'fèi', en: 'lungs', emoji: '🫁', tier: 2 },
  { id: 'wrist', zh: '手腕', py: 'shǒuwàn', en: 'wrist', figure: 'wrist', tier: 2 },
  { id: 'elbow', zh: '胳膊肘', py: 'gēbozhǒu', en: 'elbow', figure: 'elbow', tier: 2 },
];
// body regions: from Ascension 3, distractors come from the same region
const BODY_REGIONS = [
  ['eye', 'mouth', 'nose', 'ear', 'tooth', 'tongue', 'head', 'neck', 'brain'],
  ['hand', 'finger', 'arm', 'wrist', 'elbow', 'shoulder'],
  ['leg', 'foot', 'knee'],
  ['belly', 'bone', 'heart', 'lungs', 'brain'],
];
// never side by side: pictures that could honestly be read as either
const BODY_LOOKALIKE = [['leg', 'foot'], ['mouth', 'tooth'], ['mouth', 'tongue'], ['head', 'belly'], ['hand', 'finger'], ['arm', 'shoulder'], ['heart', 'lungs']];

// Single syllables whose four tone variants are all real pinyin syllables; options differ only
// in tone. `tone` is the correct one (verified dictionary tone).
export const TONE_WORDS = [
  { id: 'ma3', zh: '马', py: 'mǎ', en: 'horse' },
  { id: 'ma1', zh: '妈', py: 'mā', en: 'mum' },
  { id: 'shu1', zh: '书', py: 'shū', en: 'book' },
  { id: 'huo3', zh: '火', py: 'huǒ', en: 'fire' },
  { id: 'mi3', zh: '米', py: 'mǐ', en: 'rice (uncooked)' },
  { id: 'cha2', zh: '茶', py: 'chá', en: 'tea' },
  { id: 'mao1', zh: '猫', py: 'māo', en: 'cat' },
  { id: 'yu2', zh: '鱼', py: 'yú', en: 'fish' },
  { id: 'niu2', zh: '牛', py: 'niú', en: 'cow' },
  { id: 'tang2', zh: '糖', py: 'táng', en: 'sugar, sweets' },
  { id: 'tang1', zh: '汤', py: 'tāng', en: 'soup' },
  { id: 'da4', zh: '大', py: 'dà', en: 'big' },
  { id: 'qi2', zh: '骑', py: 'qí', en: 'to ride' },
  { id: 'bi3', zh: '笔', py: 'bǐ', en: 'pen' },
  { id: 'ge1', zh: '歌', py: 'gē', en: 'song' },
  { id: 'hao3', zh: '好', py: 'hǎo', en: 'good' },
  { id: 'fan4', zh: '饭', py: 'fàn', en: 'meal, cooked rice' },
  { id: 'zhu1', zh: '猪', py: 'zhū', en: 'pig' },
  { id: 'ye4', zh: '夜', py: 'yè', en: 'night' },
  { id: 'xue3', zh: '雪', py: 'xuě', en: 'snow' },
  { id: 'bao1', zh: '包', py: 'bāo', en: 'bag' },
];
// Ascension 3+: two-syllable words (no neutral tones); options vary one or both tones.
export const TONE_WORDS_2 = [
  { id: 'laoshi', zh: '老师', syl: ['lǎo', 'shī'], en: 'teacher' },
  { id: 'zhongguo', zh: '中国', syl: ['zhōng', 'guó'], en: 'China' },
  { id: 'diannao', zh: '电脑', syl: ['diàn', 'nǎo'], en: 'computer' },
  { id: 'xiongmao', zh: '熊猫', syl: ['xióng', 'māo'], en: 'panda' },
  { id: 'feiji', zh: '飞机', syl: ['fēi', 'jī'], en: 'plane' },
  { id: 'hanzi', zh: '汉字', syl: ['hàn', 'zì'], en: 'Chinese character' },
  { id: 'daxue', zh: '大学', syl: ['dà', 'xué'], en: 'university' },
  { id: 'tianqi', zh: '天气', syl: ['tiān', 'qì'], en: 'weather' },
  { id: 'mifan', zh: '米饭', syl: ['mǐ', 'fàn'], en: 'cooked rice' },
  { id: 'xuexiao', zh: '学校', syl: ['xué', 'xiào'], en: 'school' },
  { id: 'huoche', zh: '火车', syl: ['huǒ', 'chē'], en: 'train' },
  { id: 'niunai', zh: '牛奶', syl: ['niú', 'nǎi'], en: 'milk' },
  { id: 'dianshi', zh: '电视', syl: ['diàn', 'shì'], en: 'TV' },
];
// Ascension 6+: tone sandhi. Written one way, said another: pick how it's actually said.
export const SANDHI = [
  { id: 'nihao', zh: '你好', written: 'nǐ hǎo', said: ['ní', 'hǎo'], en: 'hello', why: 'Two 3rd tones in a row: the first is said as a 2nd tone.' },
  { id: 'henhao', zh: '很好', written: 'hěn hǎo', said: ['hén', 'hǎo'], en: 'very good', why: 'Two 3rd tones in a row: the first is said as a 2nd tone.' },
  { id: 'shuiguo', zh: '水果', written: 'shuǐguǒ', said: ['shuí', 'guǒ'], en: 'fruit', why: 'Two 3rd tones in a row: the first is said as a 2nd tone.' },
  { id: 'laohu', zh: '老虎', written: 'lǎohǔ', said: ['láo', 'hǔ'], en: 'tiger', why: 'Two 3rd tones in a row: the first is said as a 2nd tone.' },
  { id: 'keyi', zh: '可以', written: 'kěyǐ', said: ['ké', 'yǐ'], en: 'can, may', why: 'Two 3rd tones in a row: the first is said as a 2nd tone.' },
  { id: 'bushi', zh: '不是', written: 'bù shì', said: ['bú', 'shì'], en: 'is not', why: 'bù before a 4th tone is said bú (2nd tone).' },
  { id: 'budui', zh: '不对', written: 'bù duì', said: ['bú', 'duì'], en: 'not right', why: 'bù before a 4th tone is said bú (2nd tone).' },
  { id: 'yige', zh: '一个', written: 'yī gè', said: ['yí', 'gè'], en: 'one (of something)', why: 'yī before a 4th tone is said yí (2nd tone).' },
  { id: 'yiqi', zh: '一起', written: 'yīqǐ', said: ['yì', 'qǐ'], en: 'together', why: 'yī before a 1st, 2nd or 3rd tone is said yì (4th tone).' },
  { id: 'yitian', zh: '一天', written: 'yī tiān', said: ['yì', 'tiān'], en: 'one day', why: 'yī before a 1st, 2nd or 3rd tone is said yì (4th tone).' },
];
export const TONE_SHAPES = {
  1: { name: 'high and level', path: 'M4 6 L36 6' },
  2: { name: 'rising', path: 'M4 30 L36 6' },
  3: { name: 'dipping, then rising', path: 'M4 14 Q14 38 24 30 T36 10' },
  4: { name: 'falling sharply', path: 'M4 6 L36 32' },
};

// ------------------------------------------------------------------ helpers
const shuffle = (arr, rng) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Practice record of a word: signature puzzles track it under gameWords; met words also have SRS. */
function practice(save, zh) {
  const g = save?.gameWords?.[zh] || {};
  const w = save?.words?.[zh];
  return { seen: (g.seen || 0) + (w?.seen || 0), ok: (g.ok || 0) + (w?.ok || 0), bad: (g.bad || 0) + (w?.bad || 0), met: Boolean(g.seen || w) };
}

/**
 * Picks the next target, weighting weaker and newer words higher (the spaced-repetition idea:
 * shaky words come back sooner), never repeating the previous one, and introducing at most one
 * brand-new word at a time (it's taught on the spot instead of tested).
 */
export function pickTarget(pool, save, rng, last = null) {
  const list = pool.length > 1 ? pool.filter((x) => x.id !== last) : pool;
  const known = list.filter((x) => practice(save, x.zh).met);
  // until a few words are familiar, keep the set small so the first meetings stick
  const fresh = list.filter((x) => !practice(save, x.zh).met);
  const allowNew = known.length < 4 || rng() < 0.25;
  const cands = allowNew || !known.length ? list : known;
  const w = (x) => {
    const p = practice(save, x.zh);
    if (!p.met) return fresh.length ? 2.2 : 1;
    const acc = (p.ok + 1) / (p.seen + 2);
    return 0.6 + (1 - acc) * 3 + (p.seen < 3 ? 0.8 : 0);
  };
  const total = cands.reduce((s, x) => s + w(x), 0);
  let roll = rng() * total;
  for (const x of cands) {
    roll -= w(x);
    if (roll <= 0) return x;
  }
  return cands[cands.length - 1];
}
const isNew = (save, zh) => !practice(save, zh).met;

/** Puzzle difficulty tier for an Ascension level: 0 (A0–2), 1 (A3–5), 2 (A6–10). */
export const puzzleTier = (level = 0) => (level >= 6 ? 2 : level >= 3 ? 1 : 0);
const inTier = (list, level) => list.filter((x) => (x.tier || 0) <= puzzleTier(level));
/**
 * Up to n distractors, preferring ones that are similar to the target (same group in `groups`),
 * never ones that `never` pairs with it.
 */
function distractors(pool, t, n, rng, { groups = [], never = [], similar = 0 } = {}) {
  const banned = new Set(never.filter((p) => p.includes(t.id)).flat());
  const others = shuffle(pool.filter((x) => x.id !== t.id && !banned.has(x.id)), rng);
  const like = new Set(groups.filter((g) => g.includes(t.id)).flat());
  const close = others.filter((x) => like.has(x.id)).slice(0, similar);
  return [...close, ...others.filter((x) => !close.includes(x))].slice(0, n);
}

// ------------------------------------------------------------------ numbers (Mei)
const DIGITS = ['líng', 'yī', 'èr', 'sān', 'sì', 'wǔ', 'liù', 'qī', 'bā', 'jiǔ'];
const HANZI_DIGITS = '〇一二三四五六七八九';
// pinyin joins syllables; an apostrophe goes before a syllable starting with a, e or o (shí'èr)
const join = (a, b) => (/^[aeoāáǎàēéěèōóǒò]/.test(b) ? `${a}'${b}` : a + b);
/** Pinyin and hanzi of 1–999 for the number puzzle (2xx is left out: èrbǎi/liǎngbǎi both occur). */
export function numberWord(n) {
  if (n <= 10) return { py: NUMBERS[n - 1].py, zh: NUMBERS[n - 1].zh };
  if (n < 20) return { py: join('shí', DIGITS[n - 10]), zh: `十${HANZI_DIGITS[n - 10]}` };
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    return { py: u ? join(`${DIGITS[t]}shí`, DIGITS[u]) : `${DIGITS[t]}shí`, zh: `${HANZI_DIGITS[t]}十${u ? HANZI_DIGITS[u] : ''}` };
  }
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const hp = h === 1 ? 'yìbǎi' : `${DIGITS[h]}bǎi`;
  if (!rest) return { py: hp, zh: `${HANZI_DIGITS[h]}百` };
  const r = numberWord(rest);
  // whole tens after a hundred keep their yī (yìbǎi yīshí); only whole tens are used here
  return { py: `${hp} ${rest < 20 ? `yī${r.py}` : r.py}`, zh: `${HANZI_DIGITS[h]}百${rest < 20 ? '一' : ''}${r.zh}` };
}
/** Which numbers Mei's puzzle can ask at an Ascension level, and the "new kind of number" word. */
function numberStage(level) {
  if (level >= 7) return { from: [100, 300, 400, 500, 600, 700, 800, 900].flatMap((h) => (h === 100 ? [100] : [h, h + 50, h + 30, h + 80])), key: 'num:hundreds', teach: 'bǎi = hundred: sānbǎi = 300, sānbǎi wǔshí = 350.' };
  if (level >= 5) return { from: Array.from({ length: 79 }, (_, i) => i + 21), key: 'num:tens', teach: 'Tens: sānshí = 3 × 10 = 30, sānshíwǔ = 35.' };
  if (level >= 3) return { from: Array.from({ length: 10 }, (_, i) => i + 11), key: 'num:teens', teach: 'Teens: shí + a digit, so shíwǔ = 10 + 5 = 15.' };
  return null;
}
/** Numbers that are easy to mix up with n (swapped digits, teen vs tens, ±1, ±10, ±100). */
function closeNumbers(n, rng) {
  const s = new Set();
  const t = Math.floor(n / 10) % 10;
  const u = n % 10;
  if (n < 100) {
    if (u && t) s.add(u * 10 + t);
    if (n > 10 && n < 20) s.add(u * 10);
    if (!u && t > 1) s.add(10 + t);
    s.add(n + 1);
    s.add(n - 1);
    s.add(n + 10);
    s.add(n - 10);
  } else {
    const h = Math.floor(n / 100);
    s.add(n + 100);
    s.add(n - 100);
    s.add(h * 10);
    if (n % 100) s.add(h * 100);
    else s.add(n + 50);
    s.add(n + 10);
  }
  return shuffle([...s].filter((x) => x > 0 && x !== n && x < 1000 && Math.floor(x / 100) !== 2), rng);
}

/** Four tone variants of a single syllable (all differ only in the tone mark). */
export function toneOptions(py) {
  const base = baseOf(py);
  return [1, 2, 3, 4].map((t) => withTone(base, t));
}

// ------------------------------------------------------------------ templates
export const TEMPLATES = {
  fruit: {
    name: 'Which fruit is this?',
    focus: 'Fruits',
    pool: FRUITS,
    generate({ save, rng, last, level = 0 }) {
      const pool = inTier(FRUITS, level);
      const t = pickTarget(pool, save, rng, last);
      // from Ascension 3, look-alike fruit are offered together
      const others = distractors(pool, t, 3, rng, { groups: FRUIT_LOOKS, similar: puzzleTier(level) });
      return {
        template: 'fruit', kind: 'choice', target: t.id, choice: t.id, words: [t.zh], teach: isNew(save, t.zh),
        prompt: { emoji: t.emoji, q: 'Which fruit is this?' },
        options: shuffle([t, ...others], rng).map((f) => ({ id: f.id, py: f.py, zh: f.zh, en: f.en })),
        answer: t.id, reveal: `${t.py} · ${t.en}`,
      };
    },
  },
  number: {
    name: 'Read the number',
    focus: 'Numbers (1–10; up to the hundreds on Ascension)',
    pool: NUMBERS,
    generate({ save, rng, last, level = 0 }) {
      const stage = numberStage(level);
      // bigger numbers join gradually: about half the questions, once the new kind has been taught
      if (stage && (!practice(save, stage.key).met || rng() < 0.6)) {
        const pool = stage.from.map((n) => ({ id: `n${n}`, n, ...numberWord(n) }));
        const t = pickTarget(pool, save, rng, last);
        const opts = shuffle([t.n, ...closeNumbers(t.n, rng).slice(0, 3)], rng).map((n) => ({ id: `n${n}`, py: String(n), en: numberWord(n).py, zh: numberWord(n).zh }));
        return {
          template: 'number', kind: 'choice', target: t.id, choice: t.n, words: [t.zh, stage.key],
          teach: isNew(save, stage.key), why: isNew(save, stage.key) ? stage.teach : undefined,
          prompt: { word: t.py, q: 'Which number is this?' },
          options: opts, answer: t.id, reveal: `${t.py} = ${t.n}`, close: true,
        };
      }
      const t = pickTarget(NUMBERS, save, rng, last);
      return {
        template: 'number', kind: 'choice', target: t.id, choice: t.n, words: [t.zh], teach: isNew(save, t.zh),
        // the pinyin is the clue: recognising it is the skill. The digits stay in order 1–10 so
        // finding the one you mean is instant once you know it.
        prompt: { word: t.py, q: 'Which number is this?' },
        options: NUMBERS.map((n) => ({ id: n.id, py: String(n.n), zh: n.zh, en: n.py })),
        answer: t.id, reveal: `${t.py} = ${t.n}`,
      };
    },
  },
  cheer: {
    name: 'Pick every encouraging phrase',
    focus: 'Encouraging vs negative expressions',
    pool: CHEERS,
    generate({ save, rng, last, level = 0 }) {
      const pool = inTier(CHEERS, level);
      const pos = pool.filter((c) => c.positive);
      const neg = pool.filter((c) => !c.positive);
      const nPos = 2 + Math.floor(rng() * 3); // 2–4 right answers out of 6
      // lead with the weakest phrase so practice goes where it's needed
      const lead = pickTarget(pool, save, rng, last);
      const pickFrom = (list, n) => {
        const out = list.includes(lead) ? [lead] : [];
        for (const c of shuffle(list.filter((x) => x !== lead), rng)) if (out.length < n) out.push(c);
        return out;
      };
      const chosen = [...pickFrom(pos, nPos), ...pickFrom(neg, 6 - nPos)];
      const opts = shuffle(chosen, rng);
      return {
        template: 'cheer', kind: 'multi', target: lead.id, words: opts.map((c) => c.zh),
        // unfamiliar phrases show their meaning (they are being taught, not tested)
        teach: opts.some((c) => isNew(save, c.zh)),
        prompt: { q: 'Hype Huojin up! Select every encouraging phrase.' },
        options: opts.map((c) => ({ id: c.id, py: c.py, zh: c.zh, en: c.en, ctx: c.ctx, positive: c.positive, fresh: isNew(save, c.zh) })),
        answer: opts.filter((c) => c.positive).map((c) => c.id).sort(),
        reveal: opts.filter((c) => c.positive).map((c) => c.py).join(' · '),
      };
    },
  },
  negation: {
    name: 'Complete the sentence',
    focus: 'Negation: bù, méi, méiyǒu',
    pool: NEGATIONS,
    generate({ save, rng, last, level = 0 }) {
      const t = pickTarget(inTier(NEGATIONS, level), save, rng, last);
      // one blank: before ＿ after; several: parts[0] ＿ parts[1] ＿ … (filled left to right)
      const parts = t.parts || [t.before, t.after];
      const answers = Array.isArray(t.answer) ? t.answer : [t.answer];
      return {
        template: 'negation', kind: 'blank', target: t.id, words: [t.zh], teach: isNew(save, t.zh),
        prompt: { before: parts[0], after: parts[parts.length - 1], parts, en: t.en, zh: t.zh, q: answers.length > 1 ? 'Fill each blank, left to right.' : 'Which negation fits?' },
        options: shuffle(t.options, rng).map((o) => ({ id: o, py: o })),
        answer: t.answer, reveal: parts.map((p, i) => [p, answers[i]].filter(Boolean).join(' ')).join(' '), why: t.why,
      };
    },
  },
  body: {
    name: 'Name the body part',
    focus: 'Body parts',
    pool: BODY_PARTS,
    generate({ save, rng, last, level = 0 }) {
      const pool = inTier(BODY_PARTS, level);
      const t = pickTarget(pool, save, rng, last);
      // never offer two parts whose pictures look alike (leg/foot, mouth/tooth); from Ascension 3
      // the other options come from the same part of the body
      const others = distractors(pool, t, 3, rng, { groups: BODY_REGIONS, never: BODY_LOOKALIKE, similar: puzzleTier(level) + 1 });
      return {
        template: 'body', kind: 'choice', target: t.id, words: [t.zh], teach: isNew(save, t.zh),
        prompt: { emoji: t.emoji, figure: t.figure, q: 'Which body part is this?' },
        options: shuffle([t, ...others], rng).map((p) => ({ id: p.id, py: p.py, zh: p.zh, en: p.en })),
        answer: t.id, reveal: `${t.py} · ${t.en}`,
      };
    },
  },
  tone: {
    name: 'Which tone?',
    focus: 'Mandarin tones',
    pool: TONE_WORDS,
    generate({ save, rng, last, soundless, level = 0 }) {
      const tier = puzzleTier(level);
      const roll = rng();
      if (tier >= 2 && roll < 0.4) {
        // tone sandhi: the written tones are shown; pick how the word is actually said
        const t = pickTarget(SANDHI, save, rng, last);
        const second = t.said[1];
        const opts = [1, 2, 3, 4].map((n) => withTone(baseOf(t.said[0]), n) + (t.written.includes(' ') ? ' ' : '') + second);
        const said = t.said.join(t.written.includes(' ') ? ' ' : '');
        return {
          template: 'tone', kind: 'choice', target: t.id, words: [t.zh], teach: isNew(save, t.zh),
          prompt: { en: t.en, zh: t.zh, written: t.written, audio: !soundless, sandhi: true, q: `Written ${t.written}. How is it actually said?` },
          options: opts.map((p) => ({ id: p, py: p })),
          answer: said, reveal: `written ${t.written}, said ${said}`, why: t.why,
        };
      }
      if (tier >= 1 && roll < 0.75) {
        // two syllables: contours for both; options change one or both tones
        const t = pickTarget(TONE_WORDS_2, save, rng, last);
        const tones = t.syl.map(toneOf);
        const word = (ts) => t.syl.map((s, i) => withTone(baseOf(s), ts[i])).join('');
        const answer = word(tones);
        const seen = new Set([answer]);
        const opts = [answer];
        for (let k = 0; opts.length < 4 && k < 40; k++) {
          const ts = tones.slice();
          const which = rng() < 0.3 ? [0, 1] : [Math.floor(rng() * 2)];
          for (const i of which) ts[i] = 1 + ((ts[i] + Math.floor(rng() * 3)) % 4);
          const w = word(ts);
          if (!seen.has(w)) {
            seen.add(w);
            opts.push(w);
          }
        }
        return {
          template: 'tone', kind: 'choice', target: t.id, words: [t.zh], teach: isNew(save, t.zh),
          prompt: { en: t.en, zh: t.zh, tones, audio: !soundless, q: 'Which spelling has the right tones?' },
          options: shuffle(opts, rng).map((p) => ({ id: p, py: p })),
          answer, reveal: `${answer} · tones ${tones.join('-')} · ${t.en}`,
        };
      }
      const t = pickTarget(TONE_WORDS, save, rng, last);
      return {
        template: 'tone', kind: 'choice', target: t.id, words: [t.zh], teach: isNew(save, t.zh),
        prompt: { en: t.en, zh: t.zh, tone: toneOf(t.py), audio: !soundless, q: 'Which spelling has the right tone?' },
        options: toneOptions(t.py).map((p) => ({ id: p, py: p })),
        answer: t.py, reveal: `${t.py} · tone ${toneOf(t.py)} (${TONE_SHAPES[toneOf(t.py)].name}) · ${t.en}`,
      };
    },
  },
};

export function generateSigPuzzle(template, { save, rng = Math.random, last = null, soundless = false, level = 0 } = {}) {
  const T = TEMPLATES[template];
  if (!T) throw new Error(`unknown signature puzzle ${template}`);
  return { ...T.generate({ save, rng, last, soundless, level }), level };
}

/** What Ascension changes in each hero's puzzle, by tier (for the Ascension picker). */
export const ASCENSION_PUZZLE_TEXT = {
  fruit: ['Common fruit', 'More fruit (pineapple, cherry, kiwi, blueberry); look-alike options', 'Rarer fruit (cantaloupe, coconut, green apple); closest look-alikes'],
  number: ['Numbers 1–10', 'Teens 11–20 (A3); then 21–99 (A5); close distractors', 'Up to the hundreds (A7); close distractors'],
  cheer: ['Short phrases', 'Longer phrases, some with a context line', 'Nuanced phrases: encouraging negations, gentle put-downs'],
  negation: ['bù / méi / méiyǒu', 'Adds bié (don’t!) and “can’t manage it” (tīng bu dǒng)', 'Sentences with two or three blanks'],
  body: ['Everyday body parts', 'More specific parts; options from the same body region', 'Organs and joints; closest same-region options'],
  tone: ['One-syllable words', 'Two-syllable words (both tones)', 'Tone sandhi: how written tones are really said'],
};

/** answer: an option id ('choice' / 'blank') or a list of ids ('multi'). */
export function checkSigAnswer(puzzle, answer) {
  if (puzzle.kind === 'multi') {
    const a = [...new Set(answer || [])].sort();
    return a.length === puzzle.answer.length && a.every((x, i) => x === puzzle.answer[i]);
  }
  if (Array.isArray(puzzle.answer)) return Array.isArray(answer) && answer.length === puzzle.answer.length && answer.every((x, i) => x === puzzle.answer[i]);
  return answer === puzzle.answer;
}
