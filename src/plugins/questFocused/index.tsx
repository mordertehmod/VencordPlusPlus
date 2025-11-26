/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "@plugins/_misc/styles.css";

import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "QuestFocused",
    description: "Prevent the quests player from pausing and possibly skip it all together.",
    settingsAboutComponent: () => <>
        <Paragraph className="plugin-warning">
            You might need to spam left mouse button on the video to skip it.
        </Paragraph>
    </>,
    authors: [Devs.LSDZaddi],
    patches: [
        // Block pausing
        {
            find: "[QV] | updatePlayerState | playerState",
            replacement: {
                match: /(?<=case \i\.\i\.PAUSED:.{0,25})\i\.current\.pause\(\),/,
                replace: ""
            }
        },
        {
            find: "[QV] | updatePlayerState | playerState:",
            replacement: {
                match: /(?<=case \i\.\i\.PLAYING:)\i\.current\.paused/,
                replace: "false"
            }
        },
    ],
});
