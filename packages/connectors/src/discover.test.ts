import { describe, expect, it } from "vitest";
import { fingerprint } from "@keylens/core";
import { discoverFromText } from "./discover";

const OPENAI_KEY = "sk-proj-abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ANTHROPIC_KEY = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";

describe("discoverFromText", () => {
  it("finds an OpenAI key, an Anthropic key, and an AWS AKIA key", () => {
    const text = [
      "src/lib/ai.ts:",
      `  openai: "${OPENAI_KEY}"`,
      `  anthropic: "${ANTHROPIC_KEY}"`,
      `  aws: "${AWS_KEY}"`,
    ].join("\n");
    const found = discoverFromText(text);
    const byProvider = new Map(found.map((k) => [k.provider, k]));

    expect(byProvider.get("openai")?.masked).toBeDefined();
    expect(byProvider.get("openai")?.fingerprint).toBe(fingerprint(OPENAI_KEY));
    expect(byProvider.get("anthropic")?.masked).toBeDefined();
    expect(byProvider.get("aws-bedrock")?.masked).toBeDefined();

    for (const key of found) {
      expect(key.status).toBe("unknown");
      expect(key.sourceType).toBe("manual");
      expect(key.meta._scan).toBe(true);
      // Never store the raw secret.
      expect(JSON.stringify(key)).not.toContain(OPENAI_KEY);
      expect(JSON.stringify(key)).not.toContain(ANTHROPIC_KEY);
      expect(JSON.stringify(key)).not.toContain(AWS_KEY);
    }
  });

  it("dedupes repeated occurrences by fingerprint", () => {
    const text = `${OPENAI_KEY} then again ${OPENAI_KEY} and ${AWS_KEY} and ${AWS_KEY}`;
    const found = discoverFromText(text);
    expect(found.filter((k) => k.fingerprint === fingerprint(OPENAI_KEY))).toHaveLength(1);
    expect(found.filter((k) => k.fingerprint === fingerprint(AWS_KEY))).toHaveLength(1);
    expect(found).toHaveLength(2);
  });

  it("classifies an Anthropic key as anthropic, not openai", () => {
    const found = discoverFromText(ANTHROPIC_KEY);
    expect(found).toHaveLength(1);
    expect(found[0]?.provider).toBe("anthropic");
  });

  it("returns no keys for text without secrets", () => {
    expect(discoverFromText("just a normal README with no keys inside")).toHaveLength(0);
  });
});
