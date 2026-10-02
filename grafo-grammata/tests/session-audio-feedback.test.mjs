import test from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../js/session.js';

function setup() {
  const pending = [], hints = [];
  const session = Object.assign(Object.create(Session.prototype), {
    letter: { phonemeAudio: 'a.wav' },
    phonemes: { play: () => new Promise(resolve => pending.push(resolve)) },
    feedback: { clearHint() {}, hint: text => hints.push(text) },
  });
  return { session, pending, hints };
}

test('a failed sound tells the user to retry; a successful retry is silent', async () => {
  const { session, pending, hints } = setup();
  const failed = session.repeatPhoneme(); pending.shift()(false); await failed;
  assert.deepEqual(hints, ['Δεν ακούστηκε ο ήχος. Πάτησε ξανά.']);
  const retry = session.repeatPhoneme(); pending.shift()(true); assert.equal(await retry, true);
  assert.equal(hints.length, 1);
});

test('a late superseded failure cannot replace feedback for a newer playback', async () => {
  const { session, pending, hints } = setup();
  const old = session.repeatPhoneme(); const current = session.repeatPhoneme();
  pending[1](true); await current; pending[0](false); await old;
  assert.equal(hints.length, 0);
});

test('changing the letter suppresses an old phoneme failure message', async () => {
  const { session, pending, hints } = setup();
  const old = session.repeatPhoneme(); session.letter = { phonemeAudio: 'v.wav' };
  pending[0](false); await old; assert.equal(hints.length, 0);
});
