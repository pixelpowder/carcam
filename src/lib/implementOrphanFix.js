// Backend agent that implements an orphan-fix recommendation by:
// 1. Reading the source JSX file via GitHub API
// 2. Asking Claude to generate the JSX edit (insertion point + new <p> line)
// 3. Reading each locale JSON and adding the 3 new i18n keys
// 4. Committing all changes to a feature branch
// 5. Opening a PR for review
//
// The Claude call is small and tightly-scoped — just decides the insertion
// point in the JSX. Everything else is deterministic Octokit work.
//
// Required env on Vercel:
//   GITHUB_TOKEN    — PAT with `repo` scope on the target site repo
//   ANTHROPIC_API_KEY — for the Claude API call
//
// Repo / file conventions (configurable per site via siteRoot mapping):
//   - JSX components live under src/components/pages/...
//   - i18n locales at src/i18n/locales/{en,de,fr,it,me,pl,ru}.json
//   - Default branch is master

import { Octokit } from '@octokit/rest';
import { buildProseForEdge } from './orphanFixProseTemplates.js';
import { squashMergeAndCleanup } from './githubMerge.js';

const LOCALES = ['en', 'de', 'fr', 'it', 'me', 'pl', 'ru'];

// Map siteId to GitHub repo. Mirror the SiteContext list — could be moved
// there if we add more sites.
const SITE_REPOS = {
  montenegrocarhire: { owner: 'pixelpowder', repo: 'montenegro-car-hire', defaultBranch: 'master' },
};

// Map source page path → JSX file relative to repo root, plus the i18n
// namespace its content lives under (used as the <p>{t('NS.xxx')}</p> prefix).
// Keys are normalised paths from carcam's link-graph crawler.
const SOURCE_FILES = {
  '/': { file: 'src/components/HomeClient.jsx', namespace: 'home' },
  '/about': { file: 'src/components/pages/About.jsx', namespace: 'aboutBody' },
  '/kotor': { file: 'src/components/pages/Kotor.jsx', namespace: 'kotorBody' },
  '/budva': { file: 'src/components/pages/Budva.jsx', namespace: 'budvaBody' },
  '/tivat': { file: 'src/components/pages/Tivat.jsx', namespace: 'tivatBody' },
  '/podgorica': { file: 'src/components/pages/Podgorica.jsx', namespace: 'podgoricaBody' },
  '/perast': { file: 'src/components/pages/Perast.jsx', namespace: 'perastBody' },
  '/herceg-novi': { file: 'src/components/pages/HercegNovi.jsx', namespace: 'hercegNoviBody' },
  '/ulcinj': { file: 'src/components/pages/Ulcinj.jsx', namespace: 'ulcinjBody' },
  '/bar': { file: 'src/components/pages/Bar.jsx', namespace: 'barBody' },
  '/niksic': { file: 'src/components/pages/Niksic.jsx', namespace: 'niksicBody' },
  '/montenegro': { file: 'src/components/pages/Montenegro.jsx', namespace: 'montenegroBody' },
  '/podgorica-airport': { file: 'src/components/pages/PodgoricaAirport.jsx', namespace: 'podgoricaAirportBody' },
  '/tivat-airport': { file: 'src/components/pages/TivatAirport.jsx', namespace: 'tivatAirportBody' },
  '/dubrovnik-airport': { file: 'src/components/pages/DubrovnikAirport.jsx', namespace: 'dubrovnikAirportBody' },
  '/border-crossing-guide': { file: 'src/components/pages/BorderCrossing.jsx', namespace: 'borderCrossingBody' },
  '/montenegro-driving-guide': { file: 'src/components/pages/DrivingGuide.jsx', namespace: 'drivingGuideBody' },
  '/blog/montenegro-road-trip-10-days': { file: 'src/components/pages/blog/MontenegroRoadTrip10Days.jsx', namespace: 'blogRoadtrip' },
  '/blog/montenegro-camping-car': { file: 'src/components/pages/blog/MontenegroCampingCar.jsx', namespace: 'blogCamping' },
  '/blog/montenegro-beaches-by-car': { file: 'src/components/pages/blog/MontenegroBeachesByCar.jsx', namespace: 'blogBeaches' },
  '/blog/montenegro-monasteries-circuit': { file: 'src/components/pages/blog/MontenegroMonasteriesCircuit.jsx', namespace: 'blogMonasteries' },
  '/blog/montenegro-mountain-passes': { file: 'src/components/pages/blog/MontenegroMountainPasses.jsx', namespace: 'blogPasses' },
  '/blog/montenegro-national-parks': { file: 'src/components/pages/blog/MontenegroNationalParks.jsx', namespace: 'blogParks' },
  '/blog/montenegro-autumn-colours': { file: 'src/components/pages/blog/MontenegroAutumnColours.jsx', namespace: 'blogAutumn' },
  '/blog/montenegro-wine-road': { file: 'src/components/pages/blog/MontenegroWineRoad.jsx', namespace: 'blogWine' },
  '/blog/tara-river-canyon-drive': { file: 'src/components/pages/blog/TaraRiverCanyonDrive.jsx', namespace: 'blogTara' },
};

