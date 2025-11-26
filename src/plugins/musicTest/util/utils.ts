import "../index";
import { Logger } from "@utils/Logger";
import React from "react";
import { settings } from "../settings";
import { Toasts, showToast as notification } from "@webpack/common"; // or from your custom Toasts source
import { Notification } from './../../reviewDB/entities';

const vc = new Logger("KeyboardInteractions", "#86b3ff");

type NotifyKind = "success" | "failure" | "info" | "warning";

/*
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
*/

// **                                                   CONSOLE LOGGING API                                                   **

export const log = Object.assign((...a: any[]) => vc.log(...a), {
        info:  (...a: any[]) => vc.info(...a),
        warn:  (...a: any[]) => vc.warn(...a),
        error: (...a: any[]) => vc.error(...a),
        debug: (...a: any[]) => vc.debug(...a),
        trace: (...a: any[]) => console.trace("[KeyboardInteractions][TRACE]", ...a),
        group: (...a: any[]) => console.groupCollapsed("[KeyboardInteractions]", ...a),
        groupEnd: () => console.groupEnd(),
    }
);

// **                                                NOTIFICATIONS API (Toasts)                                              **

type ToastTypeKey = "MESSAGE" | "SUCCESS" | "FAILURE" | "CUSTOM" | "CLIP" | "LINK" | "FORWARD" | "BOOKMARK" | "CLOCK";

type NotifyPositionKey = "TOP" | "BOTTOM";

export interface NotifyOptions {
    position?: number;
    duration?: number;
    component?: React.ReactNode;
    id?: string;
    replace?: boolean;
    ifDisabledUseConsole?: boolean;
}

const notificationComponent = (globalThis as any).Toasts ?? Toasts;
const displayNoti = (globalThis as any).showToast ?? notification ?? ((msg: string, type = notificationComponent.Type.MESSAGE, options?: NotifyOptions) => notificationComponent?.displayNoti?.(notificationComponent.create(msg, type, options)));

function display(message: string, type?: ToastTypeKey | string, opts?: NotifyOptions) {
    const enabled = (globalThis as any).settings?.store?.notifications ?? true;
    if (!enabled) {
        if (opts?.ifDisabledUseConsole) console.log("[Notify disabled]", type ?? "MESSAGE", message);
        return;
    }

    const valid = typeof type === "string" && type.toUpperCase() in notificationComponent.Type;
    const finalType = valid ? (notificationComponent.Type as any)[type.toUpperCase()] : (type ?? notificationComponent.Type.MESSAGE);

    const options: NotifyOptions = {
        position: opts?.position ?? notificationComponent.Position.BOTTOM,
        duration: opts?.duration ?? 3000,
        component: opts?.component,
        ...opts
    };

    try {
        if (typeof displayNoti === "function") displayNoti(message, finalType, options);
        else if (notificationComponent?.create && notificationComponent?.displayNoti) notificationComponent.displayNoti(notificationComponent.create(message, finalType, options));
        else console.log("[Notify Fallback]", finalType, message);
    } catch (e) {
        console.error("[Notify Error]", e);
    }
}

type NotifyFn = (message: string, type?: string, options?: NotifyOptions) => void;

type NotifyAPI = NotifyFn & Record<Lowercase<ToastTypeKey>, NotifyFn> & {
    pop(): void;
    promise<T>(
        p: Promise<T>,
        msgs: { loading: string; success: (v: T) => string | string; error: (err: any) => string | string },
        opts?: { id?: string; duration?: number; position?: number }
    ): Promise<T>;
};

/** Factory */
export function createNotifier(tag?: string): NotifyAPI {
    const prefix = (m: string) => (tag ? `${tag}: ${m}` : m);

    const base = ((msg: string, type: string = notificationComponent.Type.MESSAGE, opts?: NotifyOptions) =>
        display(prefix(msg), type, opts)) as NotifyAPI;

    for (const key of Object.keys(notificationComponent.Type)) {
        const name = key.toLowerCase() as Lowercase<ToastTypeKey>;
        (base as any)[name] = (m: string, _ = notificationComponent.Type[key], o?: NotifyOptions) =>
        display(prefix(m), notificationComponent.Type[key], o);
    }

    base.pop = () => notificationComponent?.pop?.();

    base.promise = async <T>(
        p: Promise<T>,
        msgs: { loading: string; success: (v: T) => string | string; error: (err: any) => string | string },
        opts?: { id?: string; duration?: number; position?: number }
    ) => {
        const id = opts?.id ?? notificationComponent.genId?.() ?? Math.random().toString(36).slice(2);
        display(prefix(msgs.loading), notificationComponent.Type.MESSAGE, { id, duration: 2000, position: opts?.position, replace: true });
        try {
            const val = await p;
            const msg = typeof msgs.success === "function" ? msgs.success(val) : msgs.success;
            display(prefix(msg), notificationComponent.Type.SUCCESS, { id, duration: opts?.duration ?? 2500, replace: true, position: opts?.position });
            return val;
        } catch (err) {
            const msg = typeof msgs.error === "function" ? msgs.error(err) : msgs.error;
            display(prefix(msg), notificationComponent.Type.FAILURE, { id, duration: opts?.duration ?? 3500, replace: true, position: opts?.position });
            throw err;
        }
    };

    return base;
}

/**

// usage
notify.success("Connected");
notify.failure("Request failed", { duration: 4000 });
notify("Simple message");
notify.promise(
  fetchStuff(),
  {
    loading: "Fetching...",
    success: () => "Done!",
    error: (e) => `Failed: ${String(e)}`
  },
  { id: "fetch" }
);*/
