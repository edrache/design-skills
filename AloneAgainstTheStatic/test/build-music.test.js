import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectTracks } from "../tools/build-music.mjs";

function withFiles(names) {
  const dir = mkdtempSync(join(tmpdir(), "aats-music-"));
  for (const name of names) writeFileSync(join(dir, name), "");
  return dir;
}

test("brak katalogu oznacza pustą listę", () => {
  assert.deepEqual(collectTracks(join(tmpdir(), "aats-music-nie-istnieje")), []);
});

test("bierze tylko pliki dźwiękowe i porządkuje je alfabetycznie", () => {
  const dir = withFiles(["b.mp3", "a.MP3", ".gitkeep", "okladka.png", "c.ogg", ".ukryty.mp3"]);

  assert.deepEqual(collectTracks(dir), [
    "media/music/a.MP3",
    "media/music/b.mp3",
    "media/music/c.ogg",
  ]);
});

test("podkatalogi nie trafiają do spisu", () => {
  const dir = withFiles(["a.mp3"]);
  mkdirSync(join(dir, "archiwum.mp3"));

  assert.deepEqual(collectTracks(dir), ["media/music/a.mp3"]);
});
