import { findByPropsLazy } from "@webpack";
import { settings } from "../settings";
import { createNotifier, log } from "../util/utils";

const SuperProps = findByPropsLazy("getSuperPropertiesBase64");
export const notify = createNotifier("KeyboardInteractions");

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

function verifyAuthIsValid(authToken: string | null | undefined): boolean {
    if (!authToken || typeof authToken !== "string") return false;

    const tokenRegex = /^(?:[\w-]{23,28}\.[\w-]{6,7}\.[\w-]{27,}|[A-Za-z\d]{24,}\.[\w-]{6,7}\.[\w-]{27,})$/;
    return tokenRegex.test(authToken.trim());
}

function debugResolveAuth(): Promise<string | null> {
    return withNotify(
        "resolveAuth",
        async () => {
            const override = settings.store.tokenOverride?.trim();
            if (override) {
                log.info("Using Authorization Token override: ", override);
                if (!verifyAuthIsValid(override)) throw new Error("Invalid override auth token format");
                return override;
            }

            const Auth = findByPropsLazy("getToken", "setToken");
            const retrieved = Auth?.getToken?.();
            log.info("Retrieved token: ", retrieved);

            if (!verifyAuthIsValid(retrieved)) throw new Error("Invalid or missing Authorization Token");
            return retrieved;
        },
        {
            loading: "Resolving token…",
            success: () => "Auth token verified!",
            error: (e) => `Token resolution failed: ${String(e?.message ?? e)}`
        }
    ).catch((err) => {
        log.error("Error in debugResolveAuth: ", err);
        return null;
    });
}

function debugNonceGenerator(): string | null {
    const nonce = Date.now().toString() + Math.random().toString().slice(2);
    log.info("Generated nonce:", nonce);
    notify("Nonce generated", "MESSAGE", { id: "nonce", duration: 1500 });
    return nonce;
}

function debugSessionIdGenerator(): string | null {
    const tag = "[SessionID]";
    try {
        const override = settings.store.sessionIdOverride?.trim();
        if (override) {
            log.info(`${tag} Using override:`, override);
            notify("Using session override", "MESSAGE");
            return override;
        }

        const fromEnv = (window as any)?.GLOBAL_ENV?.SESSION_ID;
        if (typeof fromEnv === "string" && fromEnv) {
            log.info(`${tag} Using GLOBAL_ENV session ID`, fromEnv);
            return fromEnv;
        }

        const fromStorage =
            window.localStorage?.getItem?.("sessionId") || window.sessionStorage?.getItem?.("sessionId");
        if (typeof fromStorage === "string" && fromStorage) {
            log.info(`${tag} Using storage session ID`, fromStorage);
            return fromStorage;
        }

        const generated = `keyboard_${Date.now()}`;
        log.info(`${tag} Generated fallback:`, generated);
        return generated;
    } catch (err) {
        log.error(`${tag} Error generating session ID`, err);
        notify("Session ID generation failed", "FAILURE");
        return null;
    }
}

async function debugFetchMessage(token: string, channelId: string, messageId: string) {
    const url = `https://discord.com/api/v9/channels/${channelId}/messages/${messageId}`;

    return withNotify(
        "fetchMessage",
        async () => {
            log.info("GET", url);

            const response = await fetch(url, {
                headers: {
                    Authorization: token,
                    "User-Agent": navigator.userAgent,
                    "X-Super-Properties": SuperProps?.getSuperPropertiesBase64?.() ?? ""
                }
            });

            if (!response.ok) throw new Error(`Fetch message failed: ${response.status}`);

            const result = await response.json();
            log.info("Fetched message", {
                id: result?.id,
                components: result?.components?.length ?? 0,
                author: result?.author?.id
            });
            return result;
        },
        {
            loading: "Fetching…",
            success: () => "Done!",
            error: (e) => `Failed: ${String(e?.message ?? e)}`
        }
    );
}

async function debugSendInteraction(opts: {
    token: string;
    sessionId: string;
    guildId: string | null;
    channelId: string;
    messageId: string;
    applicationId: string;
    customId: string;
}) {
    const url = "https://discord.com/api/v9/interactions";

    return withNotify(
        "sendInteraction",
        async () => {
            const body = {
                type: 3,
                nonce: debugNonceGenerator(),
                guild_id: opts.guildId,
                channel_id: opts.channelId,
                message_flags: 0,
                message_id: opts.messageId,
                application_id: opts.applicationId,
                session_id: opts.sessionId,
                data: { component_type: 2, custom_id: opts.customId },
                ...(settings.store.includeTopLevelDupFields && {
                    component_type: 2,
                    custom_id: opts.customId
                })
            };

            log("POST", url, body);

            const start = performance.now();
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: opts.token,
                    "Content-Type": "application/json",
                    "User-Agent": navigator.userAgent,
                    "X-Super-Properties": SuperProps?.getSuperPropertiesBase64?.() ?? ""
                },
                body: JSON.stringify(body)
            });

            const elapsed = Math.round(performance.now() - start);
            if (response.status === 204) {
                log(`Interaction OK (204) in ${elapsed}ms`);
                return { ok: true, elapsed } as const;
            }

            if (response.status === 429) {
                const rate = await response.json().catch(() => ({}));
                throw new Error(`Rate limited: retry after ${rate?.retry_after ?? "?"}s`);
            }

            const text = await response.text().catch(() => "");
            throw new Error(`HTTP ${response.status} ${text}`);
        },
        {
            loading: "Sending interaction…",
            success: (res) => `Sent (${res?.elapsed ?? "?"}ms)`,
            error: (e) => `Interaction failed: ${String(e?.message ?? e)}`
        }
    );
}

async function debugKeybindHandler() {
    const token = await debugResolveAuth();
    const sessionId = debugSessionIdGenerator();

    if (!token || !sessionId) {
        const which = !token && !sessionId ? "token & session" : !token ? "token" : "session";
        notify(`Missing ${which}. Set overrides in settings.`, "FAILURE");
        throw new Error("Missing auth/session");
    }

    const { guildId = null, channelId, messageId, applicationId, customId } = settings.store;

    if (!channelId || !messageId || !applicationId || !customId) {
        notify("Target fields incomplete (channel/message/app/custom)", "FAILURE");
        throw new Error("Incomplete target");
    }

    try {
        await debugFetchMessage(token, channelId, messageId);
    } catch (err) {
        log.warn("Fetch message failed (continuing):", err);
    }

    return debugSendInteraction({ token, sessionId, guildId, channelId, messageId, applicationId, customId });
}

async function debugTestKeybind() {
    return withNotify(
        "testKeybind",
        async () => {
            const { elapsed } = await debugKeybindHandler();
            return elapsed;
        },
        {
            loading: "Sending keybind interaction…",
            success: (t) => `Pressed ✓ (${t}ms)`,
            error: (e) => `Failed ✗ ${String(e?.message ?? e)}`
        }
    );
}
