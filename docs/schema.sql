-- KushRewards SA database schema (PostgreSQL 14+).
-- v2 (store-compliant). Mirrors the "KushRewards SA – v2" web app's database as of 16 Oct 2026.
-- Foreign keys cascade or null out on user deletion so POST /account/delete
-- can simply `DELETE FROM users WHERE id = $1` (app-store accounts must be deletable).
-- Only additions for the mobile app: sessions keyed by a token hash, and 'apple' as an
-- oauth_accounts provider (Sign in with Apple). Column names are snake_case;
-- the API returns camelCase (store_id -> storeId).

-- ---------- Enums ----------
CREATE TYPE user_role         AS ENUM ('user', 'admin');
CREATE TYPE store_type        AS ENUM ('dispensary', 'club', 'lounge');
CREATE TYPE store_status      AS ENUM ('live', 'hidden');
CREATE TYPE submission_status AS ENUM ('pending', 'needs_info', 'approved', 'rejected');
CREATE TYPE report_status     AS ENUM ('open', 'confirmed', 'dismissed');
CREATE TYPE contact_kind      AS ENUM ('whatsapp', 'call', 'directions');
CREATE TYPE review_status     AS ENUM ('visible', 'hidden');

-- ---------- People and sign-in ----------
CREATE TABLE users (
  id            serial PRIMARY KEY,
  email         text NOT NULL,
  display_name  text NOT NULL,
  avatar_url    text,
  role          user_role NOT NULL DEFAULT 'user',
  terms_accepted_at timestamptz,             -- Terms of Use + Community Rules accepted (required before posting)
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));

-- Email + password accounts (bcrypt hashes). Google-only users have no row here.
CREATE TABLE user_passwords (
  id             serial PRIMARY KEY,
  user_id        integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash  text NOT NULL,
  created_at     timestamptz DEFAULT now()
);

-- Linked sign-in accounts. provider = 'google' or 'apple', provider_user_id = the provider's "sub".
CREATE TABLE oauth_accounts (
  id                serial PRIMARY KEY,
  user_id           integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider          text NOT NULL,
  provider_user_id  text NOT NULL,
  provider_email    text NOT NULL,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE (provider, provider_user_id)
);

