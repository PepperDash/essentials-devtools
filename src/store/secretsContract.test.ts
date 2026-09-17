import { describe, expect, it } from "vitest";

import {
  bulkSecretsRequest,
  deleteSecretCommand,
  describeSecretsError,
  DOCUMENTED_MAX_SECRET_KEY_LENGTH,
  MAX_SECRET_VALUE_LENGTH,
  pruneIndexCommand,
  rebuildIndexCommand,
  RESERVED_KEY_PREFIX,
  SECRETS_BULK_PATH,
  SECRETS_COMMAND_PATH,
  SECRETS_PATH,
  SECRETS_TEMPLATE_PATH,
  setSecretCommand,
  supportsSecretsApi,
  testSecretCommand,
  updateSecretCommand,
} from "./secretsContract";

// These assertions are deliberately literal. They are the only thing standing between a rename on
// the C# side (SecretsApiContracts.cs) and a silently broken endpoint, since request bodies are
// never type-checked across the wire.
describe("command builders emit the exact wire shape", () => {
  it("set", () => {
    expect(setSecretCommand("default", "displayPassword", "hunter2")).toEqual({
      action: "set",
      provider: "default",
      key: "displayPassword",
      value: "hunter2",
    });
  });

  it("set with description and overwrite", () => {
    expect(
      setSecretCommand("default", "displayPassword", "hunter2", {
        description: "Display admin",
        overwrite: true,
      }),
    ).toEqual({
      action: "set",
      provider: "default",
      key: "displayPassword",
      value: "hunter2",
      description: "Display admin",
      overwrite: true,
    });
  });

  it("omits optional fields rather than sending null or false", () => {
    const request = setSecretCommand("default", "k", "v", { overwrite: false });
    expect(request).not.toHaveProperty("overwrite");
    expect(request).not.toHaveProperty("description");
  });

  it("update", () => {
    expect(updateSecretCommand("default", "k", "v", "note")).toEqual({
      action: "update",
      provider: "default",
      key: "k",
      value: "v",
      description: "note",
    });
  });

  it("delete carries no value", () => {
    const request = deleteSecretCommand("default", "k");
    expect(request).toEqual({ action: "delete", provider: "default", key: "k" });
    expect(request).not.toHaveProperty("value");
  });

  it("test carries no value", () => {
    const request = testSecretCommand("CrestronGlobalSecrets", "k");
    expect(request).toEqual({ action: "test", provider: "CrestronGlobalSecrets", key: "k" });
    expect(request).not.toHaveProperty("value");
  });

  it("pruneIndex", () => {
    expect(pruneIndexCommand("default")).toEqual({ action: "pruneIndex", provider: "default" });
  });

  it("rebuildIndex, with and without adoptKeys", () => {
    expect(rebuildIndexCommand("default")).toEqual({
      action: "rebuildIndex",
      provider: "default",
    });
    expect(rebuildIndexCommand("default", ["a", "b"])).toEqual({
      action: "rebuildIndex",
      provider: "default",
      adoptKeys: ["a", "b"],
    });
    // An empty array would read as "adopt nothing" but is indistinguishable from a bug; omit it.
    expect(rebuildIndexCommand("default", [])).not.toHaveProperty("adoptKeys");
  });
});

describe("bulk request builder", () => {
  const entries = [{ key: "a", value: "1" }, { key: "b", value: "2" }];

  it("builds a preview request", () => {
    expect(
      bulkSecretsRequest("default", entries, { mode: "preview", overwrite: false }),
    ).toEqual({
      mode: "preview",
      provider: "default",
      overwrite: false,
      secrets: entries,
    });
  });

  it("carries overwrite and the unmanaged acknowledgement on commit", () => {
    expect(
      bulkSecretsRequest("default", entries, {
        mode: "commit",
        overwrite: true,
        allowUnmanagedOverwrite: true,
      }),
    ).toEqual({
      mode: "commit",
      provider: "default",
      overwrite: true,
      allowUnmanagedOverwrite: true,
      secrets: entries,
    });
  });

  it("sends overwrite:false explicitly rather than omitting it", () => {
    // Omitting it would rely on the server's default; being explicit means a server-side default
    // change can never silently start overwriting credentials.
    const request = bulkSecretsRequest("default", entries, { mode: "commit", overwrite: false });
    expect(request.overwrite).toBe(false);
    expect(request).not.toHaveProperty("allowUnmanagedOverwrite");
  });
});

