import type { AIKey, KeySourceType } from "@keylens/core";
import type { KeyLensDb } from "@keylens/db";

export interface ConnectorContext {
  db: KeyLensDb;
  orgId: string;
}

/** One connector implementation per sourceType. */
export interface Connector {
  sourceType: KeySourceType;
  /** Scan a source for secrets. Throws when the real integration is not wired yet. */
  scan(ctx: ConnectorContext): Promise<AIKey[]>;
}

const registry = new Map<KeySourceType, Connector>();

export function registerConnector(connector: Connector): void {
  registry.set(connector.sourceType, connector);
}

export function connectorFor(sourceType: KeySourceType): Connector | undefined {
  return registry.get(sourceType);
}

export function registeredSourceTypes(): KeySourceType[] {
  return [...registry.keys()];
}
