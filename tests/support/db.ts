// An in-memory Postgres (PGlite) with every migration applied, plus a minimal stand-in for Supabase's
// auth schema and roles. Lets tests run the real SQL functions and row-level security as a learner.
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { PGlite } from "@electric-sql/pglite"

export const SERVER_KEY = "test-server-key"
const MIGRATIONS = join(__dirname, "../../supabase/migrations")

const SUPABASE_STUB = `
create role anon; create role authenticated; create role service_role;
create schema auth;
create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz default now(), raw_user_meta_data jsonb default '{}', created_at timestamptz default now(), last_sign_in_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
grant usage on schema auth to authenticated, anon;
grant usage on schema public to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
`

export type TestDb = Awaited<ReturnType<typeof createTestDb>>

export async function createTestDb() {
  const db = new PGlite()
  await db.exec(SUPABASE_STUB)
  for (const f of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    try {
      await db.exec(readFileSync(join(MIGRATIONS, f), "utf8"))
    } catch (e) {
      throw new Error(`migration ${f} failed: ${e instanceof Error ? e.message : e}`)
    }
  }
  await db.query(`insert into private.server_keys (name, key_hash) values ('app', encode(sha256(convert_to($1, 'UTF8')), 'hex'))`, [SERVER_KEY])
  // The closed beta (migration 041) is opened here so tests can use fresh accounts; tests/db/beta.test.ts closes it.
  await db.exec(`update private.admin_settings set beta_closed = false`)

  const query = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows
  const one = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await query<T>(sql, params))[0]

  return {
    db,
    query,
    one,
    /** Run the next queries as the database owner (bypasses RLS), like the SQL editor. */
    asOwner: () => db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`),
    /** Run the next queries as a signed-in learner. */
    asUser: (id: string) => db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub', '${id}', false);`),
    /** Run the next queries as a signed-out visitor (or the webhook, which uses the anon key). */
    asAnon: () => db.exec(`reset role; set role anon; select set_config('request.jwt.claim.sub', '', false);`),
    async addUser(id: string, email = `${id.slice(-4)}@example.com`) {
      await db.exec(`reset role`)
      await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, email])
    },
    /** Server-side course creation, as the learner currently set with asUser. Returns course and lesson ids. */
    async createCourse(lessons = 2) {
      const plan = [{ title: "Module 1", summary: "s", lessons: Array.from({ length: lessons }, (_, i) => ({ title: `Lesson ${i + 1}`, objective: "o", est_minutes: 20 })) }]
      const { id } = (await one<{ id: string }>(`select public.app_create_course($1, $2, $3) as id`, [
        SERVER_KEY,
        JSON.stringify({ title: "Test course", summary: "s", level: "beginner", goal: "learn", category: "coding", subcategory: "python" }),
        JSON.stringify(plan),
      ]))!
      const ids = (await query<{ id: string }>(`select id from public.lessons where course_id = $1 order by position`, [id])).map((r) => r.id)
      return { courseId: id, lessonIds: ids }
    },
    /** Claim + save a lesson with a one-question quiz whose answer is option 0. */
    async writeLesson(lessonId: string) {
      const claim = await one<{ status: string; claimed_at: string }>(`select * from public.app_claim_lesson($1, $2)`, [SERVER_KEY, lessonId])
      if (claim?.status !== "claimed") throw new Error(`claim returned ${claim?.status}`)
      const ok = await one<{ ok: boolean }>(`select public.app_save_lesson($1, $2, $3, $4, $5, $6) as ok`, [
        SERVER_KEY,
        lessonId,
        claim.claimed_at,
        JSON.stringify([{ type: "opening", title: "Hi", body_markdown: "Hello", items: [], checkpoint: null, diagram: null }]),
        JSON.stringify(["takeaway"]),
        JSON.stringify([{ question: "Q?", options: ["right", "wrong", "no", "nope"], answer_index: 0, explanation: "because" }]),
      ])
      if (!ok?.ok) throw new Error("save failed")
    },
  }
}

/** The Postgres error message of a failing query, or null if it succeeded. */
export async function errorOf(p: Promise<unknown>) {
  try {
    await p
    return null
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
}

export const USER_A = "00000000-0000-0000-0000-00000000000a"
export const USER_B = "00000000-0000-0000-0000-00000000000b"
export const USER_ADMIN = "00000000-0000-0000-0000-0000000000ad"
