# How to Manage Stored Secrets

**Problem**: You need to see which credentials a processor has stored, add or replace one, or push the same set of credentials to several programs without retyping them into a console.

**When to use this guide**: When commissioning a system that uses secrets in its config, when a device stops authenticating, or when standing up a new program that needs the same credentials as an existing one.

## What a secret is

Essentials stores credentials — device passwords, codec logins — separately from the configuration file, so the config can be shared and version-controlled without the passwords in it. A device config refers to one like this:

```json
"tcpSshProperties": {
  "address": "10.0.0.5",
  "username": "admin",
  "password": { "secret": { "provider": "default", "key": "displayPassword" } }
}
```

At startup the processor swaps that object for the stored value. If the secret is missing, the device simply fails to authenticate — usually with no obvious clue why, which is what this page exists to fix.

### Providers

| Provider                | Scope                                         |
| ----------------------- | --------------------------------------------- |
| `default`               | This program slot only                        |
| `CrestronGlobalSecrets` | Shared by every program slot on the processor |

Pick the provider with the dropdown at the top of the page. Both are independent — the same key can exist in each with different values.

## The one rule that governs everything here

**A stored value can never be read back.** Not by this page, not by the API, not by any console command. The processor will accept a new value and tell you a key exists, and that is all.

So:

- Replacing a secret means typing the **whole new value**, not editing the old one.
- If nobody remembers a credential, it must be recovered from the device itself and re-entered.
- A compromised browser session can destroy or replace your credentials, but cannot steal them.

## Quick Actions

**To add a secret:** click **Add +** in the table header, fill in the key and value, save.

**To replace a value:** click **Replace value** on its row.

**To delete one:** click **Delete** on its row and confirm.

**To copy a credential set to another program:** **Download template** here → fill in the values → **Apply file…** on the other program.

## Adding and replacing

The **Key** is what the device config refers to, so it has to match the config exactly. Keys are limited to **32 characters** and values to **1600** — Crestron Data Store limits, not ours; the form will tell you before you hit them.

The **Description** is optional and is only ever shown on this page. It is worth filling in: six months later, `codecPwd` means nothing without one.

If the key already exists, the form says so and switches to replacing it. If it exists but was **not created by this tool**, you get a much louder warning and a checkbox to confirm — see below.

## Managed vs. other records

The page shows two tables.

**Managed secrets** were created through this tool. It knows their description and when they changed.

**Other data store records** exist on the processor but were created elsewhere — by the console commands, by an older version, or by another part of the system entirely. **Mobile Control keeps its paired-client tokens in the same storage**, and it will show up here.

These are deliberately harder to touch: no **Replace value** button, and deleting one requires typing the key to confirm. Deleting Mobile Control's token record silently un-pairs every touchpanel, and nothing about the key name warns you of that.

To adopt an existing record so it shows as managed, replace its value through this page. That records it without changing anything else about it.

## Bulk apply

Use **Apply file…** to write many secrets at once — the point being to set up several programs with the same credentials.

### The file

```json
{
  "provider": "default",
  "secrets": {
    "displayPassword": "…",
    "codecPassword": "…"
  }
}
```

A plain array also works, if you want per-entry descriptions or providers:

```json
[
  { "key": "displayPassword", "value": "…", "description": "Display admin" },
  { "key": "codecPassword", "value": "…", "provider": "CrestronGlobalSecrets" }
]
```

**Download template** gives you the first form, pre-filled with the keys already stored here and blank values — so the workflow is: download from a working program, fill in the values, apply to the others.

### What happens when you apply one

1. The file is checked in your browser first. Bad JSON, wrong shape, oversized files, over-long keys and blank values are all caught before anything is sent.
2. The processor is asked what the file _would_ do — **nothing is written at this stage**.
3. You get a preview table, one row per entry:

| Action        | Meaning                                                   |
| ------------- | --------------------------------------------------------- |
| **Create**    | The key does not exist yet                                |
| **Overwrite** | It exists and will be replaced                            |
| **Skip**      | It exists and will be left alone                          |
| **Invalid**   | Something is wrong with the entry; it will not be written |
| **Failed**    | The processor refused the write (commit only)             |

4. Only when you press **Apply** does anything get written.

**Existing secrets are skipped by default.** Turn on _Replace secrets that already exist_ to overwrite them — the preview updates immediately so you can see exactly what changes.

**If any entry is invalid, nothing is written at all.** Fix the file and try again rather than applying a partial batch.

**Bulk never deletes.** A key that exists on the processor but is absent from your file is left alone. Applying a file is not a sync.

### Blank values are rejected

A blank value would _delete_ the secret on the processor, so the file checker treats one as an error rather than a no-op. If every value in the file is blank, you are told you are probably applying an unfilled template.

### Handle the file carefully

It contains plaintext credentials. Delete it when you are done, and keep it out of source control. The page warns you about this every time, on purpose.

## Troubleshooting

### A device won't authenticate after commissioning

Check the key here matches the config exactly — including case. A missing secret resolves to an empty string, so the device sees a blank password and fails with no clear error.

### The Secrets page isn't in the menu

The processor's Essentials version doesn't expose the secrets API. The menu entry is driven by what the processor actually reports, not by a version number, so it appears automatically once a supporting version is loaded.

### Everything shows as "not managed here"

The record of which secrets were created here is missing or damaged, so the page can't classify them. **The secrets themselves are unaffected and still work** — you have lost the descriptions and timestamps, not the credentials. Replacing a value re-adopts that key.

### "The processor could not list every record"

The Data Store listing was cut short, so the page may be incomplete. Refresh; if it persists, the processor's storage is worth investigating.

## Related

- [Export and Analyze Configuration](./export-configuration.md) — how config files reference secrets
- [API Endpoints Reference](../reference/api-endpoints.md) — the underlying endpoints
- [Security Model](../explanation/security.md) — who can do this, and what it means
