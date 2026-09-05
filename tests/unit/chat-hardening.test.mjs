import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, server: { middlewareMode: true, watch: null }, logLevel: 'silent' });
after(() => vite.close());
const agent = await vite.ssrLoadModule('/src/services/aiAgent.ts');
const history = await vite.ssrLoadModule('/src/components/Chat/chatHistory.ts');
const { HEALTH_QUIZZES } = await vite.ssrLoadModule('/src/data/healthQuizzes.ts');
const context = { dayInfo: { phaseName: 'Folicular', dayOfCycle: 8 }, stats: {}, settings: { userName: '[.*' } };

test('all catalog topics and their suggestions resolve locally without a network request', async t => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected network request'); });
  for (const topic of agent.LOCAL_CHAT_TOPICS) {
    const response = await agent.generateChatResponse(topic.prompt, [], context);
    assert.equal(response.mode, 'local');
    assert.equal(response.topicId, topic.id, topic.prompt);
    assert.ok(response.text.length > 100);
    for (const suggestion of response.suggestions || []) {
      if (suggestion.action === 'quiz') assert.ok(HEALTH_QUIZZES[suggestion.quizKey]);
      else assert.notEqual((await agent.generateChatResponse(suggestion.prompt, [], context)).topicId, 'catalog', suggestion.prompt);
    }
  }
  assert.equal(globalThis.fetch.mock.callCount(), 0);
});

test('topic follow-ups use history and unfamiliar topics acknowledge their limits', async () => {
  const response = await agent.generateChatResponse('cuéntame más', [{ role: 'assistant', topicId: 'sleep' }], context);
  assert.equal(response.topicId, 'sleep');
  assert.equal((await agent.generateChatResponse('ecuaciones diferenciales', [], context)).topicId, 'catalog');
  assert.equal(agent.detectChatQuiz('Quiero saber cómo aliviar el dolor'), null);
  assert.equal(agent.detectChatQuiz('Quiero hacer un test de embarazo'), null);
  for (const item of agent.CHAT_QUIZ_SUGGESTIONS) assert.equal(agent.detectChatQuiz(item.label), item.quizKey);
});

test('urgent messages take priority over the ordinary catalog', async () => {
  const response = await agent.generateChatResponse('Quiero un chequeo de dolor insoportable y me desmayo', [], context);
  assert.equal(response.topicId, 'urgent');
  assert.match(response.text, /112/);
  assert.equal(response.suggestions, undefined);
});

test('a partially completed quiz and draft survive a history round trip', () => {
  const message = { ...history.newChatMessage('assistant', ''), quizCard: { quizKey: 'stress', stepIndex: 1 } };
  const conversation = { messages: [message], activeQuiz: { key: 'stress', step: 1, messageId: message.id, answers: { stress_q1: 4 } }, draft: 'Una duda pendiente' };
  const restored = history.parseConversation(JSON.stringify({ version: 1, ...conversation }));
  assert.deepEqual(restored.activeQuiz, conversation.activeQuiz);
  assert.equal(restored.draft, conversation.draft);
  assert.equal(restored.messages[0].id, message.id);
  assert.equal(history.parseConversation(JSON.stringify({ version: 1, ...conversation, activeQuiz: { ...conversation.activeQuiz, answers: {} } })).activeQuiz, null);
});

test('malformed history, duplicate IDs and untrusted links cannot enter the UI', () => {
  assert.throws(() => history.parseConversation('{'));
  assert.throws(() => history.parseConversation(JSON.stringify({ version: 9, messages: [] })));
  const message = history.newChatMessage('assistant', '<script>literal content</script>');
  assert.throws(() => history.parseConversation(JSON.stringify({ version: 1, messages: [message, message] })));
  message.sources = [{ title: 'Unsafe', url: 'javascript:alert(1)' }, { title: 'Untrusted', url: 'https://attacker.test' }];
  const parsed = history.parseConversation(JSON.stringify({ version: 1, messages: [message] }));
  assert.deepEqual(parsed.messages[0].sources, []);
});

test('local storage is isolated by user and reports quota or access errors', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)
  } });
  try {
    const a = history.CHAT_HISTORY_PREFIX + 'a';
    const b = history.CHAT_HISTORY_PREFIX + 'b';
    const conversation = { ...history.emptyConversation(), draft: 'Private draft' };
    assert.equal(history.saveConversation(a, conversation), null);
    assert.equal(history.loadConversation(a).conversation.draft, 'Private draft');
    assert.equal(history.loadConversation(b).conversation.draft, '');
    localStorage.setItem = () => { throw new Error('Quota exceeded'); };
    assert.match(history.saveConversation(a, conversation), /no permite guardar/);
    localStorage.getItem = () => { throw new Error('Access denied'); };
    assert.match(history.loadConversation(a).error, /recuperar/);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});

test('quiz summaries do not claim an unsaved medical report or diagnosis', () => {
  assert.match(history.completeQuiz('sleep', { sleep_q1: 'more_8', sleep_q2: false }), /falta de descanso/);
  assert.match(history.completeQuiz('cramps', { cramps_q1: 5 }), /atención sanitaria/);
  for (const key of Object.keys(HEALTH_QUIZZES)) {
    assert.match(history.completeQuiz(key, {}), /No se añaden al calendario ni al informe médico/);
  }
});
