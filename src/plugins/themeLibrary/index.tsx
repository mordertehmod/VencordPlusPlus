/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ColorPaletteIcon } from "@components/Icons";
import SettingsPlugin from "@plugins/_core/settings";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { openUserSettingsPanel } from "@webpack/common";

import { settings } from "./utils/settings";

export default definePlugin({
    name: "ThemeLibrary",
    description: "A library of themes for Vencord.",
    authors: [Devs.LSDZaddi],
    settings,
    toolboxActions: {
        "Open Theme Library": () => {
            openUserSettingsPanel("vencord_theme_library");
        },
    },

    start() {
        const { customEntries } = SettingsPlugin;

        customEntries.push({
            key: "vencord_theme_library",
            title: "Theme Library",
            Component: require("./components/ThemeTab").default,
            Icon: ColorPaletteIcon
        });
    },

    stop() {
        const { customEntries } = SettingsPlugin;
        const entry = customEntries.findIndex(entry => entry.key === "vencord_theme_library");
        if (entry !== -1) customEntries.splice(entry, 1);
    },
});
