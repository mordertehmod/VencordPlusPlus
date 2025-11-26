/*
 * Vencord, a Discord client mod
 * MusicBotKeyboard Plugin - Optimized Version
 * Precisely targets bot message buttons using Discord's actual API structure
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { Devs } from "@utils/constants";
import { findByPropsLazy, wreq } from "@webpack";
import { SelectedChannelStore, showToast, Toasts, MessageStore, SelectedGuildStore, FluxDispatcher } from "@webpack/common";

// Find modules for API interactions
const RestAPI = findByPropsLazy("post", "put", "patch", "delete", "get") || {};
const UserStore = findByPropsLazy("getCurrentUser", "getUser") || {};

const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable keyboard shortcuts",
        default: true
    },
    onlyBotMessages: {
        type: OptionType.BOOLEAN,
        description: "Only interact with bot messages (recommended)",
        default: true
    },
    targetBotId: {
        type: OptionType.STRING,
        description: "Specific bot ID to target (leave empty for any bot)",
        default: "",
        placeholder: "e.g., 1278326157275562075"
    },
    showNotifications: {
        type: OptionType.BOOLEAN,
        description: "Show toast notifications",
        default: true
    },
    debugMode: {
        type: OptionType.BOOLEAN,
        description: "Enable debug logging",
        default: false
    },
    shortcuts: {
        type: OptionType.COMPONENT,
        component: () => {
            return (
                <div style={{ padding: "10px" }}>
                    <h3>⌨️ Keyboard Shortcuts</h3>
                    <p style={{ marginBottom: "10px", opacity: 0.8, fontSize: "13px" }}>
                        Tip: Use single keys (n, p, space) for gaming, or add modifiers (ctrl+n) to avoid conflicts.
                    </p>
                    <div style={{ display: "grid", gap: "8px" }}>
                        {[
                            { label: "⏭ Skip/Next", setting: "skipKey", default: "n" },
                            { label: "⏮ Previous", setting: "prevKey", default: "p" },
                            { label: "⏯ Play/Pause", setting: "playPauseKey", default: "space" },
                            { label: "⏹ Stop", setting: "stopKey", default: "s" },
                            { label: "🔊 Volume Up", setting: "volUpKey", default: "=" },
                            { label: "🔉 Volume Down", setting: "volDownKey", default: "-" },
                            { label: "🔁 Loop", setting: "loopKey", default: "l" },
                            { label: "🔀 Shuffle", setting: "shuffleKey", default: "r" }
                        ].map(({ label, setting, default: def }) => (
                            <div key={setting} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <label style={{ width: "140px", fontSize: "14px" }}>{label}</label>
                                <input
                                    type="text"
                                    value={settings.store[setting] || def}
                                    onChange={(e) => settings.store[setting] = e.target.value}
                                    placeholder={def}
                                    style={{
                                        padding: "6px 10px",
                                        borderRadius: "4px",
                                        border: "1px solid var(--background-modifier-accent)",
                                        background: "var(--background-secondary)",
                                        color: "var(--text-normal)",
                                        flex: 1,
                                        fontSize: "13px"
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
    },
    skipKey: { type: OptionType.STRING, description: "", default: "n", hidden: true },
    prevKey: { type: OptionType.STRING, description: "", default: "p", hidden: true },
    playPauseKey: { type: OptionType.STRING, description: "", default: "space", hidden: true },
    stopKey: { type: OptionType.STRING, description: "", default: "s", hidden: true },
    volUpKey: { type: OptionType.STRING, description: "", default: "=", hidden: true },
    volDownKey: { type: OptionType.STRING, description: "", default: "-", hidden: true },
    loopKey: { type: OptionType.STRING, description: "", default: "l", hidden: true },
    shuffleKey: { type: OptionType.STRING, description: "", default: "r", hidden: true }
});

export default definePlugin({
    name: "MusicBotKeyboard",
    description: "Control music bot buttons with keyboard shortcuts",
    authors: [Devs.LSDZaddi],
    settings,

    keydownHandler: null as any,
    sessionId: null as string | null,

    start() {
        this.setupKeyboardListener();
        this.getSessionId();
    },

    stop() {
        if (this.keydownHandler) {
            document.removeEventListener("keydown", this.keydownHandler, true);
        }
    },

    getSessionId() {
        // Try to get session ID from various sources
        try {
            // Method 1: From GLOBAL_ENV
            if (window.GLOBAL_ENV?.SESSION_ID) {
                this.sessionId = window.GLOBAL_ENV.SESSION_ID;
                return;
            }

            // Method 2: From localStorage/sessionStorage
            const stored = localStorage.getItem("sessionId") || sessionStorage.getItem("sessionId");
            if (stored) {
                this.sessionId = stored;
                return;
            }

            // Method 3: Generate a stable one based on user ID
            const currentUser = UserStore.getCurrentUser?.();
            if (currentUser?.id) {
                this.sessionId = `keyboard_${currentUser.id}_${Date.now()}`;
                return;
            }

            // Fallback: Random session
            this.sessionId = `keyboard_session_${Math.random().toString(36).substr(2, 9)}`;
        } catch (e) {
            this.sessionId = "keyboard_session_default";
        }

        if (settings.store.debugMode) {
            console.log("[MusicBotKeyboard] Session ID:", this.sessionId);
        }
    },

    setupKeyboardListener() {
        this.keydownHandler = (e: KeyboardEvent) => {
            if (!settings.store.enabled) return;

            // Don't trigger if typing
            const target = e.target as HTMLElement;
            if (target?.tagName === "INPUT" ||
                target?.tagName === "TEXTAREA" ||
                target?.contentEditable === "true" ||
                target?.getAttribute("role") === "textbox") {
                return;
            }

            // Build key combination
            const keys = [];
            if (e.ctrlKey) keys.push("ctrl");
            if (e.shiftKey) keys.push("shift");
            if (e.altKey) keys.push("alt");
            if (e.metaKey) keys.push("meta");

            let key = e.key.toLowerCase();
            if (key === " ") key = "space";
            if (key === "arrowleft") key = "left";
            if (key === "arrowright") key = "right";
            if (key === "arrowup") key = "up";
            if (key === "arrowdown") key = "down";

            keys.push(key);
            const keyCombo = keys.join("+");

            // Map of actions to their configurations
            const actions = {
                skip: {
                    key: settings.store.skipKey,
                    labels: ["skip", "next", "⏭", "⏩", "forward", ">>"],
                    emoji: "⏭"
                },
                prev: {
                    key: settings.store.prevKey,
                    labels: ["prev", "previous", "⏮", "⏪", "back", "<<"],
                    emoji: "⏮"
                },
                playPause: {
                    key: settings.store.playPauseKey,
                    labels: ["play", "pause", "⏯", "▶", "⏸", "resume"],
                    emoji: "⏯"
                },
                stop: {
                    key: settings.store.stopKey,
                    labels: ["stop", "⏹", "halt", "end"],
                    emoji: "⏹"
                },
                volUp: {
                    key: settings.store.volUpKey,
                    labels: ["vol+", "volume up", "🔊", "louder", "+"],
                    emoji: "🔊"
                },
                volDown: {
                    key: settings.store.volDownKey,
                    labels: ["vol-", "volume down", "🔉", "quieter", "-"],
                    emoji: "🔉"
                },
                loop: {
                    key: settings.store.loopKey,
                    labels: ["loop", "repeat", "🔁", "🔂"],
                    emoji: "🔁"
                },
                shuffle: {
                    key: settings.store.shuffleKey,
                    labels: ["shuffle", "random", "🔀", "mix"],
                    emoji: "🔀"
                }
            };

            // Check if keypress matches any action
            for (const [actionName, config] of Object.entries(actions)) {
                if (config.key && keyCombo === config.key.toLowerCase()) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.performAction(actionName, config);
                    return;
                }
            }
        };

        document.addEventListener("keydown", this.keydownHandler, true);
    },

    performAction(actionName: string, config: any) {
        const channelId = SelectedChannelStore.getChannelId();
        const guildId = SelectedGuildStore.getGuildId();

        if (!channelId) {
            if (settings.store.debugMode) {
                console.log("[MusicBotKeyboard] No channel selected");
            }
            return;
        }

        if (settings.store.debugMode) {
            console.log(`[MusicBotKeyboard] Performing action: ${actionName}`);
            console.log("Channel:", channelId, "Guild:", guildId);
        }

        // Find button in bot messages
        const buttonData = this.findBotButton(channelId, config.labels);

        if (buttonData) {
            if (this.tryDOMClick(config.labels)) {
                if (settings.store.showNotifications) {
                    showToast(`${config.emoji} ${actionName} (DOM)`, Toasts.Type.SUCCESS);
                }
            } else {
                if (settings.store.debugMode) {
                    console.log(`[MusicBotKeyboard] No button found for: ${actionName}`);
                }
                if (settings.store.showNotifications) {
                    showToast(`No ${actionName} button found`, Toasts.Type.FAILURE);
                }
            }
        }
    },

    findBotButton(channelId: string, labels: string[]) {
        try {
            const messages = MessageStore.getMessages(channelId);
            if (!messages) return null;

            // Check recent messages (last 20)
            const recentMessages = messages._array.slice(-20);

            for (const message of recentMessages.reverse()) {
                // Skip if not a bot message (when filter enabled)
                if (settings.store.onlyBotMessages && !message.author.bot) continue;

                // Skip if targeting specific bot and doesn't match
                if (settings.store.targetBotId && message.author.id !== settings.store.targetBotId) continue;

                // Check for components
                if (!message.components?.length) continue;

                if (settings.store.debugMode) {
                    console.log(`[MusicBotKeyboard] Checking message from ${message.author.username} (${message.author.id})`);
                }

                // Search through component rows
                for (const row of message.components) {
                    if (!row.components) continue;

                    for (const component of row.components) {
                        // Only process buttons (type 2)
                        if (component.type !== 2) continue;

                        const buttonLabel = (component.label || "").toLowerCase();
                        const emojiName = (component.emoji?.name || "").toLowerCase();

                        // Check if button matches any target label
                        for (const label of labels) {
                            const searchLabel = label.toLowerCase();

                            if (buttonLabel.includes(searchLabel) ||
                                emojiName.includes(searchLabel) ||
                                searchLabel === emojiName ||
                                label === component.emoji?.name) { // Check exact emoji match

                                if (settings.store.debugMode) {
                                    console.log(`[MusicBotKeyboard] Found button: "${component.label || component.emoji?.name}"`);
                                    console.log("Custom ID should be (pylav__pylavcontroller_persistent_view:skip_button:10):", component.custom_id);
                                    console.log("Message ID:", message.id);
                                }

                                return {
                                    message_id: message.id,
                                    channel_id: channelId,
                                    application_id: message.interaction?.application_id || message.author.id,
                                    custom_id: "pylav__pylavcontroller_persistent_view:skip_button:10",
                                    component_type: 2
                                };
                            }
                        }
                    }
                }
            }

            return null;
        } catch (e) {
            console.error("[MusicBotKeyboard] Error finding button:", e);
            return null;
        }
    },

    sendInteraction(buttonData: any, guildId: string | null) {
        try {
            // Construct interaction payload matching Discord's format
            const payload = {
                type: 3, // MESSAGE_COMPONENT interaction
                nonce: Date.now().toString(),
                guild_id: guildId,
                channel_id: buttonData.channel_id,
                message_flags: 0,
                message_id: buttonData.message_id,
                application_id: buttonData.application_id,
                session_id: this.sessionId,
                data: {
                    component_type: buttonData.component_type,
                    custom_id: "pylav__pylavcontroller_persistent_view:skip_button:10",
                }
            };

            if (settings.store.debugMode) {
                console.log("[MusicBotKeyboard] Sending interaction:", payload);
            }

            // Try to send via Discord's API
            this.dispatchInteraction(payload);
            console.log("[MusicBotKeyboard] Sent via FLUX")
        } catch (e) {
            console.error("[MusicBotKeyboard] Error sending interaction:", e);
        }
    },

    dispatchInteraction(payload: any) {
        try {
            FluxDispatcher.dispatch({
                type: "INTERACTION_CREATE",
                interaction: payload
            });

            if (settings.store.debugMode) {
                console.log("[MusicBotKeyboard] Dispatched via FluxDispatcher");
            }
        } catch (e) {
            console.error("[MusicBotKeyboard] Dispatch error:", e);
        }
    },

    tryDOMClick(labels: string[]): boolean {
        try {
            // Only look for buttons within message accessories containers
            const messageContainers = document.querySelectorAll('[id^="message-accessories-"]');

            if (settings.store.debugMode) {
                console.log(`[MusicBotKeyboard] Found ${messageContainers.length} message containers`);
            }

            // Search from newest to oldest
            for (let i = messageContainers.length - 1; i >= 0; i--) {
                const container = messageContainers[i];
                const buttons = container.querySelectorAll('[role="button"]');

                for (const button of buttons) {
                    const buttonText = button.textContent?.toLowerCase() || "";
                    const ariaLabel = button.getAttribute("aria-label")?.toLowerCase() || "";

                    // Check for emoji in img alt
                    const emojiImg = button.querySelector('img[alt]');
                    const emojiAlt = emojiImg?.getAttribute('alt')?.toLowerCase() || "";

                    for (const label of labels) {
                        const searchLabel = label.toLowerCase();

                        if (buttonText.includes(searchLabel) ||
                            ariaLabel.includes(searchLabel) ||
                            emojiAlt.includes(searchLabel)) {

                            if (settings.store.debugMode) {
                                console.log(`[MusicBotKeyboard] DOM clicking button: "${buttonText || emojiAlt}"`);
                            }

                            (button as HTMLElement).click();
                            return true;
                        }
                    }
                }
            }

            return false;
        } catch (e) {
            console.error("[MusicBotKeyboard] DOM click error:", e);
            return false;
        }
    }
});
