import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

const VERSION_FILES = new Set([
  'package.json',
  'config.js',
  'index.html',
  'src/main.js',
]);

const FRONTEND_PATH_PREFIXES = ['src/', 'assets/'];
const FRONTEND_EXACT_FILES = new Set(['index.html', 'config.js']);

function readProjectFile(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function matchRequired(source, regex, label) {
  const match = source.match(regex);
  if (!match) {
    throw new Error(`Nie znaleziono ${label}.`);
  }
  return match[1];
}

function collectChangedFiles() {
  try {
    const output = execFileSync('git', ['diff', '--name-only', 'HEAD', '--', 'Flametown/prototype'], {
      cwd: path.resolve(projectRoot, '..', '..'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^Flametown\/prototype\//, ''));
  } catch {
    return [];
  }
}

function isFrontendFile(relativePath) {
  return FRONTEND_EXACT_FILES.has(relativePath)
    || FRONTEND_PATH_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

function formatList(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

const packageJson = JSON.parse(readProjectFile('package.json'));
const configJs = readProjectFile('config.js');
const indexHtml = readProjectFile('index.html');
const mainJs = readProjectFile('src/main.js');

const packageVersion = packageJson.version;
const configVersion = matchRequired(
  configJs,
  /export const APP_VERSION = '([^']+)'/,
  'APP_VERSION w config.js'
);
const badgeVersion = matchRequired(
  indexHtml,
  /data-version="([^"]+)"/,
  'data-version w index.html'
);
const mainEntryVersion = matchRequired(
  indexHtml,
  /src\/main\.js\?v=([^"]+)"/,
  'query string src/main.js w index.html'
);
const tutorialImportVersion = matchRequired(
  mainJs,
  /tutorial\.js\?v=([^']+)'/,
  'query string tutorial.js w src/main.js'
);
const uiImportVersion = matchRequired(
  mainJs,
  /ui\.js\?v=([^']+)'/,
  'query string ui.js w src/main.js'
);

const expectedVersion = packageVersion;
const mismatches = [
  ['config.js APP_VERSION', configVersion],
  ['index.html data-version', badgeVersion],
  ['index.html src/main.js?v=', mainEntryVersion],
  ['src/main.js tutorial.js?v=', tutorialImportVersion],
  ['src/main.js ui.js?v=', uiImportVersion],
].filter(([, value]) => value !== expectedVersion);

if (mismatches.length > 0) {
  const details = mismatches.map(([label, value]) => `${label}: ${value} (oczekiwano ${expectedVersion})`);
  throw new Error(`Niespójne wersje:\n${formatList(details)}`);
}

const changedFiles = collectChangedFiles();
const changedFrontendFiles = changedFiles.filter(isFrontendFile);
const changedVersionFiles = changedFiles.filter((relativePath) => VERSION_FILES.has(relativePath));

if (changedFrontendFiles.length > 0 && changedVersionFiles.length === 0) {
  throw new Error(
    `Frontend zmieniony bez podbicia wersji lub cache-bustingu.\n` +
      `Zmienione pliki frontendowe:\n${formatList(changedFrontendFiles)}\n` +
      `Dotknij co najmniej jednego z plikow wersjonujacych:\n${formatList([...VERSION_FILES])}`
  );
}

console.log(`release-check OK: wersja ${expectedVersion}`);
