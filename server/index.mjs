import { execFileSync } from "node:child_process";
import { createPrivateKey, createSign, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { extname, join, normalize } from "node:path";
import { DatabaseSync } from "node:sqlite";

loadEnvFile();

const PORT = Number(process.env.PORT || 3001);
const SERVER_ORIGIN = process.env.SERVER_ORIGIN || `http://localhost:${PORT}`;
const APP_ORIGIN = process.env.APP_ORIGIN || SERVER_ORIGIN;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_DATA_PORTABILITY_API_KEY = process.env.GOOGLE_DATA_PORTABILITY_API_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.2";
const APPLE_MUSIC_TEAM_ID = process.env.APPLE_MUSIC_TEAM_ID || "";
const APPLE_MUSIC_KEY_ID = process.env.APPLE_MUSIC_KEY_ID || "";
const APPLE_MUSIC_PRIVATE_KEY = process.env.APPLE_MUSIC_PRIVATE_KEY || "";
const APPLE_MUSIC_APP_NAME = process.env.APPLE_MUSIC_APP_NAME || "LUME";
const GOOGLE_AUTH_REDIRECT_URI =
  process.env.GOOGLE_AUTH_REDIRECT_URI || `${SERVER_ORIGIN}/api/auth/google/callback`;
const GOOGLE_ACTIVITY_REDIRECT_URI =
  process.env.GOOGLE_ACTIVITY_REDIRECT_URI || `${SERVER_ORIGIN}/api/google/activity/callback`;
const SESSION_COOKIE = "lume_session";
const JSON_LIMIT = 25 * 1024 * 1024;
const UPLOAD_LIMIT = 150 * 1024 * 1024;
const APPLE_MUSIC_DEVELOPER_TOKEN_TTL = 60 * 60 * 24 * 30;
const DATA_DIR = join(process.cwd(), "data");
const DIST_DIR = join(process.cwd(), "dist");
const DB_PATH = join(DATA_DIR, "lume.sqlite");
const TEMP_DIR = join(DATA_DIR, "tmp");
const LOGIN_SCOPES = "openid email profile";
const GOOGLE_ACTIVITY_RESOURCES = ["myactivity.maps"];
const GOOGLE_ACTIVITY_SCOPES = GOOGLE_ACTIVITY_RESOURCES.map(
  (resource) => `https://www.googleapis.com/auth/dataportability.${resource}`,
).join(" ");
const ALLOWED_ORIGINS = new Set(
  [APP_ORIGIN, SERVER_ORIGIN, ...(process.env.ADDITIONAL_ALLOWED_ORIGINS || "").split(",")]
    .map((origin) => origin.trim())
    .filter(Boolean),
);

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(TEMP_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    google_sub TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    picture TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS oauth_states (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    kind TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS google_activity_grants (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL DEFAULT '',
    access_expires_at TEXT NOT NULL DEFAULT '',
    refresh_token TEXT NOT NULL DEFAULT '',
    scope TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS google_activity_imports (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    archive_job_id TEXT NOT NULL,
    state TEXT NOT NULL,
    access_type TEXT NOT NULL DEFAULT '',
    resource_groups TEXT NOT NULL,
    archive_urls TEXT NOT NULL DEFAULT '[]',
    event_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT NOT NULL DEFAULT '',
    generated_entry_id TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS google_activity_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    import_id TEXT NOT NULL,
    source TEXT NOT NULL,
    title TEXT NOT NULL,
    details TEXT NOT NULL,
    location_text TEXT NOT NULL,
    occurred_at TEXT NOT NULL DEFAULT '',
    raw_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (import_id) REFERENCES google_activity_imports(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS location_snapshots (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy REAL NOT NULL,
    place_name TEXT NOT NULL DEFAULT '',
    captured_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS apple_music_grants (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    music_user_token TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS apple_music_imports (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    state TEXT NOT NULL,
    item_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS apple_music_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    import_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    album_name TEXT NOT NULL,
    played_at TEXT NOT NULL DEFAULT '',
    raw_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (import_id) REFERENCES apple_music_imports(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    mood TEXT NOT NULL,
    screen_time TEXT NOT NULL,
    display_date TEXT NOT NULL,
    summary TEXT NOT NULL,
    highlights TEXT NOT NULL,
    photos TEXT NOT NULL,
    preview TEXT NOT NULL,
    additional_context TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    source_kind TEXT NOT NULL DEFAULT 'google',
    source_import_id TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_imports_user_created_at ON google_activity_imports(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_events_import_id ON google_activity_events(import_id);
  CREATE INDEX IF NOT EXISTS idx_locations_user_time ON location_snapshots(user_id, captured_at DESC);
  CREATE INDEX IF NOT EXISTS idx_apple_music_imports_user_time ON apple_music_imports(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_apple_music_items_import_id ON apple_music_items(import_id);
  CREATE INDEX IF NOT EXISTS idx_entries_user_time ON journal_entries(user_id, created_at DESC);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_entries_source_import
    ON journal_entries(source_import_id)
    WHERE source_import_id <> '';
`);

runMigrations();

const statements = {
  findUserByGoogleSub: db.prepare(`
    SELECT id, google_sub, name, email, picture
    FROM users
    WHERE google_sub = ?
  `),
  findUserByEmail: db.prepare(`
    SELECT id, google_sub, name, email, picture
    FROM users
    WHERE email = ?
  `),
  insertUser: db.prepare(`
    INSERT INTO users (id, google_sub, name, email, picture, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  updateUser: db.prepare(`
    UPDATE users
    SET google_sub = ?, name = ?, email = ?, picture = ?, updated_at = ?
    WHERE id = ?
  `),
  insertSession: db.prepare(`
    INSERT INTO sessions (id, user_id, created_at)
    VALUES (?, ?, ?)
  `),
  findSessionUser: db.prepare(`
    SELECT sessions.id AS session_id, users.id AS user_id, users.name, users.email, users.picture
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.id = ?
  `),
  deleteSession: db.prepare(`
    DELETE FROM sessions
    WHERE id = ?
  `),
  insertOauthState: db.prepare(`
    INSERT INTO oauth_states (id, user_id, kind, created_at)
    VALUES (?, ?, ?, ?)
  `),
  findOauthState: db.prepare(`
    SELECT id, user_id, kind, created_at
    FROM oauth_states
    WHERE id = ?
  `),
  deleteOauthState: db.prepare(`
    DELETE FROM oauth_states
    WHERE id = ?
  `),
  findActivityGrant: db.prepare(`
    SELECT id, user_id, access_token, access_expires_at, refresh_token, scope
    FROM google_activity_grants
    WHERE user_id = ?
  `),
  insertActivityGrant: db.prepare(`
    INSERT INTO google_activity_grants (
      id, user_id, access_token, access_expires_at, refresh_token, scope, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updateActivityGrant: db.prepare(`
    UPDATE google_activity_grants
    SET access_token = ?, access_expires_at = ?, refresh_token = ?, scope = ?, updated_at = ?
    WHERE user_id = ?
  `),
  latestImportByUser: db.prepare(`
    SELECT
      id,
      user_id,
      archive_job_id,
      state,
      access_type,
      resource_groups,
      archive_urls,
      event_count,
      error_message,
      created_at,
      updated_at,
      completed_at,
      generated_entry_id
    FROM google_activity_imports
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `),
  importById: db.prepare(`
    SELECT
      id,
      user_id,
      archive_job_id,
      state,
      access_type,
      resource_groups,
      archive_urls,
      event_count,
      error_message,
      created_at,
      updated_at,
      completed_at,
      generated_entry_id
    FROM google_activity_imports
    WHERE id = ?
  `),
  insertImport: db.prepare(`
    INSERT INTO google_activity_imports (
      id,
      user_id,
      archive_job_id,
      state,
      access_type,
      resource_groups,
      archive_urls,
      event_count,
      error_message,
      created_at,
      updated_at,
      completed_at,
      generated_entry_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updateImportState: db.prepare(`
    UPDATE google_activity_imports
    SET state = ?, access_type = ?, archive_urls = ?, event_count = ?, error_message = ?, updated_at = ?, completed_at = ?, generated_entry_id = ?
    WHERE id = ?
  `),
  deleteEventsForImport: db.prepare(`
    DELETE FROM google_activity_events
    WHERE import_id = ?
  `),
  insertEvent: db.prepare(`
    INSERT INTO google_activity_events (
      id, user_id, import_id, source, title, details, location_text, occurred_at, raw_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  latestEventForImport: db.prepare(`
    SELECT title, source
    FROM google_activity_events
    WHERE import_id = ?
    ORDER BY
      CASE WHEN occurred_at = '' THEN 1 ELSE 0 END,
      occurred_at DESC,
      created_at DESC
    LIMIT 1
  `),
  latestLocationByUser: db.prepare(`
    SELECT latitude, longitude, accuracy, place_name, captured_at
    FROM location_snapshots
    WHERE user_id = ?
    ORDER BY captured_at DESC
    LIMIT 1
  `),
  insertLocation: db.prepare(`
    INSERT INTO location_snapshots (id, user_id, latitude, longitude, accuracy, place_name, captured_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  recentEventsByImport: db.prepare(`
    SELECT source, title, details, location_text, occurred_at
    FROM google_activity_events
    WHERE import_id = ?
    ORDER BY
      CASE WHEN occurred_at = '' THEN 1 ELSE 0 END,
      occurred_at DESC,
      created_at DESC
    LIMIT 24
  `),
  findAppleMusicGrant: db.prepare(`
    SELECT id, user_id, music_user_token
    FROM apple_music_grants
    WHERE user_id = ?
  `),
  insertAppleMusicGrant: db.prepare(`
    INSERT INTO apple_music_grants (id, user_id, music_user_token, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `),
  updateAppleMusicGrant: db.prepare(`
    UPDATE apple_music_grants
    SET music_user_token = ?, updated_at = ?
    WHERE user_id = ?
  `),
  latestAppleMusicImportByUser: db.prepare(`
    SELECT id, user_id, state, item_count, error_message, created_at, updated_at, completed_at
    FROM apple_music_imports
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `),
  appleMusicImportById: db.prepare(`
    SELECT id, user_id, state, item_count, error_message, created_at, updated_at, completed_at
    FROM apple_music_imports
    WHERE id = ?
  `),
  insertAppleMusicImport: db.prepare(`
    INSERT INTO apple_music_imports (id, user_id, state, item_count, error_message, created_at, updated_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updateAppleMusicImport: db.prepare(`
    UPDATE apple_music_imports
    SET state = ?, item_count = ?, error_message = ?, updated_at = ?, completed_at = ?
    WHERE id = ?
  `),
  deleteAppleMusicItemsForImport: db.prepare(`
    DELETE FROM apple_music_items
    WHERE import_id = ?
  `),
  insertAppleMusicItem: db.prepare(`
    INSERT INTO apple_music_items (
      id, user_id, import_id, title, artist_name, album_name, played_at, raw_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  latestAppleMusicItemForImport: db.prepare(`
    SELECT title, artist_name
    FROM apple_music_items
    WHERE import_id = ?
    ORDER BY
      CASE WHEN played_at = '' THEN 1 ELSE 0 END,
      played_at DESC,
      created_at DESC
    LIMIT 1
  `),
  recentAppleMusicItemsByImport: db.prepare(`
    SELECT title, artist_name, album_name, played_at
    FROM apple_music_items
    WHERE import_id = ?
    ORDER BY
      CASE WHEN played_at = '' THEN 1 ELSE 0 END,
      played_at DESC,
      created_at DESC
    LIMIT 12
  `),
  listEntriesByUser: db.prepare(`
    SELECT id, title, mood, screen_time, display_date, summary, highlights, photos, preview, additional_context, created_at
    FROM journal_entries
    WHERE user_id = ?
    ORDER BY created_at DESC
  `),
  entryBySourceImport: db.prepare(`
    SELECT id
    FROM journal_entries
    WHERE source_import_id = ?
    LIMIT 1
  `),
  insertEntry: db.prepare(`
    INSERT INTO journal_entries (
      id, user_id, title, mood, screen_time, display_date, summary, highlights, photos, preview, additional_context, created_at, source_kind, source_import_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", SERVER_ORIGIN);

    if (url.pathname.startsWith("/api/")) {
      if (request.method === "OPTIONS") {
        sendNoContent(request, response);
        return;
      }

      await handleApi(request, response, url);
      return;
    }

    serveStatic(response, url.pathname);
  } catch (error) {
    sendJson(request, response, error.statusCode || 500, {
      error: error.message || "Something went wrong on the server.",
    });
  }
});

server.listen(PORT, () => {
  console.log(`LUME server running on ${SERVER_ORIGIN}`);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/config") {
    sendJson(request, response, 200, {
      googleConfigured: Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_DATA_PORTABILITY_API_KEY),
      appleMusicConfigured: Boolean(
        APPLE_MUSIC_TEAM_ID && APPLE_MUSIC_KEY_ID && APPLE_MUSIC_PRIVATE_KEY,
      ),
      openaiConfigured: Boolean(OPENAI_API_KEY),
      serverOrigin: SERVER_ORIGIN,
      appOrigin: APP_ORIGIN,
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/session") {
    const session = getSessionFromRequest(request);
    sendJson(request, response, 200, { session });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/auth/google/start") {
    ensureGoogleConfigured();

    const state = createOauthState(null, "login");
    const authUrl = buildGoogleAuthorizationUrl({
      redirectUri: GOOGLE_AUTH_REDIRECT_URI,
      scope: LOGIN_SCOPES,
      state,
      prompt: "select_account",
    });

    sendRedirect(response, authUrl);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/auth/google/callback") {
    ensureGoogleConfigured();

    if (url.searchParams.get("error")) {
      sendRedirect(response, buildAppRedirect("google-auth-cancelled"));
      return;
    }

    const stateId = url.searchParams.get("state") || "";
    const code = url.searchParams.get("code") || "";
    const state = consumeOauthState(stateId, "login");
    void state;

    if (!code) {
      throw httpError(400, "Google did not return an authorization code.");
    }

    const tokens = await exchangeGoogleCodeForTokens({
      code,
      redirectUri: GOOGLE_AUTH_REDIRECT_URI,
    });
    const profile = await fetchGoogleUserProfile(tokens.access_token);
    const user = upsertGoogleUser(profile);
    const session = createSession(user.id);

    setSessionCookie(response, session.token);
    sendRedirect(response, buildAppRedirect("google-auth-success"));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/logout") {
    const token = getSessionToken(request);
    if (token) {
      statements.deleteSession.run(token);
    }

    clearSessionCookie(response);
    sendJson(request, response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/google/activity/callback") {
    ensureGoogleConfigured();

    if (url.searchParams.get("error")) {
      sendRedirect(response, buildAppRedirect("google-activity-cancelled"));
      return;
    }

    const stateId = url.searchParams.get("state") || "";
    const code = url.searchParams.get("code") || "";
    const state = consumeOauthState(stateId, "activity");

    if (!state.user_id) {
      throw httpError(400, "That Google activity request is no longer valid.");
    }

    const tokens = await exchangeGoogleCodeForTokens({
      code,
      redirectUri: GOOGLE_ACTIVITY_REDIRECT_URI,
    });

    upsertActivityGrant(state.user_id, tokens);

    const archive = await initiatePortabilityArchive(tokens.access_token);
    const importRecord = createImportRecord(state.user_id, archive);
    const finalized = await syncActivityImportForUser(state.user_id, {
      forceImportId: importRecord.id,
      skipRefresh: true,
      accessTokenOverride: tokens.access_token,
    });

    if (finalized.activity.state === "complete") {
      sendRedirect(response, buildAppRedirect("google-activity-complete"));
      return;
    }

    if (finalized.activity.state === "error") {
      sendRedirect(response, buildAppRedirect("google-activity-error", finalized.activity.errorMessage));
      return;
    }

    sendRedirect(response, buildAppRedirect("google-activity-pending"));
    return;
  }

  const session = requireSession(request);

  if (request.method === "GET" && url.pathname === "/api/google/activity/start") {
    ensureGoogleConfigured();

    const state = createOauthState(session.userId, "activity");
    const authUrl = buildGoogleAuthorizationUrl({
      redirectUri: GOOGLE_ACTIVITY_REDIRECT_URI,
      scope: GOOGLE_ACTIVITY_SCOPES,
      state,
      prompt: "consent",
      accessType: "offline",
      includeGrantedScopes: false,
      loginHint: session.email,
    });

    sendRedirect(response, authUrl);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/signals") {
    const payload = await buildSignalsPayload(session.userId);
    sendJson(request, response, 200, payload);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/apple-music/config") {
    if (!isAppleMusicConfigured()) {
      sendJson(request, response, 200, {
        configured: false,
        appName: APPLE_MUSIC_APP_NAME,
      });
      return;
    }

    sendJson(request, response, 200, {
      configured: true,
      developerToken: createAppleMusicDeveloperToken(),
      appName: APPLE_MUSIC_APP_NAME,
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/google/activity/sync") {
    const payload = await syncActivityImportForUser(session.userId);
    sendJson(request, response, 200, payload);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/apple-music/connect") {
    ensureAppleMusicConfigured();
    const body = await readJson(request);
    const payload = await connectAppleMusicForUser(session.userId, body.musicUserToken);
    sendJson(request, response, 200, payload);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/apple-music/sync") {
    ensureAppleMusicConfigured();
    const payload = await syncAppleMusicForUser(session.userId);
    sendJson(request, response, 200, payload);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/google/activity/upload") {
    const rawFileName = Array.isArray(request.headers["x-upload-filename"])
      ? request.headers["x-upload-filename"][0]
      : request.headers["x-upload-filename"] || "";
    const fileName = decodeHeaderValue(rawFileName).slice(0, 200);
    const buffer = await readBinary(request, UPLOAD_LIMIT);
    const roots = extractRootsFromBuffer(buffer, randomUUID(), fileName);
    const importRecord = createUploadedImportRecord(session.userId);

    try {
      const completion = finalizeImportFromRoots(importRecord, roots, {
        accessType: "takeout_upload",
        archiveUrls: [],
        completedAt: new Date().toISOString(),
        emptyMessage:
          "LUME parsed the uploaded archive, but it did not find recent Google Maps activity records.",
      });

      sendJson(request, response, 201, {
        activity: serializeActivityImport(completion.importRecord),
        location: serializeLocation(statements.latestLocationByUser.get(session.userId)),
        entry: completion.entry,
      });
      return;
    } catch (error) {
      updateImportRecord(importRecord.id, {
        state: "ERROR",
        accessType: "takeout_upload",
        archiveUrls: "[]",
        eventCount: 0,
        errorMessage: error.message || "LUME could not read that Takeout archive.",
        completedAt: "",
        generatedEntryId: "",
      });
      throw error;
    }
  }

  if (request.method === "POST" && url.pathname === "/api/location") {
    const body = await readJson(request);
    const location = await saveLocationSnapshot(session.userId, body);
    sendJson(request, response, 201, { location });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/entries") {
    sendJson(request, response, 200, {
      entries: listEntries(session.userId),
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/journals/generate") {
    const body = await readJson(request);
    const entry = await createJournalFromSignals(session.userId, body.additionalContext || "");
    const signals = await buildSignalsPayload(session.userId);
    sendJson(request, response, 201, {
      entry,
      signals,
    });
    return;
  }

  throw httpError(404, "Route not found.");
}

function ensureGoogleConfigured() {
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_DATA_PORTABILITY_API_KEY) {
    return;
  }

  throw httpError(
    500,
    "Google OAuth is not configured yet. Add the Google env vars before using this flow.",
  );
}

function isAppleMusicConfigured() {
  return Boolean(APPLE_MUSIC_TEAM_ID && APPLE_MUSIC_KEY_ID && APPLE_MUSIC_PRIVATE_KEY);
}

function ensureAppleMusicConfigured() {
  if (isAppleMusicConfigured()) {
    return;
  }

  throw httpError(
    500,
    "Apple Music is not configured yet. Add the Apple Music env vars before using this flow.",
  );
}

function createOauthState(userId, kind) {
  const state = randomUUID();
  statements.insertOauthState.run(state, userId || null, kind, new Date().toISOString());
  return state;
}

function consumeOauthState(stateId, expectedKind) {
  const state = statements.findOauthState.get(stateId);
  if (!state || state.kind !== expectedKind) {
    throw httpError(400, "That Google authorization request is no longer valid.");
  }

  statements.deleteOauthState.run(stateId);
  return state;
}

function buildGoogleAuthorizationUrl({
  redirectUri,
  scope,
  state,
  prompt,
  accessType = "",
  includeGrantedScopes = true,
  loginHint = "",
}) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", prompt);
  url.searchParams.set("include_granted_scopes", includeGrantedScopes ? "true" : "false");

  if (accessType) {
    url.searchParams.set("access_type", accessType);
  }

  if (loginHint) {
    url.searchParams.set("login_hint", loginHint);
  }

  return url.toString();
}

async function exchangeGoogleCodeForTokens({ code, redirectUri }) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const payload = await readGoogleJson(response);
  if (!response.ok) {
    throw httpError(502, payload.error_description || "Google token exchange failed.");
  }

  return payload;
}

async function refreshGoogleAccessToken(grant) {
  if (!grant.refresh_token) {
    throw httpError(401, "Reconnect Google Maps so LUME can refresh access to your data.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: grant.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const payload = await readGoogleJson(response);
  if (!response.ok) {
    throw httpError(502, payload.error_description || "Google token refresh failed.");
  }

  upsertActivityGrant(grant.user_id, {
    access_token: payload.access_token,
    expires_in: payload.expires_in,
    refresh_token: grant.refresh_token,
    scope: payload.scope || grant.scope,
  });

  return payload.access_token;
}

async function fetchGoogleUserProfile(accessToken) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await readGoogleJson(response);
  if (!response.ok) {
    throw httpError(502, "Could not read your Google profile.");
  }

  if (!payload.sub || !payload.email) {
    throw httpError(400, "Google did not return enough profile information to sign in.");
  }

  return payload;
}

function upsertGoogleUser(profile) {
  const now = new Date().toISOString();
  const existing =
    statements.findUserByGoogleSub.get(profile.sub) || statements.findUserByEmail.get(profile.email);

  if (!existing) {
    const user = {
      id: randomUUID(),
      google_sub: profile.sub,
      name: stringField(profile.name, 120) || "Google User",
      email: normalizeEmail(profile.email),
      picture: typeof profile.picture === "string" ? profile.picture : "",
    };

    statements.insertUser.run(
      user.id,
      user.google_sub,
      user.name,
      user.email,
      user.picture,
      now,
      now,
    );
    return user;
  }

  statements.updateUser.run(
    profile.sub,
    stringField(profile.name, 120) || existing.name,
    normalizeEmail(profile.email),
    typeof profile.picture === "string" ? profile.picture : existing.picture,
    now,
    existing.id,
  );

  return {
    id: existing.id,
    google_sub: profile.sub,
    name: stringField(profile.name, 120) || existing.name,
    email: normalizeEmail(profile.email),
    picture: typeof profile.picture === "string" ? profile.picture : existing.picture,
  };
}

function createSession(userId) {
  const token = randomUUID();
  statements.insertSession.run(token, userId, new Date().toISOString());
  return { token };
}

function getSessionFromRequest(request) {
  const token = getSessionToken(request);
  if (!token) {
    return null;
  }

  const row = statements.findSessionUser.get(token);
  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    name: row.name,
    email: row.email,
    picture: row.picture,
  };
}

function requireSession(request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    throw httpError(401, "Your session has expired. Log in with Google again to continue.");
  }

  return session;
}

function getSessionToken(request) {
  const cookies = parseCookies(request.headers.cookie || "");
  return cookies[SESSION_COOKIE] || "";
}

function parseCookies(cookieHeader) {
  return cookieHeader.split(";").reduce((accumulator, item) => {
    const [key, ...valueParts] = item.trim().split("=");
    if (!key) {
      return accumulator;
    }

    accumulator[key] = decodeURIComponent(valueParts.join("="));
    return accumulator;
  }, {});
}

function setSessionCookie(response, token) {
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000`,
  );
}

function clearSessionCookie(response) {
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`,
  );
}

function createAppleMusicDeveloperToken() {
  ensureAppleMusicConfigured();

  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + APPLE_MUSIC_DEVELOPER_TOKEN_TTL;
  const header = {
    alg: "ES256",
    kid: APPLE_MUSIC_KEY_ID,
    typ: "JWT",
  };
  const payload = {
    iss: APPLE_MUSIC_TEAM_ID,
    iat: issuedAt,
    exp: expiresAt,
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signer = createSign("SHA256");
  signer.update(`${encodedHeader}.${encodedPayload}`);
  signer.end();

  const key = createPrivateKey(normalizeMultilineSecret(APPLE_MUSIC_PRIVATE_KEY));
  const signature = signer.sign(key);

  return `${encodedHeader}.${encodedPayload}.${toBase64Url(signature)}`;
}

function upsertAppleMusicGrant(userId, musicUserToken) {
  const normalizedToken = stringField(musicUserToken, 4000);
  if (!normalizedToken) {
    throw httpError(400, "Apple Music did not return a usable user token.");
  }

  const now = new Date().toISOString();
  const current = statements.findAppleMusicGrant.get(userId);

  if (!current) {
    statements.insertAppleMusicGrant.run(randomUUID(), userId, normalizedToken, now, now);
    return;
  }

  statements.updateAppleMusicGrant.run(normalizedToken, now, userId);
}

function createAppleMusicImportRecord(userId) {
  const now = new Date().toISOString();
  const record = {
    id: randomUUID(),
    userId,
    state: "IN_PROGRESS",
    itemCount: 0,
    errorMessage: "",
    createdAt: now,
    updatedAt: now,
    completedAt: "",
  };

  statements.insertAppleMusicImport.run(
    record.id,
    record.userId,
    record.state,
    record.itemCount,
    record.errorMessage,
    record.createdAt,
    record.updatedAt,
    record.completedAt,
  );

  return statements.appleMusicImportById.get(record.id);
}

function updateAppleMusicImportRecord(importId, values) {
  const updatedAt = new Date().toISOString();
  statements.updateAppleMusicImport.run(
    values.state,
    Number(values.itemCount || 0),
    values.errorMessage || "",
    updatedAt,
    values.completedAt || "",
    importId,
  );

  return statements.appleMusicImportById.get(importId);
}

async function connectAppleMusicForUser(userId, musicUserToken) {
  upsertAppleMusicGrant(userId, musicUserToken);
  await syncAppleMusicImport(userId);
  return buildSignalsPayload(userId);
}

async function syncAppleMusicForUser(userId) {
  await syncAppleMusicImport(userId);
  return buildSignalsPayload(userId);
}

async function syncAppleMusicImport(userId) {
  const grant = statements.findAppleMusicGrant.get(userId);
  if (!grant?.music_user_token) {
    return null;
  }

  const importRecord = createAppleMusicImportRecord(userId);

  try {
    const payload = await fetchAppleMusicRecentTracks(grant.music_user_token);
    const items = normalizeAppleMusicItems(payload, userId, importRecord.id);

    statements.deleteAppleMusicItemsForImport.run(importRecord.id);
    for (const item of items) {
      statements.insertAppleMusicItem.run(
        item.id,
        item.userId,
        item.importId,
        item.title,
        item.artistName,
        item.albumName,
        item.playedAt,
        item.rawJson,
        item.createdAt,
      );
    }

    return updateAppleMusicImportRecord(importRecord.id, {
      state: "COMPLETE",
      itemCount: items.length,
      errorMessage: items.length
        ? ""
        : "Apple Music connected, but there were no recent listening items available.",
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    return updateAppleMusicImportRecord(importRecord.id, {
      state: "ERROR",
      itemCount: 0,
      errorMessage: error.message || "LUME could not read your Apple Music history.",
      completedAt: "",
    });
  }
}

async function fetchAppleMusicRecentTracks(musicUserToken) {
  const url = new URL("https://api.music.apple.com/v1/me/recent/played/tracks");
  url.searchParams.set("limit", "10");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${createAppleMusicDeveloperToken()}`,
      "Music-User-Token": musicUserToken,
    },
  });

  const payload = await readGoogleJson(response);
  if (!response.ok) {
    throw httpError(
      502,
      extractAppleMusicError(payload, "Apple Music could not return your recent listening history."),
    );
  }

  return payload;
}

function normalizeAppleMusicItems(payload, userId, importId) {
  const items = Array.isArray(payload?.data) ? payload.data : [];
  const seen = new Set();

  return items
    .map((item) => ({
      id: randomUUID(),
      userId,
      importId,
      title: stringField(item?.attributes?.name, 160) || "Unknown track",
      artistName: stringField(item?.attributes?.artistName, 160),
      albumName: stringField(item?.attributes?.albumName, 160),
      playedAt:
        validDateString(
          item?.attributes?.lastPlayedDate ||
            item?.attributes?.playParams?.reportedDate ||
            item?.attributes?.playParams?.date,
        ) || "",
      rawJson: JSON.stringify(item).slice(0, 20_000),
      createdAt: new Date().toISOString(),
    }))
    .filter((item) => {
      const key = `${item.title}|${item.artistName}|${item.playedAt}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return Boolean(item.title);
    });
}

function serializeAppleMusicImport(importRow) {
  if (!importRow) {
    return {
      connected: false,
      state: "not_connected",
      itemCount: 0,
      importedAt: "",
      errorMessage: "",
      latestTitle: "",
      latestArtist: "",
      provider: "Apple Music",
    };
  }

  const latestItem = statements.latestAppleMusicItemForImport.get(importRow.id);
  return {
    connected: true,
    state:
      importRow.state === "COMPLETE"
        ? "complete"
        : importRow.state === "IN_PROGRESS"
          ? "pending"
          : "error",
    itemCount: Number(importRow.item_count || 0),
    importedAt: importRow.completed_at || importRow.updated_at,
    errorMessage: importRow.error_message || "",
    latestTitle: latestItem?.title || "",
    latestArtist: latestItem?.artist_name || "",
    provider: "Apple Music",
  };
}

function upsertActivityGrant(userId, tokens) {
  const now = new Date().toISOString();
  const current = statements.findActivityGrant.get(userId);
  const accessExpiresAt = tokens.expires_in
    ? new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString()
    : current?.access_expires_at || "";
  const refreshToken =
    typeof tokens.refresh_token === "string" && tokens.refresh_token
      ? tokens.refresh_token
      : current?.refresh_token || "";
  const scope = typeof tokens.scope === "string" ? tokens.scope : current?.scope || "";
  const accessToken = typeof tokens.access_token === "string" ? tokens.access_token : current?.access_token || "";

  if (!current) {
    statements.insertActivityGrant.run(
      randomUUID(),
      userId,
      accessToken,
      accessExpiresAt,
      refreshToken,
      scope,
      now,
      now,
    );
    return;
  }

  statements.updateActivityGrant.run(
    accessToken,
    accessExpiresAt,
    refreshToken,
    scope,
    now,
    userId,
  );
}

async function initiatePortabilityArchive(accessToken) {
  const now = new Date();
  const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const url = new URL("https://dataportability.googleapis.com/v1/portabilityArchive:initiate");
  url.searchParams.set("key", GOOGLE_DATA_PORTABILITY_API_KEY);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      resources: GOOGLE_ACTIVITY_RESOURCES,
      startTime,
      endTime: now.toISOString(),
    }),
  });

  const payload = await readGoogleJson(response);
  if (!response.ok) {
    throw httpError(502, extractGoogleApiError(payload, "Could not start the Google Maps export."));
  }

  return payload;
}

function createImportRecord(userId, archive) {
  const now = new Date().toISOString();
  const record = {
    id: randomUUID(),
    userId,
    archiveJobId: archive.archiveJobId,
    state: "IN_PROGRESS",
    accessType: archive.accessType || "",
    resourceGroups: JSON.stringify(GOOGLE_ACTIVITY_RESOURCES),
    archiveUrls: "[]",
    eventCount: 0,
    errorMessage: "",
    createdAt: now,
    updatedAt: now,
    completedAt: "",
    generatedEntryId: "",
  };

  statements.insertImport.run(
    record.id,
    record.userId,
    record.archiveJobId,
    record.state,
    record.accessType,
    record.resourceGroups,
    record.archiveUrls,
    record.eventCount,
    record.errorMessage,
    record.createdAt,
    record.updatedAt,
    record.completedAt,
    record.generatedEntryId,
  );

  return record;
}

function createUploadedImportRecord(userId) {
  const now = new Date().toISOString();
  const record = {
    id: randomUUID(),
    userId,
    archiveJobId: `upload-${randomUUID()}`,
    state: "IN_PROGRESS",
    accessType: "takeout_upload",
    resourceGroups: JSON.stringify(GOOGLE_ACTIVITY_RESOURCES),
    archiveUrls: "[]",
    eventCount: 0,
    errorMessage: "",
    createdAt: now,
    updatedAt: now,
    completedAt: "",
    generatedEntryId: "",
  };

  statements.insertImport.run(
    record.id,
    record.userId,
    record.archiveJobId,
    record.state,
    record.accessType,
    record.resourceGroups,
    record.archiveUrls,
    record.eventCount,
    record.errorMessage,
    record.createdAt,
    record.updatedAt,
    record.completedAt,
    record.generatedEntryId,
  );

  return statements.importById.get(record.id);
}

async function syncActivityImportForUser(
  userId,
  options = { forceImportId: "", skipRefresh: false, accessTokenOverride: "" },
) {
  const latest =
    options.forceImportId ? statements.importById.get(options.forceImportId) : statements.latestImportByUser.get(userId);

  if (!latest) {
    return {
      activity: {
        connected: false,
        state: "not_connected",
        eventCount: 0,
        errorMessage: "",
      },
      location: serializeLocation(statements.latestLocationByUser.get(userId)),
      entry: null,
    };
  }

  let currentImport = latest;
  let createdEntry = null;

  if (latest.state === "IN_PROGRESS") {
    const accessToken =
      options.accessTokenOverride || (await getValidActivityAccessToken(userId, options.skipRefresh));

    if (!accessToken) {
      currentImport = updateImportRecord(latest.id, {
        state: "ERROR",
        accessType: latest.access_type,
        archiveUrls: safeJsonString(latest.archive_urls),
        eventCount: latest.event_count,
        errorMessage: "Reconnect Google Maps so LUME can continue this import.",
        completedAt: "",
        generatedEntryId: latest.generated_entry_id,
      });
    } else {
      const archiveState = await fetchPortabilityArchiveState(latest.archive_job_id, accessToken);

      if (archiveState.state === "COMPLETE") {
        const completion = await completeImportFromArchive(latest, archiveState);
        currentImport = completion.importRecord;
        createdEntry = completion.entry;
      } else if (archiveState.state === "FAILED" || archiveState.state === "CANCELLED") {
        currentImport = updateImportRecord(latest.id, {
          state: "ERROR",
          accessType: latest.access_type,
          archiveUrls: safeJsonString(latest.archive_urls),
          eventCount: latest.event_count,
          errorMessage: `Google marked the export as ${archiveState.state.toLowerCase()}.`,
          completedAt: "",
          generatedEntryId: latest.generated_entry_id,
        });
      }
    }
  }

  return {
    activity: serializeActivityImport(currentImport),
    location: serializeLocation(statements.latestLocationByUser.get(userId)),
    entry: createdEntry,
  };
}

async function getValidActivityAccessToken(userId, skipRefresh = false) {
  const grant = statements.findActivityGrant.get(userId);
  if (!grant) {
    return "";
  }

  if (grant.access_token && grant.access_expires_at) {
    const expiresAt = new Date(grant.access_expires_at).getTime();
    if (!Number.isNaN(expiresAt) && expiresAt > Date.now() + 60_000) {
      return grant.access_token;
    }
  }

  if (skipRefresh) {
    return grant.access_token || "";
  }

  if (!grant.refresh_token) {
    return "";
  }

  return refreshGoogleAccessToken(grant);
}

async function fetchPortabilityArchiveState(archiveJobId, accessToken) {
  const url = new URL(
    `https://dataportability.googleapis.com/v1/archiveJobs/${archiveJobId}/portabilityArchiveState`,
  );
  url.searchParams.set("key", GOOGLE_DATA_PORTABILITY_API_KEY);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await readGoogleJson(response);
  if (!response.ok) {
    throw httpError(502, extractGoogleApiError(payload, "Could not read the Google Maps export state."));
  }

  return payload;
}

async function completeImportFromArchive(importRow, archiveState) {
  const roots = await downloadArchiveRoots(archiveState.urls || [], importRow.id);
  return finalizeImportFromRoots(importRow, roots, {
    accessType: importRow.access_type || archiveState.accessType || "",
    archiveUrls: archiveState.urls || [],
    completedAt: archiveState.exportTime || new Date().toISOString(),
    emptyMessage:
      "Google completed the export, but there were no recent Maps activity records in the selected window.",
  });
}

function updateImportRecord(importId, values) {
  const updatedAt = new Date().toISOString();
  statements.updateImportState.run(
    values.state,
    values.accessType || "",
    values.archiveUrls || "[]",
    Number(values.eventCount || 0),
    values.errorMessage || "",
    updatedAt,
    values.completedAt || "",
    values.generatedEntryId || "",
    importId,
  );

  return statements.importById.get(importId);
}

function finalizeImportFromRoots(importRow, roots, options = {}) {
  const importUserId = importRow.user_id || importRow.userId || "";
  const currentGeneratedEntryId = importRow.generated_entry_id || importRow.generatedEntryId || "";
  const currentAccessType = importRow.access_type || importRow.accessType || "";

  if (!importUserId) {
    throw httpError(500, "LUME could not connect this import to a user record.");
  }

  const events = extractActivityEventsFromRoots(roots, importUserId, importRow.id);

  statements.deleteEventsForImport.run(importRow.id);
  for (const event of events) {
    statements.insertEvent.run(
      event.id,
      event.userId,
      event.importId,
      event.source,
      event.title,
      event.details,
      event.locationText,
      event.occurredAt,
      event.rawJson,
      event.createdAt,
    );
  }

  const generatedEntryId = currentGeneratedEntryId;

  const refreshedImport = updateImportRecord(importRow.id, {
    state: "COMPLETE",
    accessType: options.accessType || currentAccessType,
    archiveUrls: JSON.stringify(options.archiveUrls || []),
    eventCount: events.length,
    errorMessage: events.length
      ? ""
      : options.emptyMessage ||
        "LUME did not find any recent Google Maps activity in that archive.",
    completedAt: options.completedAt || new Date().toISOString(),
    generatedEntryId,
  });

  return {
    importRecord: refreshedImport,
    entry: null,
  };
}

async function downloadArchiveRoots(urls, importId) {
  if (!urls.length) {
    return [];
  }

  const importTempDir = join(TEMP_DIR, importId);
  mkdirSync(importTempDir, { recursive: true });
  const roots = [];

  try {
    for (let index = 0; index < urls.length; index += 1) {
      const response = await fetch(urls[index]);
      if (!response.ok) {
        throw httpError(502, "Could not download the Google Maps archive.");
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (looksLikeZip(buffer)) {
        const zipPath = join(importTempDir, `archive-${index}.zip`);
        const extractDir = join(importTempDir, `archive-${index}`);
        mkdirSync(extractDir, { recursive: true });
        writeFileSync(zipPath, buffer);
        execFileSync("unzip", ["-qq", "-o", zipPath, "-d", extractDir]);
        roots.push(...readJsonRootsRecursively(extractDir));
        continue;
      }

      if (looksLikeJson(buffer)) {
        roots.push(JSON.parse(buffer.toString("utf8")));
      }
    }
  } finally {
    rmSync(importTempDir, { recursive: true, force: true });
  }

  return roots;
}

function extractRootsFromBuffer(buffer, tempId, fileName = "") {
  if (!buffer.length) {
    throw httpError(400, "Choose a Google Takeout archive before uploading it to LUME.");
  }

  const importTempDir = join(TEMP_DIR, tempId);
  mkdirSync(importTempDir, { recursive: true });

  try {
    if (looksLikeZip(buffer)) {
      const zipPath = join(importTempDir, fileName || "takeout.zip");
      const extractDir = join(importTempDir, "archive");
      mkdirSync(extractDir, { recursive: true });
      writeFileSync(zipPath, buffer);

      try {
        execFileSync("unzip", ["-qq", "-o", zipPath, "-d", extractDir]);
      } catch (error) {
        void error;
        throw httpError(400, "LUME could not unpack that Google Takeout archive.");
      }

      return readJsonRootsRecursively(extractDir);
    }

    if (looksLikeJson(buffer)) {
      try {
        return [JSON.parse(buffer.toString("utf8"))];
      } catch (error) {
        void error;
        throw httpError(400, "LUME could not read that JSON activity export.");
      }
    }

    const label = fileName ? ` "${fileName}"` : "";
    throw httpError(
      400,
      `LUME could not read${label}. Upload a Google Takeout .zip or a raw .json export.`,
    );
  } finally {
    rmSync(importTempDir, { recursive: true, force: true });
  }
}

function readJsonRootsRecursively(directory) {
  const items = readdirSync(directory, { withFileTypes: true });
  const roots = [];

  for (const item of items) {
    const fullPath = join(directory, item.name);
    if (item.isDirectory()) {
      roots.push(...readJsonRootsRecursively(fullPath));
      continue;
    }

    if (extname(item.name).toLowerCase() !== ".json") {
      continue;
    }

    try {
      roots.push(JSON.parse(readFileSync(fullPath, "utf8")));
    } catch (error) {
      void error;
    }
  }

  return roots;
}

function extractActivityEventsFromRoots(roots, userId, importId) {
  const records = [];
  roots.forEach((root) => collectActivityRecords(root, records));

  const seen = new Set();
  const events = [];

  for (const record of records) {
    if (!looksLikeMapsRecord(record)) {
      continue;
    }

    const event = normalizeActivityRecord(record, userId, importId);
    const key = `${event.source}|${event.title}|${event.occurredAt}`;
    if (!event.title || seen.has(key)) {
      continue;
    }

    seen.add(key);
    events.push(event);
  }

  return events.sort(compareEventsDescending);
}

function collectActivityRecords(value, bucket) {
  if (!value) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectActivityRecords(item, bucket));
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  if (looksLikeActivityRecord(value)) {
    bucket.push(value);
  }

  Object.values(value).forEach((child) => collectActivityRecords(child, bucket));
}

function looksLikeActivityRecord(record) {
  return Boolean(
    typeof record.title === "string" &&
      (typeof record.time === "string" ||
        typeof record.header === "string" ||
        Array.isArray(record.products) ||
        record.locationInfos ||
        record.activityControls),
  );
}

function looksLikeMapsRecord(record) {
  const text = `${stringifyValue(record.activityControls)} ${stringifyValue(record.products)} ${stringifyValue(record.header)} ${stringifyValue(record.title)}`.toLowerCase();
  return text.includes("maps");
}

function normalizeActivityRecord(record, userId, importId) {
  return {
    id: randomUUID(),
    userId,
    importId,
    source:
      stringField(record.header, 80) ||
      firstString(record.products) ||
      inferActivitySource(record) ||
      "Google Maps",
    title: stringField(record.title, 240) || "Google Maps activity",
    details: compactStrings([
      stringifyValue(record.subtitles),
      stringifyValue(record.description),
      stringifyValue(record.details),
      stringifyValue(record.activityControls),
    ]).slice(0, 500),
    locationText: stringifyLocation(record.locationInfos, record.titleUrl).slice(0, 240),
    occurredAt: validDateString(record.time) || "",
    rawJson: JSON.stringify(record).slice(0, 20_000),
    createdAt: new Date().toISOString(),
  };
}

function inferActivitySource(record) {
  const text = `${stringifyValue(record.activityControls)} ${stringifyValue(record.title)}`.toLowerCase();
  if (text.includes("maps")) {
    return "Google Maps";
  }
  return "";
}

async function createJournalFromSignals(userId, additionalContext = "") {
  const latestImport = statements.latestImportByUser.get(userId);
  const latestLocation = statements.latestLocationByUser.get(userId);
  const latestAppleMusicImport = statements.latestAppleMusicImportByUser.get(userId);

  const maps =
    latestImport?.state === "COMPLETE"
      ? statements.recentEventsByImport.all(latestImport.id)
      : [];
  const music =
    latestAppleMusicImport?.state === "COMPLETE"
      ? statements.recentAppleMusicItemsByImport.all(latestAppleMusicImport.id)
      : [];
  const trimmedAdditionalContext = stringField(additionalContext, 1200);
  const location = serializeLocation(latestLocation);

  if (!maps.length && !location && !music.length && !trimmedAdditionalContext) {
    throw httpError(
      400,
      "LUME needs Maps history, a recent location, Apple Music history, or an optional note before it can write the journal.",
    );
  }

  const entry = OPENAI_API_KEY
    ? await buildOpenAIJournalFromSignals({
        location,
        maps,
        music,
        additionalContext: trimmedAdditionalContext,
      }).catch(() =>
        buildLocalJournalFromSignals({
          location,
          maps,
          music,
          additionalContext: trimmedAdditionalContext,
          sourceKind: "local_fallback",
        }),
      )
    : buildLocalJournalFromSignals({
        location,
        maps,
        music,
        additionalContext: trimmedAdditionalContext,
        sourceKind: "local",
      });

  if (!entry) {
    throw httpError(400, "LUME could not shape a journal from the available signals yet.");
  }

  persistJournalEntry(userId, entry);
  return entry;
}

function persistJournalEntry(userId, entry) {
  statements.insertEntry.run(
    entry.id,
    userId,
    entry.title,
    entry.mood,
    entry.screenTime,
    entry.displayDate,
    JSON.stringify(entry.summary),
    JSON.stringify(entry.highlights),
    JSON.stringify(entry.photos),
    entry.preview,
    entry.additionalContext || "",
    entry.date,
    entry.sourceKind,
    entry.sourceImportId || "",
  );
}

function buildLocalJournalFromSignals({
  location,
  maps,
  music,
  additionalContext,
  sourceKind = "local",
}) {
  if (!maps.length && !location && !music.length && !additionalContext) {
    return null;
  }

  const locationLabel = location
    ? location.label
    : maps[0]?.location_text || maps[0]?.title || "";
  const mood = inferJournalMood({ maps, music, hasLocation: Boolean(location) });
  const now = new Date();
  const signalsCount = maps.length + music.length + (location ? 1 : 0) + (additionalContext ? 1 : 0);
  const title = buildJournalTitle({ maps, music, locationLabel });
  const movementLine = maps.length
    ? `Maps history traced places like ${listTitles(maps.map((item) => item.title), 2)}.`
    : "Movement data was lighter, so the journal leans more on the broader signals you connected.";
  const musicLine = music.length
    ? `Apple Music added soundtrack cues like ${listTitles(music.map((item) => `${item.title} by ${item.artist_name || "Unknown artist"}`), 2)}.`
    : "Music history was light, so the story leans more on your movement and location trail.";
  const contextLine = additionalContext
    ? `You also asked LUME to remember this: ${trimSentence(additionalContext, 180)}.`
    : "You did not add extra notes, so the draft leans fully on the connected signals.";

  const summary = [
    `LUME pieced today together from ${signalsCount} connected signals${location ? ", including your live location," : ""}. ${locationLabel ? `The day seems to have moved through ${locationLabel}.` : "Even without a precise place, the activity still leaves a recognizable trail."}`,
    movementLine,
    `${musicLine} ${contextLine} Taken together, the day feels ${describeMood(mood)}.`,
  ];

  const highlights = [
    location ? `Current location: ${locationLabel}` : "",
    maps[0] ? `Maps: ${trimSentence(maps[0].title, 72)}` : "",
    music[0] ? `Apple Music: ${trimSentence(`${music[0].title} by ${music[0].artist_name || "Unknown artist"}`, 72)}` : "",
    additionalContext ? "Included your optional note" : "",
    `${signalsCount} total signals`,
  ].filter(Boolean);

  return {
    id: randomUUID(),
    title,
    mood,
    screenTime: buildSignalMixLabel({ maps, music, location, additionalContext }),
    displayDate: formatDisplayDate(now),
    summary,
    highlights,
    photos: [],
    preview: summary[0],
    additionalContext,
    date: now.toISOString(),
    sourceKind,
    sourceImportId: "",
  };
}

async function buildOpenAIJournalFromSignals({ location, maps, music, additionalContext }) {
  const locationLabel = location?.label || maps[0]?.location_text || maps[0]?.title || "";
  const fallback = buildLocalJournalFromSignals({
    location,
    maps,
    music,
    additionalContext,
    sourceKind: "openai",
  });
  const signalMix = buildSignalMixLabel({ maps, music, location, additionalContext });
  const promptContext = {
    date: formatDisplayDate(new Date()),
    current_location: location
      ? {
          place_name: location.placeName || location.label,
          coordinates: location.coordinatesLabel,
          captured_at: location.capturedAt,
        }
      : null,
    maps_history: maps.slice(0, 8).map((item) => ({
      title: item.title,
      details: item.details,
      location: item.location_text,
      occurred_at: item.occurred_at || item.occurredAt || "",
    })),
    apple_music_recent: music.slice(0, 8).map((item) => ({
      title: item.title,
      artist: item.artist_name || "",
      album: item.album_name || "",
      played_at: item.played_at || "",
    })),
    additional_context: additionalContext || "",
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      reasoning: {
        effort: "low",
      },
      text: {
        format: {
          type: "json_object",
        },
      },
      instructions:
        "You are writing a warm, cinematic personal journal entry. Use only the supplied data. Do not invent conversations, exact emotions, or events that are not grounded in the signals. Return strict JSON with keys title, mood, summary, highlights, and preview. summary must be an array of 2 to 4 short paragraphs. highlights must be an array of 3 to 6 short strings. mood must be a single evocative word or short phrase.",
      input: `Write a journal from this signal bundle:\n${JSON.stringify(promptContext, null, 2)}`,
    }),
  });

  const payload = await readGoogleJson(response);
  if (!response.ok) {
    throw httpError(502, extractGoogleApiError(payload, "OpenAI could not write the journal right now."));
  }

  const parsed = parseOpenAIJournal(extractResponseText(payload));
  const now = new Date();

  return {
    id: randomUUID(),
    title: parsed.title || buildJournalTitle({ maps, music, locationLabel }),
    mood: parsed.mood || inferJournalMood({ maps, music, hasLocation: Boolean(location) }),
    screenTime: signalMix,
    displayDate: formatDisplayDate(now),
    summary: parsed.summary.length ? parsed.summary : fallback.summary,
    highlights: parsed.highlights.length ? parsed.highlights : fallback.highlights,
    photos: [],
    preview: parsed.preview || parsed.summary[0] || fallback.preview,
    additionalContext,
    date: now.toISOString(),
    sourceKind: "openai",
    sourceImportId: "",
  };
}

function inferJournalMood({ maps, music, hasLocation }) {
  if (maps.length >= 2 && hasLocation) {
    return "Adventurous";
  }
  if (music.length >= 2 && !maps.length) {
    return "Reflective";
  }
  if (maps.length && music.length) {
    return "Glowy";
  }
  if (hasLocation) {
    return "Calm";
  }
  return "Glowy";
}

function describeMood(mood) {
  switch (mood) {
    case "Adventurous":
      return "alive and in motion rather than fixed in one place";
    case "Reflective":
      return "quiet, reflective, and a little inward";
    case "Calm":
      return "steady, grounded, and easy to revisit";
    default:
      return "bright enough to feel worth keeping";
  }
}

function buildJournalTitle({ maps, music, locationLabel }) {
  if (maps[0] && music[0]) {
    return `${shortTitle(maps[0].title)} & ${shortTitle(`${music[0].title} by ${music[0].artist_name || ""}`)}`;
  }
  if (maps[0]) {
    return shortTitle(maps[0].title);
  }
  if (music[0]) {
    return shortTitle(`${music[0].title} by ${music[0].artist_name || ""}`);
  }
  if (locationLabel) {
    return `Signals Around ${locationLabel}`;
  }
  return "A Day Pieced Together";
}

function buildSignalMixLabel({ maps, music, location, additionalContext }) {
  const parts = [];

  if (maps.length) {
    parts.push(`Maps x${maps.length}`);
  }
  if (music.length) {
    parts.push(`Apple Music x${music.length}`);
  }
  if (location) {
    parts.push("Live location");
  }
  if (additionalContext) {
    parts.push("Optional note");
  }

  return parts.length ? parts.join(" + ") : "Connected signals";
}

function parseOpenAIJournal(text) {
  try {
    const parsed = JSON.parse(text);
    return {
      title: stringField(parsed?.title, 120),
      mood: stringField(parsed?.mood, 40),
      summary: safeStringArray(parsed?.summary, 4, 320),
      highlights: safeStringArray(parsed?.highlights, 6, 90),
      preview: stringField(parsed?.preview, 220),
    };
  } catch (error) {
    return {
      title: "",
      mood: "",
      summary: [],
      highlights: [],
      preview: "",
    };
  }
}

async function saveLocationSnapshot(userId, body) {
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const accuracy = Number(body.accuracy || 0);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw httpError(400, "Latitude is missing or invalid.");
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw httpError(400, "Longitude is missing or invalid.");
  }

  const location = {
    id: randomUUID(),
    userId,
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) ? accuracy : 0,
    placeName: await lookupLocationName(latitude, longitude),
    capturedAt: new Date().toISOString(),
  };

  statements.insertLocation.run(
    location.id,
    location.userId,
    location.latitude,
    location.longitude,
    location.accuracy,
    location.placeName,
    location.capturedAt,
  );

  return serializeLocation(location);
}

async function buildSignalsPayload(userId) {
  const syncResult = await syncActivityImportForUser(userId, { forceImportId: "", skipRefresh: false, accessTokenOverride: "" });
  const latestAppleMusicImport = statements.latestAppleMusicImportByUser.get(userId);

  return {
    location: syncResult.location,
    activity: syncResult.activity,
    music: serializeAppleMusicImport(latestAppleMusicImport),
  };
}

function serializeLocation(location) {
  if (!location) {
    return null;
  }

  return {
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    accuracy: Number(location.accuracy),
    placeName: location.place_name || location.placeName || "",
    capturedAt: location.captured_at || location.capturedAt,
    label:
      location.place_name ||
      location.placeName ||
      `${formatCoordinate(location.latitude)}, ${formatCoordinate(location.longitude)}`,
    coordinatesLabel: `${formatCoordinate(location.latitude)}, ${formatCoordinate(location.longitude)}`,
  };
}

function serializeActivityImport(importRow) {
  if (!importRow) {
    return {
      connected: false,
      state: "not_connected",
      eventCount: 0,
      importedAt: "",
      errorMessage: "",
      latestTitle: "",
      accessType: "",
    };
  }

  const latestEvent = statements.latestEventForImport.get(importRow.id);
  return {
    connected: true,
    state: importRow.state === "COMPLETE" ? "complete" : importRow.state === "IN_PROGRESS" ? "pending" : "error",
    eventCount: Number(importRow.event_count || 0),
    importedAt: importRow.completed_at || importRow.updated_at,
    errorMessage: importRow.error_message || "",
    latestTitle: latestEvent?.title || "",
    latestSource: latestEvent?.source || "",
    accessType: importRow.access_type || "",
    generatedEntryId: importRow.generated_entry_id || "",
  };
}

function listEntries(userId) {
  return statements.listEntriesByUser.all(userId).map((row) => ({
    id: row.id,
    title: row.title,
    mood: row.mood,
    screenTime: row.screen_time,
    displayDate: row.display_date,
    summary: safeJsonArray(row.summary),
    highlights: safeJsonArray(row.highlights),
    photos: safeJsonArray(row.photos),
    preview: row.preview,
    additionalContext: row.additional_context || "",
    date: row.created_at,
  }));
}

function serveStatic(response, pathname) {
  if (!existsSync(DIST_DIR)) {
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(
      JSON.stringify({
        status: "ok",
        message: "Frontend build not found yet. Run npm run dev or npm run build.",
      }),
    );
    return;
  }

  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const safePath = normalize(requestedPath)
    .replace(/^[/\\]+/, "")
    .replace(/^(\.\.[/\\])+/, "");
  const filePath = join(DIST_DIR, safePath);

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    response.writeHead(200, {
      "Content-Type": contentTypeFor(filePath),
    });
    createReadStream(filePath).pipe(response);
    return;
  }

  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
  });
  response.end(readFileSync(join(DIST_DIR, "index.html")));
}

function sendJson(request, response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...buildCorsHeaders(request),
  });
  response.end(JSON.stringify(payload));
}

function sendNoContent(request, response) {
  response.writeHead(204, {
    ...buildCorsHeaders(request),
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Upload-Filename",
  });
  response.end();
}

function buildCorsHeaders(request) {
  const origin = request.headers.origin;
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

function sendRedirect(response, location) {
  response.writeHead(302, { Location: location });
  response.end();
}

function buildAppRedirect(notice, detail = "") {
  const url = new URL(APP_ORIGIN);
  url.searchParams.set("notice", notice);
  if (detail) {
    url.searchParams.set("detail", detail.slice(0, 180));
  }
  return url.toString();
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalSize = 0;

    request.on("data", (chunk) => {
      totalSize += chunk.length;
      if (totalSize > JSON_LIMIT) {
        reject(httpError(413, "That request is too large for this version of LUME."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => {
      if (!chunks.length) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(httpError(400, "Could not read that request payload."));
      }
    });

    request.on("error", () => {
      reject(httpError(400, "Could not read that request payload."));
    });
  });
}

function readBinary(request, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalSize = 0;

    request.on("data", (chunk) => {
      totalSize += chunk.length;
      if (totalSize > limit) {
        reject(httpError(413, "That upload is too large for this version of LUME."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => {
      resolve(chunks.length ? Buffer.concat(chunks) : Buffer.alloc(0));
    });

    request.on("error", () => {
      reject(httpError(400, "Could not read that uploaded archive."));
    });
  });
}

async function readGoogleJson(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return {};
  }
}

function safeJsonArray(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function safeJsonString(value) {
  try {
    JSON.parse(value);
    return value;
  } catch (error) {
    return "[]";
  }
}

function extractGoogleApiError(payload, fallback) {
  if (payload?.error?.message) {
    return payload.error.message;
  }

  if (typeof payload?.error_description === "string") {
    return payload.error_description;
  }

  return fallback;
}

function extractAppleMusicError(payload, fallback) {
  const error = Array.isArray(payload?.errors) ? payload.errors[0] : null;
  if (typeof error?.detail === "string" && error.detail) {
    return error.detail;
  }
  if (typeof error?.title === "string" && error.title) {
    return error.title;
  }
  return fallback;
}

function extractResponseText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text) {
    return payload.output_text;
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];
  const parts = [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const contentItem of content) {
      if (typeof contentItem?.text === "string" && contentItem.text) {
        parts.push(contentItem.text);
      }
    }
  }

  return parts.join("\n").trim();
}

async function lookupLocationName(latitude, longitude) {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("zoom", "16");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url, {
      headers: {
        "User-Agent": "LUME/1.0",
      },
    });

    if (!response.ok) {
      return "";
    }

    const payload = await readGoogleJson(response);
    return formatReverseGeocodeName(payload).slice(0, 160);
  } catch (error) {
    return "";
  }
}

function formatReverseGeocodeName(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const address = payload.address || {};
  const namedPlace = [
    payload.name,
    address.amenity,
    address.building,
    address.shop,
    address.tourism,
    address.leisure,
  ].find((value) => typeof value === "string" && value.trim());

  const locality = [
    address.suburb,
    address.neighbourhood,
    address.city,
    address.town,
    address.village,
    address.county,
    address.state,
  ]
    .filter((value) => typeof value === "string" && value.trim())
    .slice(0, 2);

  const composed = [namedPlace, ...locality].filter(Boolean).join(", ");
  if (composed) {
    return composed;
  }

  if (typeof payload.display_name === "string") {
    return payload.display_name.split(",").slice(0, 3).join(",").trim();
  }

  return "";
}

function safeStringArray(value, maxItems, maxLength) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function toBase64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function normalizeMultilineSecret(value) {
  return typeof value === "string" ? value.replace(/\\n/g, "\n") : "";
}

function runMigrations() {
  ensureColumn("location_snapshots", "place_name", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("journal_entries", "additional_context", "TEXT NOT NULL DEFAULT ''");
}

function ensureColumn(tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

function decodeHeaderValue(value) {
  if (typeof value !== "string" || !value) {
    return "";
  }

  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

function contentTypeFor(filePath) {
  switch (extname(filePath)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}

function formatDisplayDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatCoordinate(value) {
  return Number(value).toFixed(3);
}

function compareEventsDescending(left, right) {
  const leftTime = left.occurredAt ? new Date(left.occurredAt).getTime() : 0;
  const rightTime = right.occurredAt ? new Date(right.occurredAt).getTime() : 0;
  return rightTime - leftTime;
}

function stringField(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function validDateString(value) {
  if (typeof value !== "string" || !value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function compactStrings(values) {
  return values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .join(" ");
}

function firstString(values) {
  if (!Array.isArray(values)) {
    return "";
  }

  const match = values.find((value) => typeof value === "string" && value.trim());
  return match ? match.trim() : "";
}

function stringifyValue(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => stringifyValue(item)).filter(Boolean).join(", ");
  }

  if (typeof value === "object") {
    return Object.values(value).map((item) => stringifyValue(item)).filter(Boolean).join(", ");
  }

  return String(value);
}

function stringifyLocation(locationInfos, titleUrl) {
  const locationText = stringifyValue(locationInfos);
  if (locationText) {
    return locationText;
  }
  if (typeof titleUrl === "string" && titleUrl.includes("@")) {
    return titleUrl;
  }
  return "";
}

function listTitles(values, maxItems) {
  const titles = values.filter(Boolean).slice(0, maxItems).map((value) => `"${trimSentence(value, 56)}"`);
  if (!titles.length) {
    return "a few recent moments";
  }
  if (titles.length === 1) {
    return titles[0];
  }
  return `${titles.slice(0, -1).join(", ")} and ${titles.at(-1)}`;
}

function stripLeadingVerb(value) {
  return value.replace(/^(Watched|Viewed|Searched for|Visited|Directions to)\s+/i, "").trim();
}

function trimSentence(value, maxLength) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1).trim()}…`;
}

function shortTitle(value) {
  return trimSentence(stripLeadingVerb(value), 34);
}

function looksLikeZip(buffer) {
  return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

function looksLikeJson(buffer) {
  const start = buffer.toString("utf8", 0, 1);
  return start === "{" || start === "[";
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function loadEnvFile() {
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

function shutdown() {
  db.close();
  process.exit(0);
}
