import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DATA_DIR } from "./env";

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, "stipend.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  goal TEXT NOT NULL,
  budget_micro INTEGER NOT NULL,
  owner_pubkey TEXT NOT NULL,
  wallet_pubkey TEXT NOT NULL,
  wallet_secret TEXT NOT NULL,
  status TEXT NOT NULL,            -- created | funded | running | waiting_owner | finished | declined | failed
  injection INTEGER NOT NULL DEFAULT 0,
  state TEXT,
  answer TEXT,
  funded_sig TEXT,
  sweep_sig TEXT,
  swept_micro INTEGER,
  receipt_sig TEXT,
  receipt_hash TEXT,
  created_at INTEGER NOT NULL,
  finished_at INTEGER
);
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  service TEXT NOT NULL,
  destination TEXT NOT NULL,
  micro INTEGER NOT NULL,
  memo TEXT NOT NULL,
  sig TEXT,
  status TEXT NOT NULL,            -- sent | confirmed | failed
  ms INTEGER,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  type TEXT NOT NULL,
  data TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS asks (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  micro INTEGER NOT NULL,
  reason TEXT NOT NULL,
  risk TEXT NOT NULL,              -- JSON list of flags
  status TEXT NOT NULL,            -- pending | approved | declined | expired
  sig TEXT,
  created_at INTEGER NOT NULL,
  decided_at INTEGER
);
CREATE TABLE IF NOT EXISTS used_sigs (
  sig TEXT PRIMARY KEY,
  service TEXT NOT NULL,
  used_at INTEGER NOT NULL
);
`);

export type Task = {
  id: string; goal: string; budget_micro: number; owner_pubkey: string; wallet_pubkey: string;
  wallet_secret: string; status: string; injection: number; state: string | null; answer: string | null; funded_sig: string | null;
  sweep_sig: string | null; swept_micro: number | null; receipt_sig: string | null; receipt_hash: string | null;
  created_at: number; finished_at: number | null;
};
export type Payment = {
  id: string; task_id: string; service: string; destination: string; micro: number; memo: string;
  sig: string | null; status: string; ms: number | null; created_at: number;
};
export type Event = { seq: number; task_id: string; ts: number; type: string; data: string; prev_hash: string; hash: string };
export type Ask = {
  id: string; task_id: string; micro: number; reason: string; risk: string; status: string; sig: string | null;
  created_at: number; decided_at: number | null;
};

export const now = () => Date.now();
export const newId = (prefix: string) => `${prefix}_${crypto.randomBytes(6).toString("hex")}`;

export const tasks = {
  insert: (t: Pick<Task, "id" | "goal" | "budget_micro" | "owner_pubkey" | "wallet_pubkey" | "wallet_secret" | "status" | "injection" | "created_at">) =>
    db.prepare(`INSERT INTO tasks (id, goal, budget_micro, owner_pubkey, wallet_pubkey, wallet_secret, status, injection, created_at)
                VALUES (@id, @goal, @budget_micro, @owner_pubkey, @wallet_pubkey, @wallet_secret, @status, @injection, @created_at)`).run(t),
  get: (id: string) => db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id) as Task | undefined,
  list: () => db.prepare(`SELECT * FROM tasks ORDER BY created_at DESC`).all() as Task[],
  update: (id: string, fields: Partial<Task>) => {
    const keys = Object.keys(fields);
    if (!keys.length) return;
    db.prepare(`UPDATE tasks SET ${keys.map((k) => `${k} = @${k}`).join(", ")} WHERE id = @id`).run({ ...fields, id });
  },
};

export const payments = {
  insert: (p: Payment) =>
    db.prepare(`INSERT INTO payments (id, task_id, service, destination, micro, memo, sig, status, ms, created_at)
                VALUES (@id, @task_id, @service, @destination, @micro, @memo, @sig, @status, @ms, @created_at)`).run(p),
  update: (id: string, fields: Partial<Payment>) => {
    const keys = Object.keys(fields);
    db.prepare(`UPDATE payments SET ${keys.map((k) => `${k} = @${k}`).join(", ")} WHERE id = @id`).run({ ...fields, id });
  },
  forTask: (taskId: string) => db.prepare(`SELECT * FROM payments WHERE task_id = ? ORDER BY created_at`).all(taskId) as Payment[],
  all: () => db.prepare(`SELECT * FROM payments ORDER BY created_at`).all() as Payment[],
};

export const asks = {
  insert: (a: Ask) =>
    db.prepare(`INSERT INTO asks (id, task_id, micro, reason, risk, status, sig, created_at, decided_at)
                VALUES (@id, @task_id, @micro, @reason, @risk, @status, @sig, @created_at, @decided_at)`).run(a),
  get: (id: string) => db.prepare(`SELECT * FROM asks WHERE id = ?`).get(id) as Ask | undefined,
  pending: () => db.prepare(`SELECT * FROM asks WHERE status = 'pending' ORDER BY created_at`).all() as Ask[],
  forTask: (taskId: string) => db.prepare(`SELECT * FROM asks WHERE task_id = ? ORDER BY created_at`).all(taskId) as Ask[],
  all: () => db.prepare(`SELECT * FROM asks ORDER BY created_at`).all() as Ask[],
  update: (id: string, fields: Partial<Ask>) => {
    const keys = Object.keys(fields);
    db.prepare(`UPDATE asks SET ${keys.map((k) => `${k} = @${k}`).join(", ")} WHERE id = @id`).run({ ...fields, id });
  },
};

export const usedSigs = {
  tryUse: (sig: string, service: string): boolean => {
    try {
      db.prepare(`INSERT INTO used_sigs (sig, service, used_at) VALUES (?, ?, ?)`).run(sig, service, now());
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * Append-only action log. Each entry's hash covers the previous entry's hash,
 * so editing or deleting any line breaks every hash after it. The receipt at
 * the end of a task is the last hash, written to Solana as a memo.
 */
export function hashEvent(prev: string, task_id: string, ts: number, type: string, data: string) {
  return crypto.createHash("sha256").update(`${prev}\n${task_id}\n${ts}\n${type}\n${data}`).digest("hex");
}

export const events = {
  append: (task_id: string, type: string, data: unknown) => {
    const last = db.prepare(`SELECT hash FROM events WHERE task_id = ? ORDER BY seq DESC LIMIT 1`).get(task_id) as { hash: string } | undefined;
    const prev = last?.hash ?? "0".repeat(64);
    const ts = now();
    const payload = JSON.stringify(data ?? {});
    const hash = hashEvent(prev, task_id, ts, type, payload);
    db.prepare(`INSERT INTO events (task_id, ts, type, data, prev_hash, hash) VALUES (?, ?, ?, ?, ?, ?)`).run(task_id, ts, type, payload, prev, hash);
    return hash;
  },
  forTask: (task_id: string) => db.prepare(`SELECT * FROM events WHERE task_id = ? ORDER BY seq`).all(task_id) as Event[],
  count: () => (db.prepare(`SELECT COUNT(*) AS n FROM events`).get() as { n: number }).n,
};

export default db;