-- Server-side sessions. The app holds an opaque random token; store only its SHA-256 hash.
-- Sessions last 7 days and slide forward on use (see HANDOVER.md 5).
CREATE TABLE sessions (
  id             text PRIMARY KEY,          -- sha256(token) hex
  user_id        integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at     timestamptz DEFAULT now(),
  last_accessed  timestamptz DEFAULT now(),
  expires_at     timestamptz NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

-- Failed-login throttling: 5 failures in 15 min locks the email for 15 min.
CREATE TABLE login_attempts (
  id            serial PRIMARY KEY,
  email         varchar NOT NULL,
  attempted_at  timestamp DEFAULT CURRENT_TIMESTAMP,
  success       boolean DEFAULT false
);
CREATE INDEX login_attempts_email_fail_idx ON login_attempts (lower(email::text), attempted_at DESC) WHERE success = false;

-- Optional: password reset by emailed 8-digit code (15 min TTL, 3 codes/hour, 5 tries/code).
CREATE TABLE password_reset_codes (
  id          serial PRIMARY KEY,
  user_id     integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash   text NOT NULL,
  expires_at  timestamptz NOT NULL,
  attempts    integer NOT NULL DEFAULT 0,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------- Stores ----------
CREATE TABLE stores (
  id            serial PRIMARY KEY,
  name          text NOT NULL,
  type          store_type NOT NULL DEFAULT 'dispensary',
  suburb        text NOT NULL,
  address       text NOT NULL DEFAULT '',
  latitude      double precision NOT NULL,
  longitude     double precision NOT NULL,
  whatsapp      text,
  phone         text,
  hours         jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {"mon":{"open":"10:00","close":"20:00"},"sun":null,...}
  hours_note    text,
  price_level   integer NOT NULL DEFAULT 2,           -- v1 legacy. v2 never reads, edits or returns it.
  products      jsonb NOT NULL DEFAULT '[]'::jsonb,   -- v1 legacy. v2 never returns it: GET /stores/list always sends products: [].
  features      text[] NOT NULL DEFAULT '{}',
  is_partner    boolean NOT NULL DEFAULT false,
  is_community  boolean NOT NULL DEFAULT false,       -- true when created from an approved user submission
  status        store_status NOT NULL DEFAULT 'live',
  added_by      integer REFERENCES users(id) ON DELETE SET NULL,
  logo_url      text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
  -- Legacy columns in the live DB, no longer used by the app: price_indoor, price_greenhouse, price_outdoor (integer, nullable).
);

-- "Suggest a venue" (Suggest tab) entries waiting for the admin.
CREATE TABLE store_submissions (
  id               serial PRIMARY KEY,
  submitted_by     integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             text NOT NULL,
  type             store_type NOT NULL,
  suburb           text NOT NULL,
  address          text NOT NULL DEFAULT '',
  whatsapp         text,
  hours_note       text,
  price_level      integer NOT NULL DEFAULT 2,   -- v1 legacy; v2 always inserts the default 2 (no price question)
  is_owner         boolean NOT NULL DEFAULT false,
  notes            text,
  status           submission_status NOT NULL DEFAULT 'pending',
  decision_reason  text,
  store_id         integer REFERENCES stores(id),   -- set when approved
  created_at       timestamptz NOT NULL DEFAULT now(),
  decided_at       timestamptz
);

-- "Report wrong info about this venue".
CREATE TABLE info_reports (
  id           serial PRIMARY KEY,
  store_id     integer NOT NULL REFERENCES stores(id),
  reported_by  integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field        text NOT NULL,      -- Hours | Closed for good | Location | Contact | Other (v1 rows may say 'Price level')
  details      text NOT NULL,
  status       report_status NOT NULL DEFAULT 'open',
  created_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz
);

-- Every WhatsApp / Call / Directions tap. The number sold to stores as proof of value.
CREATE TABLE contact_taps (
  id          serial PRIMARY KEY,
  store_id    integer NOT NULL REFERENCES stores(id),
  kind        contact_kind NOT NULL,
  user_id     integer REFERENCES users(id) ON DELETE SET NULL,   -- null when not signed in or account deleted
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contact_taps_store_idx ON contact_taps (store_id, created_at);

-- ---------- Reviews ----------
CREATE TABLE reviews (
  id            serial PRIMARY KEY,
  store_id      integer NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id       integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stars         integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  tags          text[] NOT NULL DEFAULT '{}',
  comment       text,
  status        review_status NOT NULL DEFAULT 'visible',
  report_count  integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reviews_one_per_user_per_store UNIQUE (store_id, user_id)
);
CREATE INDEX reviews_store_idx ON reviews (store_id);
CREATE INDEX reviews_created_idx ON reviews (created_at DESC);

-- One report per user per review (keeps report_count honest).
CREATE TABLE review_reports (
  review_id    integer NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  reported_by  integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id, reported_by)
);

-- "Block this reviewer": the blocker no longer sees the blocked user's reviews (App Review Guideline 1.2).
CREATE TABLE user_blocks (
  blocker_id  integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id  integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

-- ---------- Settings ----------
-- v1 legacy. v2 has no settings screen and no code reads these keys; the table is kept only
-- so the v1 data copies over cleanly. price_mode is fixed at 'level'.
CREATE TABLE app_settings (
  key    text PRIMARY KEY,
  value  text NOT NULL
);
INSERT INTO app_settings (key, value) VALUES
  ('price_mode', 'level'),
  ('product_types', '[{"name":"Indoor","unit":"g"},{"name":"Outdoor","unit":"g"},{"name":"Tunnel","unit":"g"},{"name":"Hydro","unit":"g"},{"name":"Greenhouse","unit":"g"},{"name":"Edibles","unit":"item"}]');
