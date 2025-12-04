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

import { Button } from "@components/Button";
import { Channel } from "@vencord/discord-types";
import { sendBotMessage } from "@api/Commands";
import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { BaseText } from "@components/BaseText";
import { Card } from "@components/Card";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import { openSettingsTabModal, UpdaterTab } from "@components/settings";
import { gitHash } from "@shared/vencordUserAgent";
import { CONTRIB_ROLE_ID, Devs, DONOR_ROLE_ID, KNOWN_ISSUES_CHANNEL_ID, REGULAR_ROLE_ID, SUPPORT_CATEGORY_ID, SUPPORT_CHANNEL_ID, VENBOT_USER_ID, VENCORD_GUILD_ID } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { isPluginDev, tryOrElse } from "@utils/misc";
import { relaunch } from "@utils/native";
import { onlyOnce } from "@utils/onlyOnce";
import { makeCodeblock } from "@utils/text";
import definePlugin from "@utils/types";
import { checkForUpdates, isOutdated, update } from "@utils/updater";
import { Alerts, ChannelStore, GuildMemberStore, Parser, PermissionsBits, PermissionStore, RelationshipStore, SelectedChannelStore, showToast, Toasts, UserStore } from "@webpack/common";
import { JSX } from "react";

import plugins, { PluginMeta } from "~plugins";

import SettingsPlugin from "./settings";

const CodeBlockRe = /```snippet\n(.+?)```/s;

const AdditionalAllowedChannelIds = [
    "1024286218801926184", // Vencord > #bot-spam
];

const TrustedRolesIds = [
    CONTRIB_ROLE_ID, // contributor
    REGULAR_ROLE_ID, // regular
    DONOR_ROLE_ID, // donor
];

const AsyncFunction = async function () { }.constructor;

const ShowCurrentGame = getUserSettingLazy<boolean>("status", "showCurrentGame")!;
const ShowEmbeds = getUserSettingLazy<boolean>("textAndImages", "renderEmbeds")!;

const isSupportAllowedChannel = (channel: Channel) => channel.parent_id === SUPPORT_CATEGORY_ID || AdditionalAllowedChannelIds.includes(channel.id);

async function forceUpdate() {
    const outdated = await checkForUpdates();
    if (outdated) {
        await update();
        relaunch();
    }

    return outdated;
}

function getWindowsName(release: string) {
    const build = parseInt(release.split(".")[2]);
    if (build >= 22000) return "Windows 11";
    if (build >= 10240) return "Windows 10";
    if (build >= 9200) return "Windows 8.1";
    if (build >= 7600) return "Windows 7";
    return `Windows (${release})`;
}

function getMacOSName(release: string) {
    const major = parseInt(release.split(".")[0]);
    if (major === 24) return "MacOS 15 (Sequoia)";
    if (major === 23) return "MacOS 14 (Sonoma)";
    if (major === 22) return "MacOS 13 (Ventura)";
    if (major === 21) return "MacOS 12 (Monterey)";
    if (major === 20) return "MacOS 11 (Big Sur)";
    if (major === 19) return "MacOS 10.15 (Catalina)";
    return `MacOS (${release})`;
}

function platformName() {
    if (typeof DiscordNative === "undefined") return navigator.platform;
    if (DiscordNative.process.platform === "win32") return `${getWindowsName(DiscordNative.os.release)}`;
    if (DiscordNative.process.platform === "darwin") return `${getMacOSName(DiscordNative.os.release)} (${DiscordNative.process.arch === "arm64" ? "Apple Silicon" : "Intel Silicon"})`;
    if (DiscordNative.process.platform === "linux") return `Linux (${DiscordNative.os.release})`;
    return DiscordNative.process.platform;
}

