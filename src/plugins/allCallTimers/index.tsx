/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import roleColorEverywhere from "@plugins/roleColorEverywhere";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { PassiveUpdateState, VoiceState } from "@vencord/discord-types";
import { FluxDispatcher, GuildStore, UserStore } from "@webpack/common";

import { Timer } from "./Timer";

const fixCss = `
    .voiceUser__07f91 .container__394db .chipletParent__394db {
        top: -5px;
    }

    .voiceUser__07f91 .content__07f91 {
        padding: 0px var(--space-xs);
    }
`;

export const settings = definePluginSettings({
    showWithoutHover: {
        type: OptionType.BOOLEAN,
        description: "Always show the timer without needing to hover",
        restartNeeded: true,
        default: true
    },
    showRoleColor: {
        type: OptionType.BOOLEAN,
        description: "Show the user's role color (if this plugin in enabled)",
        restartNeeded: false,
        default: true
    },
    trackSelf: {
        type: OptionType.BOOLEAN,
        description: "Also track yourself",
        restartNeeded: false,
        default: true
    },
    showSeconds: {
        type: OptionType.BOOLEAN,
        description: "Show seconds in the timer",
        restartNeeded: false,
        default: true
    },
    format: {
        type: OptionType.SELECT,
        description: "Compact or human readable format:",
        options: [
            {
                label: "30:23:00:42",
                value: "stopwatch",
                default: true
            },
            {
                label: "30d 23h 00m 42s",
                value: "human"
            }
        ]
    },
    watchLargeGuilds: {
        type: OptionType.BOOLEAN,
        description: "Track users in large guilds. This may cause lag if you're in a lot of large guilds with active voice users. Tested with up to 2000 active voice users with no issues.",
        restartNeeded: true,
        default: false
    },
    fixUI: {
        type: OptionType.BOOLEAN,
        description: "Fix UI issues",
        restartNeeded: true,
        default: true
    }
});


// Save the join time of all users in a Map
type userJoinData = { channelId: string, time: number; guildId: string; };
const userJoinTimes = new Map<string, userJoinData>();

/**
 * The function `addUserJoinTime` stores the join time of a user in a specific channel within a guild.
 * @param {string} userId - The `userId` parameter is a string that represents the unique identifier of
 * the user who is joining a channel in a guild.
 * @param {string} channelId - The `channelId` parameter represents the unique identifier of the
 * channel where the user joined.
 * @param {string} guildId - The `guildId` parameter in the `addUserJoinTime` function represents the
 * unique identifier of the guild (server) to which the user belongs. It is used to associate the
 * user's join time with a specific guild within the application or platform.
 */
function addUserJoinTime(userId: string, channelId: string, guildId: string) { userJoinTimes.set(userId, { channelId, time: Date.now(), guildId }); }

/**
 * The function `removeUserJoinTime` removes the join time of a user identified by their user ID.
 * @param {string} userId - The `userId` parameter is a string that represents the unique identifier of
 * a user whose join time needs to be removed.
 */
function removeUserJoinTime(userId: string) { userJoinTimes.delete(userId); }

// For every user, channelId and oldChannelId will differ when moving channel.
// Only for the local user, channelId and oldChannelId will be the same when moving channel,
// for some ungodly reason
let myLastChannelId: string | undefined;

// Allow user updates on discord first load
let runOneTime = true;

function injectCSS() {
    if (document.getElementById("allCallTimers-css")) return;
    const style = document.createElement("style");
    style.id = "allCallTimers-css";
    style.textContent = fixCss;
    document.head.appendChild(style);
}

function removeCss() {
    const style = document.getElementById("allCallTimers-css");
    if (style) {
        style.remove();
    }
}

export default definePlugin({
    name: "AllCallTimers",
    description: "Add call timer to all users in a server voice channel.",
    authors: [Devs.D3SOX, Devs.LSDZaddi],
    settings,
    isModified: true,
    patches: [
        {
            find: "VOICE_PANEL}}",
            replacement: [
                {
                    match: /user:(\i).*?\.EMBEDDED.{0,25};(?=return 0!==(\i)\.length)/,
                    replace: "$&$2.push($self.renderTimer($1.id));",
                    predicate: () => !settings.store.showWithoutHover,
                },
                {
                    match: /#{intl::GUEST_NAME_SUFFIX}\)\]\}\):""(?=.*?userId:(\i\.\i))/,
                    replace: "$&,$self.renderTimer($1)",
                    predicate: () => settings.store.showWithoutHover,
                }
            ]
        },
    ],

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            const myId = UserStore.getCurrentUser().id;

            for (const state of voiceStates) {
                const { userId, channelId, guildId } = state;
                const isMe = userId === myId;

                if (!guildId) continue;

                // check if the state doesn't actually have a `oldChannelId` property
                if (!("oldChannelId" in state) && !runOneTime && !settings.store.watchLargeGuilds) continue;

                let { oldChannelId } = state;
                if (isMe && channelId !== myLastChannelId) {
                    oldChannelId = myLastChannelId;
                    myLastChannelId = channelId ?? undefined;
                }

                if (channelId !== oldChannelId) {
                    if (channelId) addUserJoinTime(userId, channelId, guildId);
                    else if (oldChannelId) removeUserJoinTime(userId);
                }
            }
            runOneTime = false;
        },
        PASSIVE_UPDATE_V1(passiveUpdate: PassiveUpdateState) {
            const { voiceStates } = passiveUpdate;
            const { guildId } = passiveUpdate;

            if (settings.store.watchLargeGuilds) return;

            if (!voiceStates) return;

            // check the guildId in the userJoinTimes map
            for (const [userId, data] of userJoinTimes) {
                if (data.guildId === guildId) {
                    // check if the user is in the voiceStates
                    const userInVoiceStates = voiceStates.find(state => state.userId === userId);

                    if (!userInVoiceStates) removeUserJoinTime(userId);
                }
            }

            for (const state of voiceStates) {
                const { userId, channelId } = state;

                if (!channelId) continue;

                // check if the user is in the map
                if (userJoinTimes.has(userId)) {
                    // check if the user is in a channel and update joinTime
                    if (channelId !== userJoinTimes.get(userId)?.channelId) addUserJoinTime(userId, channelId, guildId);
                } else addUserJoinTime(userId, channelId, guildId);
            }
        },
    },

    subscribeToAllGuilds() {
        const guilds = Object.values(GuildStore.getGuilds()).map(guild => guild.id);
        const subscriptions = guilds.reduce((acc, id) => ({ ...acc, [id]: { typing: true } }), {});
        FluxDispatcher.dispatch({ type: "GUILD_SUBSCRIPTIONS_FLUSH", subscriptions });
    },

    start() {
        if (settings.store.watchLargeGuilds) {
            this.subscribeToAllGuilds();
        }
        if (settings.store.fixUI) {
            injectCSS();
        }
    },

    stop() {
        if (settings.store.fixUI) {
            removeCss();
        }
    },

    renderTimer(userId: string) {
        const joinTime = userJoinTimes.get(userId);

        if (!joinTime?.time) return;

        if (userId === UserStore.getCurrentUser().id && !settings.store.trackSelf) return;

        const colorStyle = settings.store.showRoleColor ? roleColorEverywhere.getColorStyle(userId, joinTime.guildId) : {};
        const colorClass = settings.store.showRoleColor ? roleColorEverywhere.getColorClass(userId, joinTime.guildId) : "";

        return (
            <ErrorBoundary>
                <Timer time={joinTime.time} defaultColorClassName={colorClass} defaultStyle={colorStyle} />
            </ErrorBoundary>
        );
    },
});
