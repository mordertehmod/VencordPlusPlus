/*
 * Vencord, a Discord client mod
 * KeyboardInteractions — Settings-Driven + POST /interactions
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin, { OptionType } from "@utils/types";
import { Devs } from "@utils/constants";
import { definePluginSettings } from "@api/Settings";
import { findByPropsLazy } from "@webpack";
import { RestAPI, showToast, Toasts } from "@webpack/common";
import { SelectedGuildStore, SelectedChannelStore, MessageStore } from "@webpack/common";
import { createNotifier, log } from "./util/utils";

const IPC_EVENT = "KEYBOARDINTERACTIONS_HOTKEY";

declare global {
    interface Window {
        DiscordNative?: {
            ipc?: {
                on?: (event: string, listener: (...args: any[]) => void) => void;
                removeListener?: (event: string, listener: (...args: any[]) => void) => void;
                send?: (event: string, ...args: any[]) => void;
            };
        };
    }
}


// ===== helpers from webpack (optional, best-effort) =====
const SuperProps = findByPropsLazy("getSuperPropertiesBase64");

export const notify = createNotifier("KeyboardInteractions");

type NotifyKind = "success" | "failure" | "info" | "warning";

type PromiseMsgs<T = unknown> = {
    loading: string;
    success: (v: T) => string | string;
    error: (err: any) => string | string;
};

export async function withNotify<T>(
    id: string,
    run: () => Promise<T>,
    msgs: PromiseMsgs<T>,
    opts?: { duration?: number; position?: number }
): Promise<T> {
    const tag = `[withNotify:${id}]`;
    const startTime = performance.now();

    log.info(`${tag} Starting`);
    notify(msgs.loading, "MESSAGE", { id, replace: true, duration: 2000 });

    try {
        const value = await run();
        const elapsed = Math.round(performance.now() - startTime);
        const successMsg = typeof msgs.success === "function" ? msgs.success(value) : msgs.success;
        log.info(`${tag} Success in ${elapsed}ms:`, successMsg, value);
        notify(`${successMsg} (${elapsed}ms)`, "SUCCESS", { id, replace: true, duration: opts?.duration ?? 2500 });
        return value;
    } catch (err) {
        const elapsed = Math.round(performance.now() - startTime);
        const errMsg = typeof msgs.error === "function" ? msgs.error(err) : msgs.error;
        log.error(`${tag} Error after ${elapsed}ms:`, err);
        notify(`${errMsg} (${elapsed}ms)`, "FAILURE", { id, replace: true, duration: opts?.duration ?? 3500 });
        throw err;
    } finally {
        log.debug(`${tag} Finished`);
    }
}

// ===== Settings =====
// Single-target, but easy to expand. Uses Vencord's settings system + a React component.
const settings = definePluginSettings({
  enabled: { type: OptionType.BOOLEAN, description: "Enable hotkeys", default: true },
  debugMode: { type: OptionType.BOOLEAN, description: "Debug logging to console", default: true },
  notifications: { type: OptionType.BOOLEAN, description: "Show toasts", default: true },
  globalHotkeys: { type: OptionType.BOOLEAN, description: "Enable hotkeys when Discord is minimized/not focused", default: false },

  // Target message + button
  guildId: { type: OptionType.STRING, description: "Guild ID (empty for DMs)", default: "1193275366333235281", placeholder: "1193…" },
  channelId: { type: OptionType.STRING, description: "Channel ID", default: "1278385036491751565", placeholder: "1278…" },
  messageId: { type: OptionType.STRING, description: "Message ID", default: "1395925046723346535", placeholder: "1395…" },
  applicationId: { type: OptionType.STRING, description: "Application (bot) ID", default: "1278326157275562075", placeholder: "1278…" },
  customId: { type: OptionType.STRING, description: "Button custom_id", default: "pylav__pylavcontroller_persistent_view:skip_button:10", placeholder: "pylav__…" },

  // Networking quirks
  includeTopLevelDupFields: { type: OptionType.BOOLEAN, description: "Include top-level custom_id/component_type (mimic client)", default: true },

  // Auth overrides for testing
  tokenOverride: { type: OptionType.STRING, description: "Token override (testing only)", default: "", placeholder: "mfa.xxxxxx" },
  sessionIdOverride: { type: OptionType.STRING, description: "Session ID override (testing only)", default: "", placeholder: "f60e…" },

  // Hotkey
  hotkey: { type: OptionType.STRING, description: "Hotkey (e.g. Ctrl+Alt+S)", default: "Ctrl+Alt+S" },

  skipSong: { type: OptionType.KEYBIND, description: "Set keybind to skip song", global: true },

  prevSong: { type: OptionType.KEYBIND, description: "Set keybind to go back a song", global: true },

  playPause: { type: OptionType.KEYBIND, description: "Set keybind to pause or play bot", global: true },

  muteBot: { type: OptionType.KEYBIND, description: "Set keybind to mute the bot", global: true },

  // Custom settings panel
  panel: {
    type: OptionType.COMPONENT,
    component: () => (
      <div style={{ padding: "10px", display: "grid", gap: 8 }}>
        <h3>🎛 KeyboardInteractions</h3>
        <p style={{ opacity: 0.8, fontSize: 12 }}>Set your target message + the button's custom_id, plus optional auth overrides for quick tests.</p>

        {renderText("Guild ID", "guildId")}
        {renderText("Channel ID", "channelId")}
        {renderText("Message ID", "messageId")}
        {renderText("Application ID", "applicationId")}
        {renderText("Button custom_id", "customId")}

        <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={!!settings.store.includeTopLevelDupFields} onChange={e => settings.store.includeTopLevelDupFields = e.currentTarget.checked} />
            Include top-level duplicate fields
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={!!settings.store.notifications} onChange={e => settings.store.notifications = e.currentTarget.checked} />
            Show toasts
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={!!settings.store.debugMode} onChange={e => settings.store.debugMode = e.currentTarget.checked} />
            Debug logs
          </label>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          <h4>Auth Overrides (testing)</h4>
          {renderText("Token override", "tokenOverride", "mfa.xxxxxx")}
          {renderText("Session ID override", "sessionIdOverride", "f60e…")}
        </div>

        <div style={{ marginTop: 12 }}>
          {renderText("Hotkey", "hotkey", "Ctrl+Alt+S")}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={() => { settings.store.tokenOverride = ""; settings.store.sessionIdOverride = ""; notify("Cleared overrides", "info"); }}>Clear overrides</button>
          <button onClick={() => testPress().catch(()=>{})}>Test now</button>
        </div>
      </div>
    )
  }
});

function renderText(label: string, key: keyof typeof settings.store, placeholder?: string) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 13 }}>{label}</span>
      <input
        type="text"
        placeholder={placeholder ?? settings.options[key]?.placeholder ?? ""}
        value={(settings.store[key] as any) ?? ""}
        onChange={e => (settings.store[key] = (e.currentTarget.value as any))}
        style={{ padding: "6px 10px", borderRadius: 4, border: "1px solid var(--background-modifier-accent)", background: "var(--background-secondary)", color: "var(--text-normal)" }}
      />
    </label>
  );
}

// ===== util =====

function matchCombo(e: KeyboardEvent, combo: string) {
  const want = combo.toLowerCase().split("+").map(s => s.trim()).filter(Boolean);
  const needCtrl = want.includes("ctrl");
  const needAlt = want.includes("alt");
  const needShift = want.includes("shift");
  const needMeta = want.includes("meta");
  const key = want.find(k => !["ctrl","alt","shift","meta"].includes(k));
  return (!!e.ctrlKey === needCtrl)
      && (!!e.altKey === needAlt)
      && (!!e.shiftKey === needShift)
      && (!!e.metaKey === needMeta)
      && (e.key.toLowerCase() === (key ?? "").toLowerCase());
}

function nonce() { return Date.now().toString() + Math.random().toString().slice(2); }

function resolveAuth(): string | undefined {
    try {
        const tOverride = settings.store.tokenOverride?.trim();
        if (tOverride) return tOverride;

        const Auth = findByPropsLazy("getToken", "setToken");
        const valueRetrieved = Auth?.getToken?.();

        try {
            showToast(`getToken returned auth: ${valueRetrieved}`, Toasts.Type.SUCCESS);
            console.log(`[KeyboardInteractions] Auth token: ${valueRetrieved}`);
            return valueRetrieved;
        } catch (e) {
            if (valueRetrieved !== null || undefined) {
                showToast(`getToken returned auth: ${valueRetrieved}`, Toasts.Type.FAILURE);
                console.log(`[KeyboardInteractions] Auth token: ${valueRetrieved}`);
            }
            showToast(`resolveToken error: ${e}`, Toasts.Type.FAILURE);
        }
    } catch (e) {
        log.warn("resolveToken error", e);
    }

    return undefined;
}

function resolveSessionId(): string | undefined {
  try {
    // 0) explicit override
    const sOverride = settings.store.sessionIdOverride?.trim();
    if (sOverride) return sOverride;

    // 1) GLOBAL_ENV
    // @ts-ignore
    const s1 = (window as any)?.GLOBAL_ENV?.SESSION_ID;
    if (typeof s1 === "string" && s1) return s1;

    // 2) storage shims
    const s2 = window.localStorage?.getItem?.("sessionId") || window.sessionStorage?.getItem?.("sessionId");
    if (typeof s2 === "string" && s2) return s2;

    // 3) last-resort generated id (works for some flows)
    return `keyboard_${Date.now()}`;
  } catch (e) { log.warn("resolveSessionId error", e); }
  return undefined;
}

function isBotToken(token: string | null | undefined): boolean {
    return !!token && /^Bot\s+[\w-]{20,}\.[\w-]{6,}\.[\w-]{20,}/.test(token);
}

type FetchMessageResult = {
    source: "MessageStore" | "RestAPI" | "Fetch";
    data: any;
};

async function fetchMessage(token: string, channelId: string, messageId: string): Promise<FetchMessageResult> {
    const url = `https://discord.com/api/v9/channels/${channelId}/messages/${messageId}`;

    return withNotify(
        "fetchMessage",
        async () => {
            log.group("GET", url);

            // 1) Cache first
            const cached =
                MessageStore?.getMessage?.(channelId, messageId) ??
                MessageStore?.getMessages?.(channelId)?._map?.get?.(messageId);

            if (cached) {
                log.info("[MessageStore] hit", {
                    id: cached?.id,
                    components: cached?.components?.length ?? 0,
                    author: cached?.author?.id
                });
                log.groupEnd();
                return { source: "MessageStore", data: cached } as FetchMessageResult;
            }

            // 2) Try internal REST (if you kept it)
            if (RestAPI?.get && isBotToken(token)) {
                try {
                    const r = await RestAPI.get({ url: `/channels/${channelId}/messages/${messageId}` });
                    log.info("[RestAPI] OK", {
                        id: r?.body?.id,
                        components: r?.body?.components?.length ?? 0,
                        author: r?.body?.author?.id
                    });
                    log.groupEnd();
                    return { source: "RestAPI", data: r.body } as FetchMessageResult;
                } catch (e) {
                    log.warn("[RestAPI] failed, falling back to fetch()", e);
                }
            }

            // 3) Raw fetch (user tokens will 403 on this endpoint; bot tokens may succeed)
            const r = await fetch(url, {
                headers: {
                    Authorization: token,
                    "Content-Type": "application/json",
                    "User-Agent": navigator.userAgent,
                    "X-Super-Properties": SuperProps?.getSuperPropertiesBase64?.() ?? "",
                    "X-Discord-Locale": "en-US",
                    "X-Discord-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
                    "Referrer": `https://discord.com/channels/${SelectedGuildStore.getGuildId() ?? "@me"}/${channelId}`,
                    "Origin": "https://discord.com"
                }
            });

            if (!r.ok) {
                const text = await r.text().catch(() => "");
                log.warn("[fetch] non-OK", r.status, text || "(no body)");
                log.groupEnd();
                throw new Error(`Fetch message failed: ${r.status} ${text}`);
            }

            const j = await r.json();
            log.info("[fetch] OK", {
                id: j?.id,
                components: j?.components?.length ?? 0,
                author: j?.author?.id
            });
            log.groupEnd();
            return { source: "Fetch", data: j } as FetchMessageResult;
        },
        {
            loading: "Fetching…",
            success: (res) => `Done! [${res.source}]`,
            error: (e) => `Failed: ${String(e?.message ?? e)}`
        }
    );
}

async function postButtonInteraction(opts: {
  token: string; sessionId: string; guildId: string | null; channelId: string; messageId: string; applicationId: string; customId: string;
}) {
  const body: any = {
    type: 3,
    nonce: nonce(),
    guild_id: opts.guildId,
    channel_id: opts.channelId,
    message_flags: 0,
    message_id: opts.messageId,
    application_id: opts.applicationId,
    session_id: opts.sessionId,
    data: { component_type: 2, custom_id: opts.customId }
  };
  if (settings.store.includeTopLevelDupFields) {
    body.component_type = 2;
    body.custom_id = opts.customId;
  }

  const url = "https://discord.com/api/v9/interactions";
  log("POST", url, body);
  const t0 = performance.now();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": opts.token,
      "Content-Type": "application/json",
      "User-Agent": navigator.userAgent,
      "X-Super-Properties": SuperProps?.getSuperPropertiesBase64?.() ?? ""
    },
    body: JSON.stringify(body)
  });
  const dt = Math.round(performance.now() - t0);
  const perfResult = Math.round(performance.now() - t0);

  if (res.status === 204) { log("204 OK in", dt, "ms"); return { ok: true, dt } as const; }
  if (res.status === 429) {
    const j = await res.json().catch(() => ({}));
    throw new Error(`Rate limited; retry after ${j?.retry_after ?? "?"}s`);
  }
  const text = await res.text().catch(() => "");
  throw new Error(`HTTP ${res.status} ${text}`);
}

async function pressOnce() {
  const token = resolveAuth();
  const sessionId = resolveSessionId();
  if (!token || !sessionId) {
    const which = !token && !sessionId ? "token & session" : (!token ? "token" : "session");
    notify(`Missing ${which}. Set overrides in settings.`, "failure");
    throw new Error("Missing auth");
  }

  const guildId = settings.store.guildId || null;
  const channelId = settings.store.channelId;
  const messageId = settings.store.messageId;
  const applicationId = settings.store.applicationId;
  const customId = settings.store.customId;

  if (!channelId || !messageId || !applicationId || !customId) {
    notify("Target fields incomplete (channel/message/app/custom)", "failure");
    throw new Error("Incomplete target");
  }

  // Optional: ensure message exists (and potentially re-resolve applicationId/customId)
  try { await fetchMessage(token, channelId, messageId); } catch (e) { log.warn("Fetch message failed (continuing)", e); }

  const result = await postButtonInteraction({ token, sessionId, guildId, channelId, messageId, applicationId, customId });
  return result;
}

async function testPress() {
    try {
        const { dt } = await pressOnce();
        notify(`Pressed ✓ (in ${dt} ms)`, "success");
    } catch (e: any) {
        log.error(e);
        notify(`Failed ✗ ${e?.message ?? e}`, "failure");
  }
}

let keyHandler: any = null;

async function handleKeybind(action: string) {
    switch(action) {
        case "skip": {
            if (settings.store.debugMode) {
                const { perfResult } = await pressOnce();
                notify(`Pressed ✓ (in ${perfResult} ms)`, "success")
            }
            testPress();
            break;
        }
        case "prev": {
            // TODO: implement previous song handler
            break;
        }
        case "playPause": {
            // TODO implement play and pause handler
            break;
        }
        case "muteBot": {
            // TODO implement mute handler
            break;
        }
        default: {
            console.log("Keybind handler failed");
        }
    }
}

export default definePlugin({
    name: "KeyboardInteractions",
    description: "Bind a hotkey to press a specific bot message button (POST /api/v9/interactions)",
    authors: [Devs.LSDZaddi],
    settings,

    keybinds: [
        {
            event: "skipSong",
            global: true,
            function: () => handleKeybind("skip"),
            options:
            {
                blurred: false,
                focused: false,
                keydown: true,
                keyup: false
            }
        },
        {
            event: "prevSong",
            global: true,
            function: () => handleKeybind("prev"),
            options:
            {
                blurred: false,
                focused: false,
                keydown: true,
                keyup: false
            }
        },
        {
            event: "playPause",
            global: true,
            function: () => handleKeybind("playPause"),
            options:
            {
                blurred: false,
                focused: false,
                keydown: true,
                keyup: false
            }
        },
        {
            event: "muteBot",
            global: true,
            function: () => handleKeybind("mute"),
            options:
            {
                blurred: false,
                focused: false,
                keydown: true,
                keyup: false
            }
        }
    ],

    globalHotkeyIPCHandler: null as ((event: any, payload: any) => void) | null,

    start() {
        this.attachGlobalHotkeyHandler();
        keyHandler = (e: KeyboardEvent) => {
            if (!settings.store.enabled) return;
            const combo = settings.store.hotkey || "";
            if (!combo) return;
            if (matchCombo(e, combo)) {
                e.preventDefault(); e.stopPropagation();
                console.groupCollapsed("[KeyboardInteractions] Hotkey pressed", combo);
                testPress().finally(() => console.groupEnd());
            }
        };

        document.addEventListener("keydown", keyHandler, true);
        notify("KeyboardInteractions loaded", "info");
        log("Plugin started");
    },

    stop() {
        this.detachGlobalHotkeyHandler();
        if (keyHandler) document.removeEventListener("keydown", keyHandler, true);

        notify("KeyboardInteractions unloaded", "info");
        log("Plugin stopped");
    },

    attachGlobalHotkeyHandler() {
        const ipc = window.DiscordNative?.ipc;
        if (!ipc?.on) {
            log.warn("Global hotkey IPC not available (DiscordNative.ipc missing)");
            return;
        }

        // prevent dupes
        if (this.globalHotkeyIPCHandler) return;

        this.globalHotkeyIPCHandler = (_event: any, payload: any) => {
            if (!settings.store.globalHotkeys) {
                log.warn("[GlobalHotkey] Ignored: global hotkeys disabled");
                return;
            }

            if (!payload || payload.op !== "skip") {
                log.warn("[GlobalHotkey] Ignored unknown op", payload);
                return;
            }

            log.info("[GlobalHotkey] Triggered global skip hotkey");

            testPress().catch(err =>
                log.error("[GlobalHotkey] testPress failed", err)
            );
        };

        ipc.on(IPC_EVENT, this.globalHotkeyIPCHandler);
        log.info(`Subscribed to IPC event ${IPC_EVENT}`);
    },

    detachGlobalHotkeyHandler() {
        const ipc = window.DiscordNative?.ipc;

        if (!ipc?.removeListener || !this.globalHotkeyIPCHandler) return;

        ipc.removeListener(IPC_EVENT, this.globalHotkeyIPCHandler);
        log.info(`Unsubscribed from IPC event ${IPC_EVENT}`);
        this.globalHotkeyIPCHandler = null;
    }
});