async function generateDebugInfoMessage() {
    const { RELEASE_CHANNEL } = window.GLOBAL_ENV;

    const client = (() => {
        if (IS_DISCORD_DESKTOP) return `Discord Desktop v${DiscordNative.app.getVersion()}`;
        if (IS_VESKTOP) return `Vesktop v${VesktopNative.app.getVersion()}`;
        if ("legcord" in window) return `Legcord v${window.legcord.version}`;

        // @ts-expect-error
        const name = typeof unsafeWindow !== "undefined" ? "UserScript" : "Web";
        return `${name} (${navigator.userAgent})`;
    })();

    const info = {
        Vencord:
            `v${VERSION} • [${gitHash}](<https://github.com/mordertehmod/VencordPlusPlus/commit/${gitHash}>)` +
            `${SettingsPlugin.additionalInfo} - ${Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(BUILD_TIMESTAMP)}`,
        Client: `${RELEASE_CHANNEL} ~ ${client}`,
        Platform: platformName()
    };

    if (IS_DISCORD_DESKTOP) {
        info["Last Crash Reason"] = (await tryOrElse(() => DiscordNative.processUtils.getLastCrash(), undefined))?.rendererCrashReason ?? "N/A";
    }

    const potentiallyProblematicPlugins = ([
        "NoRPC", "NoProfileThemes", "NoMosaic", "NoRoleHeaders", "NoSystemBadge",
        "AlwaysAnimate", "ClientTheme", "SoundTroll", "Ingtoninator", "NeverPausePreviews",
    ].filter(Vencord.Plugins.isPluginEnabled) ?? []).sort();

    if (Vencord.Plugins.isPluginEnabled("CustomIdle") && Vencord.Settings.plugins.CustomIdle.idleTimeout === 0) {
        potentiallyProblematicPlugins.push("CustomIdle");
    }

    const commonIssues = {
        "Activity Sharing Disabled": tryOrElse(() => !ShowCurrentGame.getSetting(), false),
        "Link Embeds Disabled": tryOrElse(() => !ShowEmbeds.getSetting(), false),
        "Vencord DevBuild": IS_VESKTOP && tryOrElse(() => VesktopNative.app.isDevBuild?.(), false),
        "Has UserPlugins": Object.values(PluginMeta).some(m => m.userPlugin),
        ">2 Weeks Outdated": BUILD_TIMESTAMP < Date.now() - 12096e5,
        [`Potentially Problematic Plugins: ${potentiallyProblematicPlugins.join(", ")}`]: potentiallyProblematicPlugins.length
    };

    let content = `>>> ${Object.entries(info).map(([k, v]) => `**${k}**: ${v}`).join("\n")}`;
    content += "\n" + Object.entries(commonIssues)
        .filter(([, v]) => v).map(([k]) => `⚠️ ${k}`)
        .join("\n");

    return content.trim();
}

function generatePluginList() {
    const isApiPlugin = (plugin: string) => plugin.endsWith("API") || plugins[plugin].required;

    const enabledPlugins = Object.keys(plugins)
        .filter(p => isPluginEnabled(p) && !isApiPlugin(p));

    const enabledStockPlugins = enabledPlugins.filter(p => !PluginMeta[p].userPlugin);
    const enabledUserPlugins = enabledPlugins.filter(p => PluginMeta[p].userPlugin);


    let content = `**Enabled Plugins (${enabledStockPlugins.length}):**\n${makeCodeblock(enabledStockPlugins.join(", "))}`;

    if (enabledUserPlugins.length) {
        content += `**Enabled UserPlugins (${enabledUserPlugins.length}):**\n${makeCodeblock(enabledUserPlugins.join(", "))}`;
    }

    const user = UserStore.getCurrentUser();

    if (enabledPlugins.length > 100 && !isPluginDev(user.id)) {
        Alerts.show({
            title: "You are attempting to get support!",
            body: <div>
                <style>
                    {'[class*="backdrop_"][style*="backdrop-filter"]{backdrop-filter:blur(16px) brightness(0.25) !important;}'}
                </style>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
                    <img src="https://media.tenor.com/QtGqjwBpRzwAAAAi/wumpus-dancing.gif" />
                </div>
                <Paragraph>Before you ask for help,</Paragraph>
                <Paragraph>We do not handle support for users who use 100+ plugins</Paragraph>
                <Paragraph>issue could be plugin confliction</Paragraph>
                <Paragraph>try removing some plugins and see if it fixes!</Paragraph>
            </div>
        });

        return `${user.username} has more than 100 plugins enabled, please reduce the number of enabled plugins to get support.`;
    }

    return content;
}

