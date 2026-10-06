// Νέα έκδοση: έλεγχος σε κάθε άνοιγμα και μήνυμα με κουμπί ανανέωσης, χωρίς αριθμό έκδοσης.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { watchUpdates } from '../js/updates.js';

function fakes({ controller = {} } = {}) {
  const handlers = {}, winHandlers = {}, docHandlers = {}, calls = { register: 0, update: 0 };
  const registration = { update: async () => { calls.update++; } };
  const serviceWorker = { controller, addEventListener: (type, fn) => { handlers[type] = fn; }, register: async () => { calls.register++; return registration; } };
  const win = { addEventListener: (type, fn) => { winHandlers[type] = fn; } };
  const doc = { visibilityState: 'visible', addEventListener: (type, fn) => { docHandlers[type] = fn; } };
  const note = { hidden: true };
  return { handlers, winHandlers, docHandlers, calls, serviceWorker, win, doc, note };
}

test('an update that takes control of an already installed app shows the message', async () => {
  const f = fakes();
  assert.equal(watchUpdates(f.note, { serviceWorker: f.serviceWorker, hostname: 'example.github.io', win: f.win, doc: f.doc }), true);
  await f.winHandlers.load();
  assert.equal(f.calls.register, 1);
  assert.equal(f.calls.update, 1, 'checks for a new version at launch');
  f.handlers.controllerchange();
  assert.equal(f.note.hidden, false);
});

test('the first installation never shows the message', () => {
  const f = fakes({ controller: null });
  watchUpdates(f.note, { serviceWorker: f.serviceWorker, hostname: 'example.github.io', win: f.win, doc: f.doc });
  f.handlers.controllerchange();
  assert.equal(f.note.hidden, true);
  f.handlers.controllerchange();
  assert.equal(f.note.hidden, false, 'a later update does');
});

test('returning to the app checks for a new version again', async () => {
  const f = fakes();
  watchUpdates(f.note, { serviceWorker: f.serviceWorker, hostname: 'example.github.io', win: f.win, doc: f.doc });
  await f.winHandlers.load();
  f.doc.visibilityState = 'hidden'; f.docHandlers.visibilitychange();
  f.doc.visibilityState = 'visible'; f.docHandlers.visibilitychange();
  assert.equal(f.calls.update, 2);
});

test('local testing and browsers without service workers run the app as before', () => {
  const f = fakes();
  assert.equal(watchUpdates(f.note, { serviceWorker: f.serviceWorker, hostname: 'localhost', win: f.win, doc: f.doc }), false);
  assert.equal(watchUpdates(f.note, { serviceWorker: undefined, hostname: 'example.github.io', win: f.win, doc: f.doc }), false);
  assert.equal(f.calls.register, 0);
});

test('a failed registration is silent', async () => {
  const f = fakes();
  f.serviceWorker.register = async () => { throw new Error('no'); };
  watchUpdates(f.note, { serviceWorker: f.serviceWorker, hostname: 'example.github.io', win: f.win, doc: f.doc });
  await assert.doesNotReject(f.winHandlers.load());
});

test('no version number is shown anywhere in the interface', () => {
  for (const file of ['../js/main.js', '../js/updates.js', '../js/ui/settings.js']) {
    assert.doesNotMatch(readFileSync(new URL(file, import.meta.url), 'utf8'), /APP_VERSION/);
  }
});
