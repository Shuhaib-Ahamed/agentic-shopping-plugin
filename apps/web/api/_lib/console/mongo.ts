// Mongo client singleton for the admin console store. Lazy connect, cached
// across function invocations in Fluid Compute. Reads MONGODB_URI from env.
// If absent, downstream callers fall back to the in-memory seed (see store.ts).
import { MongoClient, type Db, type Collection } from "mongodb";
import type {
  ClientTelemetryEvent,
  SessionRecord,
  TurnRecord,
} from "@kapruka/protocol";

let clientPromise: Promise<MongoClient> | null = null;

export function hasMongo(): boolean {
  return Boolean(process.env.MONGODB_URI);
}

export async function getDb(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  if (!clientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 4,
      serverSelectionTimeoutMS: 4000,
    });
    clientPromise = client.connect();
  }
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB ?? "kapruka_console");
}

export interface AdminCollections {
  sessions: Collection<SessionRecord>;
  turns: Collection<TurnRecord>;
  pricing: Collection<PricingRow>;
  admins: Collection<AdminRecord>;
  audit: Collection<AuditEntry>;
  telemetry: Collection<ClientTelemetryEvent>;
}

export interface PricingRow {
  model: string;
  inputPer1M: number;
  cachedInputPer1M: number;
  outputPer1M: number;
  reasoningPer1M: number;
  currency: "USD";
  effectiveFrom: string;
}

export interface AdminRecord {
  email: string;
  passwordHash: string;
  role: "admin";
  createdAt: string;
}

export interface AuditEntry {
  at: string;
  email: string;
  action: string;
  target?: string;
  ok: boolean;
  ip?: string;
}

export async function collections(): Promise<AdminCollections | null> {
  const db = await getDb();
  if (!db) return null;
  return {
    sessions: db.collection<SessionRecord>("sessions"),
    turns: db.collection<TurnRecord>("turns"),
    pricing: db.collection<PricingRow>("pricing"),
    admins: db.collection<AdminRecord>("admins"),
    audit: db.collection<AuditEntry>("audit_log"),
    telemetry: db.collection<ClientTelemetryEvent>("telemetry"),
  };
}
