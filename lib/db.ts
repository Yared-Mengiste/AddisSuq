/**
 * The JSON "database".
 *
 * Every table is a single pretty-printed JSON file under /data. Reads and writes
 * go through this module only, and writes are serialised per file so two route
 * handlers cannot clobber each other during the demo.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import type {
  AppNotification,
  Category,
  Customer,
  Order,
  Product,
  Shop,
} from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");

export type TableName =
  | "shops"
  | "products"
  | "customers"
  | "orders"
  | "notifications"
  | "categories";

interface TableMap {
  shops: Shop;
  products: Product;
  customers: Customer;
  orders: Order;
  notifications: AppNotification;
  categories: Category;
}

function filePath(table: TableName) {
  return path.join(DATA_DIR, `${table}.json`);
}

export async function readTable<T extends TableName>(table: T): Promise<TableMap[T][]> {
  const raw = await fs.readFile(filePath(table), "utf8");
  return JSON.parse(raw) as TableMap[T][];
}

async function writeTable<T extends TableName>(table: T, rows: TableMap[T][]): Promise<void> {
  await fs.writeFile(filePath(table), `${JSON.stringify(rows, null, 2)}\n`, "utf8");
}

/** One promise chain per table keeps concurrent mutations in order. */
const locks = new Map<TableName, Promise<unknown>>();

/**
 * Read a table, let the caller mutate it, then write it back. Serialised per
 * table, so a burst of clicks in the demo can never interleave two writes.
 */
export async function mutateTable<T extends TableName, R>(
  table: T,
  mutator: (rows: TableMap[T][]) => R | Promise<R>
): Promise<R> {
  const run = async (): Promise<R> => {
    const rows = await readTable(table);
    const result = await mutator(rows);
    await writeTable(table, rows);
    return result;
  };

  const previous = locks.get(table) ?? Promise.resolve();
  const next = previous.then(run, run);
  locks.set(
    table,
    next.catch(() => undefined)
  );
  return next;
}

/* ------------------------------------------------------------------ */
/* ID helpers                                                          */
/* ------------------------------------------------------------------ */

/**
 * Short, readable, sequential ids ("shop_08", "ord_026") so seed data and
 * screenshots stay legible.
 */
export function nextId(prefix: string, existing: { id: string }[], pad = 2): string {
  const max = existing.reduce((acc, row) => {
    const n = Number.parseInt(row.id.split("_")[1] ?? "0", 10);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `${prefix}_${String(max + 1).padStart(pad, "0")}`;
}

/* ------------------------------------------------------------------ */
/* Small conveniences used by several route handlers                   */
/* ------------------------------------------------------------------ */

export function nowIso() {
  return new Date().toISOString();
}

export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json(data, init);
}

export function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
