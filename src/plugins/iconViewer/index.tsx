/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MagnifyingGlassIcon } from "@components/Icons";
import SettingsPlugin from "@plugins/_core/settings";
import { Devs } from "@utils/constants";
import definePlugin, { StartAt } from "@utils/types";
import { openUserSettingsPanel } from "@webpack/common";

import IconsTab from "./components/IconsTab";
import { SettingsAbout } from "./components/Modals";

export default definePlugin({
    name: "IconViewer",
    description: "Adds a new tab to settings to preview all icons.",
    authors: [Devs.iamme, Devs.LSDZaddi],
    dependencies: ["Settings"],
    startAt: StartAt.WebpackReady,
    toolboxActions: {
        "Open Icons Tab"() {
            openUserSettingsPanel("vencord_icon_viewer");
        },
    },
    settingsAboutComponent: SettingsAbout,
    start() {
        const { customEntries } = SettingsPlugin;

        customEntries.push({
            key: "vencord_icon_viewer",
            title: "Icon Finder",
            Component: IconsTab,
            Icon: MagnifyingGlassIcon
        });
    },
    stop() {
        const { customEntries } = SettingsPlugin;
        const entryIdx = customEntries.findIndex(e => e.key === "vencord_icon_viewer");
        if (entryIdx !== -1) customEntries.splice(entryIdx, 1);
    },
});
