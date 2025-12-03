/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    icons: {
        type: OptionType.BOOLEAN,
        description: "Always animate server icons, avatars, decor and more",
        default: true,
    },
    statusEmojis: {
        type: OptionType.BOOLEAN,
        description: "Always animate status emojis",
        default: true,
    },
    serverBanners: {
        type: OptionType.BOOLEAN,
        description: "Always animate server banners",
        default: true,
    },
    nameplates: {
        type: OptionType.BOOLEAN,
        description: "Always animate nameplates",
        default: true,
    },
    roleGradients: {
        type: OptionType.SELECT,
        description: "Always animate role gradients",
        options: [
            { label: "Always animate all role gradients", value: "gradientAll"},
            { label: "Always animate role gradients in chat", value: "gradientChat" },
            { label: "Always animate role gradients in member list", value: "gradientMembersList" },
        ],
    }
});

export default definePlugin({
    name: "AlwaysAnimate",
    description: "Animates anything that can be animated",
    authors: [Devs.FieryFlames, Devs.LSDZaddi],
    isModified: true, // Adds gradient role color support
    settings,
    patches: [
        {
            find: "canAnimate:",
            predicate: () => settings.store.icons,
            all: true,
            // Some modules match the find but the replacement is returned untouched
            noWarn: true,
            replacement: {
                match: /canAnimate:.+?([,}].*?\))/g,
                replace: (m, rest) => {
                    const destructuringMatch = rest.match(/}=.+/);
                    if (destructuringMatch == null) return `canAnimate:!0${rest}`;
                    return m;
                }
            }
        },
        {
            // Status emojis
            find: "#{intl::GUILD_OWNER}),children:",
            predicate: () => settings.store.statusEmojis,
            replacement: {
                match: /(\.CUSTOM_STATUS.+?animateEmoji:)\i/,
                replace: "$1!0"
            }
        },
        {
            // Guild Banner
            find: ".animatedBannerHoverLayer,onMouseEnter:",
            predicate: () => settings.store.serverBanners,
            replacement: {
                match: /(\.headerContent.+?guildBanner:\i,animate:)\i/,
                replace: "$1!0"
            }
        },
        {
            // Nameplates
            find: ".MINI_PREVIEW,[",
            predicate: () => settings.store.nameplates,
            replacement: {
                match: /animate:\i,loop:.{0,15}===\i/,
                replace: "animate:true,loop:true"
            },
        },
        {
            // Gradient roles in chat
            find: "=!1,contentOnly:",
            predicate: () => settings.store.roleGradients === "gradientChat",
            replacement: {
                match: /animate:\i/,
                replace: "animate:!0"
            }
        },
        {
            // Gradient roles in member list
            find: '="left",className:',
            predicate: () => settings.store.roleGradients === "gradientMembersList",
            replacement: {
                match: /,animateGradient:[^)]+\)/,
                replace: ",animateGradient:!0"
            }
        },
        {
            // Role Gradients
            find: "animateGradient:",
            predicate: () => settings.store.roleGradients === "gradientAll",
            all: true,
            noWarn: true,
            replacement: {
                match: /animateGradient:.+?([,}].*?\))/g,
                replace: (m, rest) => {
                    const destructuringMatch = rest.match(/}=.+/);
                    if (destructuringMatch == null) return `animateGradient:!0${rest}`;
                    return m;
                }
            }
        },
    ]
});