function octokit() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN env var not set');
  return new Octokit({ auth: token });
}

async function getFile(gh, owner, repo, path, ref) {
  const { data } = await gh.repos.getContent({ owner, repo, path, ref });
  if (Array.isArray(data) || data.type !== 'file') throw new Error(`${path} is not a file`);
  return { sha: data.sha, content: Buffer.from(data.content, 'base64').toString('utf8') };
}

async function putFile(gh, owner, repo, path, branch, content, sha, message) {
  await gh.repos.createOrUpdateFileContents({
    owner, repo, path, branch, message,
    content: Buffer.from(content, 'utf8').toString('base64'),
    sha,
  });
}

// Insert a new <p> with link into the source JSX deterministically.
// Strategy: find the closing </ContentPage> tag and insert just before it,
// so the new paragraph appears at the END of the page body. If that fails,
// fall back to inserting after the first <p> we find.
//
// The new <p> uses the same i18n pattern as round 1's hand-written links.
function generateJsxEdit({ jsxContent, namespace, linkKeyBase, targetPath }) {
  const newP = `      <p>{t('${namespace}.${linkKeyBase}Pre')}<a href={localePath('${targetPath}')}>{t('${namespace}.${linkKeyBase}Text')}</a>{t('${namespace}.${linkKeyBase}Post')}</p>\n    `;

  // Insertion candidate 1: just before </ContentPage>
  if (/<\/ContentPage>/.test(jsxContent)) {
    return jsxContent.replace(/(\s*)<\/ContentPage>/, `\n${newP}$1</ContentPage>`);
  }
  // Insertion candidate 2: just before final </> or </div> (rare fallback)
  if (/<\/>\s*\)\s*;?\s*\}/.test(jsxContent)) {
    return jsxContent.replace(/(\s*)<\/>\s*\)/, `\n${newP}$1</>\n    )`);
  }
  // Final fallback: append after the first <p>{t('...intro...')}</p>
  return jsxContent.replace(
    /(<p>\{t\('[^']+'\)\}<\/p>)/,
    `$1\n${newP.trim()}`
  );
}

// The recommendation object passed in is the carcam orphan-fix list entry,
// limited to one source. We build one PR per (target, source) implementation
// so each is reviewable independently.
//
// Param shape:
//   { siteId, targetPath, sourcePage, anchorMatrix }
// anchorMatrix is the per-locale variant pool from the orphan-fix entry.
// We pick the next un-used variant for this source via deterministic hash.
export async function implementOrphanFix({ siteId, targetPath, sourcePage, anchorVariant, anchorMatrix }) {
  const repoCfg = SITE_REPOS[siteId];
  if (!repoCfg) throw new Error(`No repo configured for siteId ${siteId}`);
  const sourceCfg = SOURCE_FILES[sourcePage];
  if (!sourceCfg) throw new Error(`No source-file mapping for ${sourcePage}`);

  const { owner, repo, defaultBranch } = repoCfg;
  const gh = octokit();

  // Branch name encodes the action so it's findable
  const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  const branch = `seo/orphan-${slug(sourcePage)}-to-${slug(targetPath)}`;

  // Resolve link key base (e.g. "podgoricaAirportLink") so it's unique to
  // the (source namespace, target) pair. Just use the target's slug.
  const linkKeyBase = slug(targetPath).replace(/-airport$/, 'Airport').replace(/-/g, '');
  // Normalise: e.g. /podgorica → "podgoricaLink", /podgorica-airport → "podgoricaAirportLink"
  const baseKey = sourcePage === '/' ? 'home' : '';
  const camelKey = targetPath.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + 'Link';

  // 1. Get default branch SHA so we can branch off it
  const { data: refData } = await gh.git.getRef({ owner, repo, ref: `heads/${defaultBranch}` });
  const baseSha = refData.object.sha;

  // 2. Create the feature branch (delete first if exists from a prior run)
  try {
    await gh.git.deleteRef({ owner, repo, ref: `heads/${branch}` });
  } catch { /* branch didn't exist, fine */ }
  await gh.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha: baseSha });

  // 3. Generate locale-natural prose for all 7 locales (template-driven, no API)
  const prose = buildProseForEdge({
    sourcePath: sourcePage,
    targetPath,
    anchorVariant,
    anchorMatrix,
  });

  // 4. Modify the source JSX (deterministic insertion, no API)
  const jsxFile = await getFile(gh, owner, repo, sourceCfg.file, branch);
  const updatedJsx = generateJsxEdit({
    jsxContent: jsxFile.content,
    namespace: sourceCfg.namespace,
    linkKeyBase: camelKey,
    targetPath,
  });
  if (updatedJsx === jsxFile.content) {
    throw new Error('JSX insertion failed — no anchor pattern matched');
  }
  await putFile(gh, owner, repo, sourceCfg.file, branch, updatedJsx, jsxFile.sha,
    `feat: add inbound link from ${sourcePage} to ${targetPath}`);

  // 5. Add i18n keys to all 7 locales using the prose templates
  for (const loc of LOCALES) {
    const path = `src/i18n/locales/${loc}.json`;
    const { sha, content } = await getFile(gh, owner, repo, path, branch);
    const data = JSON.parse(content);
    if (!data[sourceCfg.namespace]) data[sourceCfg.namespace] = {};
    const ns = data[sourceCfg.namespace];

    const localeProse = prose[loc] || prose.en;
    ns[`${camelKey}Pre`] = localeProse.pre;
    ns[`${camelKey}Text`] = localeProse.anchor;
    ns[`${camelKey}Post`] = localeProse.post;

    const updated = JSON.stringify(data, null, 2) + '\n';
    await putFile(gh, owner, repo, path, branch, updated, sha,
      `i18n(${loc}): add link keys for ${sourcePage} → ${targetPath}`);
  }

  // 5. Open the PR
  const pr = await gh.pulls.create({
    owner, repo, head: branch, base: defaultBranch,
    title: `SEO: add inbound link from ${sourcePage} to ${targetPath}`,
    body: [
      `Auto-generated by carcam Internal Links agent.`,
      ``,
      `**Target:** \`${targetPath}\``,
      `**Source:** \`${sourcePage}\``,
      `**Anchor variant:** ${anchorVariant?.label || 'unknown'} — "${anchorVariant?.text || ''}"`,
      ``,
      `Adds a new contextual \`<p>\` with a link in the source page, plus translated i18n keys for all 7 locales.`,
      ``,
      `Review the diff carefully — the wrapper sentence ("See our ... page for details") is a generic template; you may want to edit it for natural prose before merging.`,
    ].join('\n'),
  });

  // Auto-merge the PR (squash) — solo workflow, paper trail kept via PR
  const { merged, mergeError } = await squashMergeAndCleanup({
    gh, owner, repo,
    pullNumber: pr.data.number,
    branch,
    title: `SEO: add inbound link from ${sourcePage} to ${targetPath}`,
  });

  return { prUrl: pr.data.html_url, branch, prNumber: pr.data.number, merged, mergeError };
}
