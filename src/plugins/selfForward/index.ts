/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "SelfForward",
    description: "adds the current channel to the forward list popup",
    authors: [Devs.LSDZaddi],
    patches: [
        {
            find: ".getChannelHistory(),",
            replacement: [{
                match: /\i.id\]/,
                replace: "]"
            }]
        }
    ]
});
