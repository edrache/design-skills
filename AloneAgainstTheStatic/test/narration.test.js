import test from "node:test";
import assert from "node:assert/strict";
import { applyNarrationScript, buildDialogueTurns, narrationScriptFor, parseOptions, run } from "../tools/build-narration.mjs";

test("generator rozdziela narratora, Alex i szept Charliego", () => {
  const turns = buildDialogueTurns(
    "Droga. [alex]„Pomogę.”[/alex] [charlie][whisper]„Nie.”[/whisper][/charlie] [horror]Las patrzy.[/horror]",
    { protagonist: "alex" },
  );

  assert.deepEqual(turns.map(({ speaker, text }) => ({ speaker, text })), [
    { speaker: "narrator", text: "Droga." },
    { speaker: "alex", text: "„Pomogę.”" },
    { speaker: "charlie", text: "[whispering] „Nie.”" },
    { speaker: "narrator", text: "[tense, frightened, ominous] Las patrzy." },
  ]);
});

test("znacznik you przyjmuje głos wybranego bohatera", () => {
  const [turn] = buildDialogueTurns("[you]„Jestem tutaj.”[/you]", { protagonist: "charlie" });
  assert.equal(turn.speaker, "charlie");
});

test("emocjonalny skrypt dodaje tagi bez zmiany mówcy ani wypowiadanych słów", () => {
  const base = buildDialogueTurns('[alex]„Pomogę.”[/alex] — mówisz.', { protagonist: "alex" });
  const scripted = applyNarrationScript(base, [
    { speaker: "alex", text: "[calm] [warmly] „Pomogę.”" },
    { speaker: "narrator", text: "[quietly] — mówisz." },
  ], "pl:próba");

  assert.equal(scripted[0].text, "[calm] [warmly] „Pomogę.”");
  assert.equal(scripted[1].text, "[quietly] — mówisz.");
  assert.throws(
    () => applyNarrationScript(base, [
      { speaker: "alex", text: "[calm] „Zmienione.”" },
      { speaker: "narrator", text: "[quietly] — mówisz." },
    ], "pl:próba"),
    /zmienia wypowiadany tekst/,
  );
});

test("wspólny akapit może mieć osobny emocjonalny skrypt dla każdego bohatera", () => {
  const alex = [{ speaker: "alex", text: "[afraid] Alex" }];
  const charlie = [{ speaker: "charlie", text: "[shaken] Charlie" }];
  const scripts = { alex, charlie };
  assert.equal(narrationScriptFor(scripts, "alex"), alex);
  assert.equal(narrationScriptFor(scripts, "charlie"), charlie);
  assert.equal(narrationScriptFor(alex, "charlie"), alex);
});

test("domyślny pilot obejmuje polskie wpisy 1, 3 i 7 bez potwierdzenia płatności", () => {
  assert.deepEqual(parseOptions([]), {
    entries: [1, 3, 7],
    locales: ["pl"],
    protagonist: "alex",
    confirm: false,
    force: false,
    variant: false,
    requireScript: false,
    concurrency: 1,
  });
});

test("generator przyjmuje bezpieczną równoległość i wariant bohatera", () => {
  const options = parseOptions(["--variant", "--require-script", "--concurrency", "3", "--protagonist", "charlie"]);
  assert.equal(options.variant, true);
  assert.equal(options.requireScript, true);
  assert.equal(options.concurrency, 3);
  assert.equal(options.protagonist, "charlie");
  assert.throws(() => parseOptions(["--concurrency", "4"]), /od 1 do 3/);
});

test("kosztorys pilota tworzy 11 zadań i nie wymaga klucza API", async () => {
  const originalLog = console.log;
  console.log = () => {};
  try {
    const result = await run([]);
    assert.equal(result.jobs.length, 11);
    assert.ok(result.total > 0);
    assert.equal(result.generated, 0);
  } finally {
    console.log = originalLog;
  }
});

test("płatny tryb odrzuca ID lub sekret złej długości przed wykonaniem żądania", async () => {
  const previous = process.env.ELEVENLABS_API_KEY;
  process.env.ELEVENLABS_API_KEY = "api-key-id-not-a-secret";
  const originalLog = console.log;
  console.log = () => {};
  try {
    await assert.rejects(() => run(["--confirm"]), /nie jest sekretem ElevenLabs/);
  } finally {
    console.log = originalLog;
    if (previous === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = previous;
  }
});
