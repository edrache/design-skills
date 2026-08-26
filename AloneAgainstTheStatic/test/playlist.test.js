import test from "node:test";
import assert from "node:assert/strict";
import { createPlaylist } from "../src/ui/playlist.js";

// Deterministyczny RNG: kolejne wartości z listy, potem cyklicznie od początku.
function sequence(values) {
  let index = 0;
  return () => values[index++ % values.length];
}

test("pusta pula zawsze zwraca null", () => {
  const playlist = createPlaylist([], sequence([0]));
  assert.equal(playlist.next(), null);
  assert.equal(playlist.next(), null);
});

test("nie-tablica i nietekstowe wpisy są ignorowane", () => {
  assert.equal(createPlaylist(null).next(), null);
  const playlist = createPlaylist(["a.mp3", "", 7, null, "  "], sequence([0]));
  assert.equal(playlist.next(), "a.mp3");
  assert.equal(playlist.next(), "a.mp3");
});

test("pojedynczy utwór powtarza się w kółko", () => {
  const playlist = createPlaylist(["solo.mp3"], sequence([0.5]));
  assert.equal(playlist.next(), "solo.mp3");
  assert.equal(playlist.next(), "solo.mp3");
});

test("runda odtwarza każdy utwór dokładnie raz", () => {
  const tracks = ["a.mp3", "b.mp3", "c.mp3", "d.mp3"];
  const playlist = createPlaylist(tracks, sequence([0.7, 0.1, 0.9, 0.3]));
  const round = [playlist.next(), playlist.next(), playlist.next(), playlist.next()];

  assert.deepEqual([...round].sort(), [...tracks].sort());
});

test("kolejna runda jest tasowana ponownie i nie zaczyna od ostatniego utworu", () => {
  const tracks = ["a.mp3", "b.mp3", "c.mp3"];
  // Losowanie zwraca zawsze 0, więc tasowanie samo z siebie odtwarzałoby tę
  // samą kolejność — powtórka na styku rund musi być usunięta jawnie.
  const playlist = createPlaylist(tracks, () => 0);

  const first = [playlist.next(), playlist.next(), playlist.next()];
  const second = [playlist.next(), playlist.next(), playlist.next()];

  assert.deepEqual([...second].sort(), [...tracks].sort());
  assert.notEqual(second[0], first[2]);
});

test("żaden utwór nie powtarza się pod rząd przez wiele rund", () => {
  const tracks = ["a.mp3", "b.mp3", "c.mp3", "d.mp3", "e.mp3"];
  const random = sequence([0.13, 0.87, 0.42, 0.66, 0.05, 0.91, 0.28]);
  const playlist = createPlaylist(tracks, random);

  let previous = playlist.next();
  for (let index = 0; index < 200; index += 1) {
    const current = playlist.next();
    assert.notEqual(current, previous, `powtórka po ${index} utworach`);
    previous = current;
  }
});

test("niepoprawny RNG nie wywraca playlisty", () => {
  const playlist = createPlaylist(["a.mp3", "b.mp3"], () => Number.NaN);
  assert.ok(["a.mp3", "b.mp3"].includes(playlist.next()));
  assert.ok(["a.mp3", "b.mp3"].includes(playlist.next()));
});