describe("constants match the Crestron Data Store limits", () => {
  it("uses the documented caps", () => {
    expect(DOCUMENTED_MAX_SECRET_KEY_LENGTH).toBe(32);
    expect(MAX_SECRET_VALUE_LENGTH).toBe(1600);
  });

  it("uses the agreed endpoint paths and reserved prefix", () => {
    expect(SECRETS_PATH).toBe("secrets");
    expect(SECRETS_COMMAND_PATH).toBe("secrets/command");
    expect(SECRETS_BULK_PATH).toBe("secrets/bulk");
    expect(SECRETS_TEMPLATE_PATH).toBe("secrets/template");
    expect(RESERVED_KEY_PREFIX).toBe("__essSecretsIdx");
  });
});

describe("supportsSecretsApi", () => {
  const routes = (...urls: string[]) => urls.map((Url) => ({ Url }));

  it("detects the secrets routes", () => {
    expect(supportsSecretsApi(routes("/cws/app01/api/secrets"))).toBe(true);
    expect(supportsSecretsApi(routes("/api/secrets/bulk"))).toBe(true);
    expect(supportsSecretsApi(routes("secrets"))).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(supportsSecretsApi(routes("/api/Secrets/Command"))).toBe(true);
  });

  // The reason this matches a whole path segment instead of using .includes(), which is what the
  // routing feature does - "secrets" collides far more easily than "routingCommand".
  it("is not fooled by an unrelated route containing the substring", () => {
    expect(supportsSecretsApi(routes("/api/mysecretsthing"))).toBe(false);
    expect(supportsSecretsApi(routes("/api/secretsmanager"))).toBe(false);
    expect(supportsSecretsApi(routes("/api/devicesecrets"))).toBe(false);
  });

  it("returns false for an older processor and for an unresolved probe", () => {
    expect(supportsSecretsApi(routes("/api/devices", "/api/versions"))).toBe(false);
    expect(supportsSecretsApi([])).toBe(false);
    expect(supportsSecretsApi(undefined)).toBe(false);
  });

  it("tolerates a route with no Url", () => {
    expect(supportsSecretsApi([{}])).toBe(false);
  });
});

describe("describeSecretsError", () => {
  it("prefers the endpoint's structured message", () => {
    expect(
      describeSecretsError({
        status: 409,
        data: { status: "error", error: { code: "alreadyExists", message: "Key already exists." } },
      }),
    ).toBe("Key already exists.");
  });

  it("falls back to the status code when there is no body", () => {
    expect(describeSecretsError({ status: 500 })).toBe("Secrets request failed (500).");
  });

  it("reports a transport failure plainly", () => {
    expect(describeSecretsError({ status: "FETCH_ERROR" })).toBe(
      "Could not reach the processor.",
    );
    expect(describeSecretsError(undefined)).toBe("Could not reach the processor.");
  });

  // SECURITY: the describer reads only the response body. A submitted value living on the error
  // object elsewhere must never reach the rendered string.
  it("never echoes a submitted value back into the message", () => {
    const message = describeSecretsError({
      status: 400,
      data: { status: "error", error: { code: "valueTooLong", message: "Value is too long." } },
      config: { data: JSON.stringify({ value: "hunter2" }) },
    });
    expect(message).not.toContain("hunter2");
    expect(message).toBe("Value is too long.");
  });
});
