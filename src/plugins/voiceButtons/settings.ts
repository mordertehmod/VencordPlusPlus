/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    // Self
    chatButtonSelf: { type: OptionType.STRING, default: "show", description: "", hidden: true },
    muteButtonSelf: { type: OptionType.STRING, default: "show", description: "", hidden: true },
    deafenButtonSelf: { type: OptionType.STRING, default: "show", description: "", hidden: true },
    fakeDeafenButtonSelf: { type: OptionType.STRING, default: "show", description: "", hidden: true },

    // Others
    chatButtonOthers: { type: OptionType.STRING, default: "show", description: "", hidden: true },
    muteButtonOthers: { type: OptionType.STRING, default: "show", description: "", hidden: true },
    deafenButtonOthers: { type: OptionType.STRING, default: "show", description: "", hidden: true },

    // Behavior
    muteSoundboard: { type: OptionType.BOOLEAN, default: true, description: "", hidden: true },
    disableVideo: { type: OptionType.BOOLEAN, default: true, description: "", hidden: true },
    useServer: { type: OptionType.BOOLEAN, default: false, description: "", hidden: true },
    serverSelf: { type: OptionType.BOOLEAN, default: false, description: "", hidden: true },
    whichNameToShow: { type: OptionType.STRING, default: "both", description: "", hidden: true },
});

export type ButtonVisibility = "show" | "hide" | "disable";
