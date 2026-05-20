/* ==========================================================================
   STATE.JS — central app state + data loader.

   The `state` object is a singleton imported by every module that needs to
   read or mutate application state (app, shell, wizard, views, pages).
   Keeping it in its own module avoids the circular-dependency problem we
   would otherwise hit if `state` lived in app.js and shell.js needed it.

   On-disk JSON conforms to docs/DATAMODEL.md (canonical schema). In-memory
   records get two convenience aliases injected at load time:
     • `id`      → mirrors the entity's canonical PK (applicationId, tenancyId, …)
     • `address` → composed display string from the atomic fields
                   (street / houseNumber / postalCode / city) so render code
                   can use a single string without dragging the Tidy-data
                   split through the UI.
   The originals stay on the record; aliases are read-only conveniences.
   ========================================================================== */

import { formatAddressLine, flattenFeature, safeGet, safeSet, safeRemove } from './lib.js';

export const state = {
  user: null,                  // { id, name, ve, roles, activeRole }
  applications: [],            // loaded from data/applications.json
  referenceData: null,         // loaded from data/reference-data.json
  buildings: [],               // loaded from data/buildings.json
  users: [],                   // loaded from data/users.json
  tenancies: [],               // loaded from data/tenancies.json
  news: [],                    // loaded from data/news.json
  documents: [],               // loaded from data/documents.json (canonical Document records per § 6.2)
  downloads: null,             // loaded from data/downloads.json (UI download lists: regulations, strategies, training, propertyDetail)
  page: 'home',                // current route id
  params: {},                  // route params
  draft: null,                 // current wizard draft
  pendingNotice: null,         // queued notification banner text
};

export async function loadData(basePath = 'data/') {
  const [apps, reference, users, buildingsFc, tenancies, news, documents, downloads] = await Promise.all([
    fetch(basePath + 'applications.json').then(r => r.json()),
    fetch(basePath + 'reference-data.json').then(r => r.json()),
    fetch(basePath + 'users.json').then(r => r.json()),
    fetch(basePath + 'buildings.geojson').then(r => r.json()),
    fetch(basePath + 'tenancies.json').then(r => r.json()).catch(() => []),
    fetch(basePath + 'news.json').then(r => r.json()).catch(() => []),
    fetch(basePath + 'documents.json').then(r => r.json()).catch(() => []),
    fetch(basePath + 'downloads.json').then(r => r.json()).catch(() => ({ regulations: [], strategies: [], training: [], propertyDetail: [] })),
  ]);
  state.applications = apps.map(a => ({ ...a, id: a.applicationId, type: a.applicationType, address: formatAddressLine(a) }));
  state.referenceData = reference;
  state.users = users.map(u => ({ ...u, id: u.userId }));
  state.buildings = (buildingsFc.features || []).map(flattenFeature).map(b => ({ ...b, id: b.buildingId, address: formatAddressLine(b) }));
  state.tenancies = tenancies.map(t => ({ ...t, id: t.tenancyId, address: formatAddressLine(t) }));
  state.news = news.map(n => ({ ...n, id: n.newsId }));
  state.documents = documents.map(d => ({ ...d, id: d.documentId }));
  state.downloads = downloads;
}


// ── DRAFT + ROLE PERSISTENCE (per-user localStorage) ──────────────────────
// These wrappers keyspace storage by the active user's id so multiple
// federal-IdP accounts on the same browser don't collide. Each is a no-op
// before login (state.user === null).
export function persistDraft(draft) {
  if (!state.user) return;
  safeSet('mp-draft-' + state.user.id, JSON.stringify(draft));
}
export function loadDraft() {
  if (!state.user) return null;
  const raw = safeGet('mp-draft-' + state.user.id);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
export function clearDraft() {
  if (!state.user) return;
  safeRemove('mp-draft-' + state.user.id);
}
export function persistRole(role) {
  if (!state.user) return;
  safeSet('mp-active-role-' + state.user.id, role);
}
// Migrate v0.10.x role names persisted to localStorage before the
// schema rename pass (ILBO → LBO, GS-Prüfer/in → GS-Reviewer).
// Drop unknown values so the user falls back to their first role.
export function loadRole() {
  if (!state.user) return null;
  const raw = safeGet('mp-active-role-' + state.user.id);
  const migrated = ({ 'ILBO': 'LBO', 'GS-Prüfer/in': 'GS-Reviewer' })[raw] || raw;
  if (migrated && !state.user.roles.includes(migrated)) return null;
  return migrated;
}
