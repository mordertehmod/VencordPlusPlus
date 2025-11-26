import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export type ShikiSettings = typeof settings.store;
export const settings = definePluginSettings({
    hotkeysEnabled: {
        type: OptionType.BOOLEAN,
        description: "Enable or Disable hotkey feature.",
        default: true
    },
    debugMode: {
        type: OptionType.BOOLEAN,
        description: "Debug logging to console",
        default: true
    },
    notifications: {
        type: OptionType.BOOLEAN,
        description: "Show toasts",
        default: true
    },

    // Target message + button
    guildId: {
        type: OptionType.STRING,
        description: "Guild ID (empty for DMs)",
        default: "",
        placeholder: "Provide the Guild ID for the API calls."
    },
    channelId:{
        type: OptionType.STRING,
        description: "Channel ID",
        default: "",
        placeholder: "Provide the Channel ID for the API calls."
    },
    messageId: {
        type: OptionType.STRING,
        description: "Message ID",
        default: "",
        placeholder: "Provide the Message ID for the API calls."
    },
    applicationId: {
        type: OptionType.STRING,
        description: "Application ID (Bot)",
        default: "",
        placeholder: "Provide the Application ID for the API calls."
    },
    customId: {
        type: OptionType.STRING,
        description: "Button custom_id",
        default: "pylav__pylavcontroller_persistent_view:skip_button:10",
        placeholder: "pylav__…"
    },

    // Testing future implementation
    includeTopLevelDupFields: {
        type: OptionType.BOOLEAN,
        description: "Include top-level custom_id/component_type (mimic client)",
        default: true
    },

    // Overrides for testing
    tokenOverride: {
        type: OptionType.STRING,
        description: "Token override (testing only)",
        default: "",
        placeholder: "xxxxxx" },
    sessionIdOverride: {
        type: OptionType.STRING,
        description: "Session ID override (testing only)",
        default: "",
        placeholder: "f60e… (can be random!)"
    },
    skipSong: {
        type: OptionType.KEYBIND,
        description: "Keybind to skip song",
        global: true
    },

    // Hotkey
    hotkey: {
        type: OptionType.STRING,
        description: "Hotkey (e.g. Ctrl+Alt+S)",
        default: "Ctrl+Alt+S"
    }
});
