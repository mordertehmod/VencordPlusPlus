/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { type ButtonLocation,fakeDeafenButton } from ".";

export const settings = definePluginSettings({
    buttonLocation: {
        type: OptionType.SELECT,
        description: "Where to show the Fake Deafen button",
        options: [
            { label: "Above your avatar", value: "settingsPanel", default: true },
            { label: "Beside your avatar", value: "voicePanel", default: false },
            { label: "Both", value: "both", default: false },
        ],
        onChange: (value: ButtonLocation) => fakeDeafenButton(value)
    },
    muteUponFakeDeafen: {
        type: OptionType.BOOLEAN,
        description: "Also mute when enabling fake deafen",
        default: false
    },
    mute: {
        type: OptionType.BOOLEAN,
        description: "Send muted state as true when fake deafened",
        default: true
    },
    deafen: {
        type: OptionType.BOOLEAN,
        description: "Send deafened state as true when fake deafened",
        default: true
    },
    cam: {
        type: OptionType.BOOLEAN,
        description: "Send video state as false when fake deafened",
        default: false
    },
    debug: {
        type: OptionType.BOOLEAN,
        description: "Enable debug logging for Fake Deafen",
        default: false,
    },
    copyErrorToClipboard: {
        type: OptionType.BOOLEAN,
        description: "Copy error to clipboard on error. This can be helpful for reporting issues in the VencordPlusPlus server, but may be annoying if you get a lot of errors that you don't care about, so it's off by default",
        default: false,
    }
});
