import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { updateTextFile, validateTextValue } from "../tools/tag-editor-server.mjs";

test("walidacja edytora odrzuca uszkodzone znaczniki", () => {
  assert.deepEqual(validateTextValue("[horror]szum").errors, ["Niedomknięty znacznik [horror]."]);
  assert.deepEqual(validateTextValue("szum[/radio]").errors, ["Zamknięcie [/radio] nie ma pasującego otwarcia."]);
  assert.deepEqual(validateTextValue("[radio]szum[/radio]").errors, []);
});

test("zapisuje wskazany tekst atomowo i zachowuje resztę pliku", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "static-tag-editor-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const dataDir = pathToFileURL(`${directory}/`);
  const file = new URL("text.pl.json", dataDir);
  await writeFile(file, `${JSON.stringify({ "e1.p1": "Stary", "e1.p2": "Bez zmian" }, null, 2)}\n`);

  const result = await updateTextFile({
    locale: "pl",
    key: "e1.p1",
    value: "[horror]Nowy[/horror]",
    expected: "Stary",
    dataDir,
  });
  const saved = JSON.parse(await readFile(file, "utf8"));
  assert.equal(result.value, "[horror]Nowy[/horror]");
  assert.deepEqual(saved, { "e1.p1": "[horror]Nowy[/horror]", "e1.p2": "Bez zmian" });
});

test("nie nadpisuje tekstu zmienionego poza edytorem", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "static-tag-editor-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const dataDir = pathToFileURL(`${directory}/`);
  await writeFile(new URL("text.en.json", dataDir), '{"e2.p1":"Wersja z dysku"}\n');

  await assert.rejects(
    updateTextFile({ locale: "en", key: "e2.p1", value: "Nowa", expected: "Nieaktualna", dataDir }),
    (error) => error.status === 409 && error.current === "Wersja z dysku",
  );
});