const checkForUpdatesOnce = onlyOnce(checkForUpdates);

const settings = definePluginSettings({}).withPrivateSettings<{
    dismissedDevBuildWarning?: boolean;
}>();

export default definePlugin({
    name: "SupportHelper",
    required: true,
    description: "Helps us provide support to you",
    authors: [Devs.Ven],
    dependencies: ["UserSettingsAPI"],

    settings,

    patches: [{
        find: "#{intl::BEGINNING_DM}",
        replacement: {
            match: /#{intl::BEGINNING_DM},{.+?}\),(?=.{0,300}(\i)\.isMultiUserDM)/,
            replace: "$& $self.renderContributorDmWarningCard({ channel: $1 }),"
        }
    }],

    commands: [
        {
            name: "vencord-debug",
            description: "Send Vencord debug info",
            // @ts-ignore
            predicate: ctx => isPluginDev(UserStore.getCurrentUser()?.id) || isSupportAllowedChannel(ctx.channel),
            execute: async () => ({ content: await generateDebugInfoMessage() })
        },
        {
            name: "vencord-plugins",
            description: "Send Vencord plugin list",
            // @ts-ignore
            predicate: ctx => isPluginDev(UserStore.getCurrentUser()?.id) || isSupportAllowedChannel(ctx.channel),
            execute: () => {
                const pluginList = generatePluginList();
                return { content: typeof pluginList === "string" ? pluginList : "Unable to generate plugin list." };
            }
        }
    ],

    flux: {
        async CHANNEL_SELECT({ channelId }) {
            const isSupportChannel = channelId === SUPPORT_CHANNEL_ID || ChannelStore.getChannel(channelId)?.parent_id === SUPPORT_CATEGORY_ID;
            if (!isSupportChannel) return;

            const selfId = UserStore.getCurrentUser()?.id;
            if (!selfId || isPluginDev(selfId)) return;

            if (!IS_UPDATER_DISABLED) {
                await checkForUpdatesOnce().catch(() => { });

                if (isOutdated) {
                    return Alerts.show({
                        title: "Hold on!",
                        body: <div>
                            <Paragraph>You are using an outdated version of Vencord! Chances are, your issue is already fixed.</Paragraph>
                            <Paragraph className={Margins.top8}>
                                Please first update before asking for support!
                            </Paragraph>
                        </div>,
                        onCancel: () => openSettingsTabModal(UpdaterTab!),
                        cancelText: "View Updates",
                        confirmText: "Update & Restart Now",
                        onConfirm: forceUpdate,
                        secondaryConfirmText: "I know what I'm doing or I can't update"
                    });
                }
            }

            const roles = GuildMemberStore.getSelfMember(VENCORD_GUILD_ID)?.roles;
            if (!roles || TrustedRolesIds.some(id => roles.includes(id))) return;

            if (!IS_WEB && IS_UPDATER_DISABLED) {
                return Alerts.show({
                    title: "Hold on!",
                    body: <div>
                        <Paragraph>You are using an externally updated Vencord version, which we do not provide support for!</Paragraph>
                        <Paragraph className={Margins.top8}>
                            Please either switch to an <Link href="https://vencord.dev/download">officially supported version of Vencord</Link>, or
                            contact your package maintainer for support instead.
                        </Paragraph>
                    </div>
                });
            }

            if (!IS_STANDALONE && !settings.store.dismissedDevBuildWarning) {
                return Alerts.show({
                    title: "Hold on!",
                    body: <div>
                        <Paragraph>You are using a custom build of Vencord, which we do not provide support for!</Paragraph>

                        <Paragraph className={Margins.top8}>
                            We only provide support for <Link href="https://vencord.dev/download">official builds</Link>.
                            Either <Link href="https://vencord.dev/download">switch to an official build</Link> or figure your issue out yourself.
                        </Paragraph>

                        <BaseText size="md" weight="bold" className={Margins.top8}>You will be banned from receiving support if you ignore this rule.</BaseText>
                    </div>,
                    confirmText: "Understood",
                    secondaryConfirmText: "Don't show again",
                    onConfirmSecondary: () => settings.store.dismissedDevBuildWarning = true
                });
            }
        }
    },

    renderMessageAccessory(props) {
        const buttons = [] as JSX.Element[];

        const shouldAddUpdateButton =
            !IS_UPDATER_DISABLED
            && (
                (props.channel.id === KNOWN_ISSUES_CHANNEL_ID) ||
                (props.channel.parent_id === SUPPORT_CATEGORY_ID && props.message.author.id === VENBOT_USER_ID)
            )
            && props.message.content?.includes("update");

        if (shouldAddUpdateButton) {
            buttons.push(
                <Button
                    key="vc-update"
                    variant="positive"
                    onClick={async () => {
                        try {
                            if (await forceUpdate())
                                showToast("Success! Restarting...", Toasts.Type.SUCCESS);
                            else
                                showToast("Already up to date!", Toasts.Type.MESSAGE);
                        } catch (e) {
                            new Logger(this.name).error("Error while updating:", e);
                            showToast("Failed to update :(", Toasts.Type.FAILURE);
                        }
                    }}
                >
                    Update Now
                </Button>
            );
        }

        if (props.channel.parent_id === SUPPORT_CATEGORY_ID && PermissionStore.can(PermissionsBits.SEND_MESSAGES, props.channel)) {
            if (props.message.content.includes("/vencord-debug") || props.message.content.includes("/vencord-plugins")) {
                buttons.push(
                    <Button
                        key="vc-dbg"
                        variant="primary"
                        onClick={async () => sendMessage(props.channel.id, { content: await generateDebugInfoMessage() })}
                    >
                        Run /vencord-debug
                    </Button>,
                    <Button
                        key="vc-plg-list"
                        variant="primary"
                        onClick={async () => {
                            const pluginList = generatePluginList();
                            if (typeof pluginList === "string") {
                                sendMessage(props.channel.id, { content: pluginList });
                            }
                        }}
                    >
                        Run /vencord-plugins
                    </Button>
                );
            }

            if (props.message.author.id === VENBOT_USER_ID) {
                const match = CodeBlockRe.exec(props.message.content || props.message.embeds[0]?.rawDescription || "");
                if (match) {
                    buttons.push(
                        <Button
                            key="vc-run-snippet"
                            onClick={async () => {
                                try {
                                    const result = await AsyncFunction(match[1])();
                                    const stringed = String(result);
                                    if (stringed) {
                                        await sendBotMessage(SelectedChannelStore.getChannelId(), {
                                            content: stringed
                                        });
                                    }

                                    showToast("Success!", Toasts.Type.SUCCESS);
                                } catch (e) {
                                    new Logger(this.name).error("Error while running snippet:", e);
                                    showToast("Failed to run snippet :(", Toasts.Type.FAILURE);
                                }
                            }}
                        >
                            Run Snippet
                        </Button>
                    );
                }
            }
        }

        return buttons.length
            ? <Flex>{buttons}</Flex>
            : null;
    },

    renderContributorDmWarningCard: ErrorBoundary.wrap(({ channel }) => {
        const userId = channel.getRecipientId();
        if (!isPluginDev(userId)) return null;
        if (RelationshipStore.isFriend(userId) || isPluginDev(UserStore.getCurrentUser()?.id)) return null;

        return (
            <Card variant="warning" className={Margins.top8} defaultPadding>
                Please do not private message Vencord plugin developers for support!
                <br />
                Instead, use the Vencord support channel: {Parser.parse("https://discord.com/channels/1015060230222131221/1026515880080842772")}
                {!ChannelStore.getChannel(SUPPORT_CHANNEL_ID) && " (Click the link to join)"}
            </Card>
        );
    }, { noop: true }),
});
