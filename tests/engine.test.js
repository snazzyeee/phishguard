import test from 'node:test';
import assert from 'node:assert/strict';
import { assessEmail, CircularQueue, SAMPLE_EMAILS } from '../src/engine.js';

test('matches the two PDF sample assessments', () => {
  const phishing = assessEmail(SAMPLE_EMAILS[0]);
  assert.deepEqual(phishing.matchedKeywords, ['urgent', 'verify', 'password', 'suspended', 'click', 'bank', 'login', 'confirm']);
  assert.equal(phishing.rawScore, 115);
  assert.equal(phishing.score, 100);
  assert.equal(phishing.verdict, 'PHISHING');
  assert.equal(assessEmail(SAMPLE_EMAILS[1]).verdict, 'SAFE');
});

test('counts each substring keyword once and distinguishes sender penalties', () => {
  const repeated = assessEmail({ sender: 'name@school.edu', subject: 'urgent URGENT', body: 'https://bank.edu' });
  assert.deepEqual(repeated.matchedKeywords, ['urgent', 'bank']);
  assert.equal(repeated.score, 20);
  const malformed = assessEmail({ sender: 'no-address', subject: 'verify', body: '' });
  assert.equal(malformed.score, 30);
  assert.equal(malformed.verdict, 'SUSPICIOUS');
  const risky = assessEmail({ sender: 'alerts@host.TK', subject: '', body: 'http://example.org' });
  assert.equal(risky.score, 35);
  assert.equal(risky.verdict, 'SUSPICIOUS');
});

test('wraps rear from 9 to 0 and preserves FIFO order', () => {
  const queue = new CircularQueue();
  assert.deepEqual([queue.front, queue.rear, queue.count, queue.nextId], [0, -1, 0, 1]);
  for (let i = 0; i < 10; i++) queue.enqueue({ sender: `s${i}@test.edu`, subject: `${i}`, body: '' });
  assert.equal(queue.isFull(), true);
  assert.equal(queue.enqueue({ sender: 'overflow', subject: '', body: '' }), null);
  for (let i = 0; i < 8; i++) assert.equal(queue.dequeue().id, i + 1);
  queue.enqueue({ sender: 's10@test.edu', subject: '10', body: '' });
  queue.enqueue({ sender: 's11@test.edu', subject: '11', body: '' });
  assert.equal(queue.front, 8);
  assert.equal(queue.rear, 1);
  assert.deepEqual(queue.pending().map(({ index, email }) => [index, email.id]), [[8, 9], [9, 10], [0, 11], [1, 12]]);
  assert.equal(queue.peek().id, 9);
  assert.equal(queue.count, 4);
});

test('underflow leaves pointers unchanged; reset clears queue and counters', () => {
  const queue = new CircularQueue();
  assert.equal(queue.dequeue(), null);
  assert.equal(queue.assessNext(), null);
  assert.deepEqual([queue.front, queue.rear, queue.count], [0, -1, 0]);
  queue.enqueue(SAMPLE_EMAILS[1]);
  assert.equal(queue.assessNext().verdict, 'SAFE');
  assert.equal(queue.safeCount, 1);
  queue.reset();
  assert.deepEqual([queue.front, queue.rear, queue.count, queue.nextId, queue.safeCount], [0, -1, 0, 1, 0]);
  assert.equal(queue.slots.filter(Boolean).length, 0);
});
