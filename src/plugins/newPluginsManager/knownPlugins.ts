/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";

import plugins from "~plugins";

// Testing flag - set to true to skip datastore operations and test different scenarios
const TESTING_MODE = true;
// When testing, set this to control the behavior you want to test
const SIMULATE_FIRST_RUN = true; // true = simulate new user, false = simulate existing user

export const KNOWN_PLUGINS_DATA_KEY = "NewPluginsManager_KnownPlugins";
export const FIRST_RUN_KEY = "NewPluginsManager_FirstRun";

const BASE_VENCORD_PLUGINS = new Set([
    "APIMessageAccessories",
    "APINotices",
    "AnonymiseFileNames",
    "BANger",
    "BetterFolders",
    "BetterGifAltText",
    "BetterNotesBox",
    "BetterRoleContext",
    "BetterUploadButton",
    "BiggerStreamPreview",
    "BlurNSFW",
    "CallTimer",
    "ClearURLs",
    "ClientTheme",
    "ColorSighted",
    "ConsoleShortcuts",
    "CopyUserURLs",
    "CrashHandler",
    "CustomRPC",
    "Dearrow",
    "Decor",
    "EmoteCloner",
    "Experiments",
    "F8Break",
    "FakeNitro",
    "FakeProfileThemes",
    "FavoriteEmojiFirst",
    "FavoriteGifSearch",
    "FixSpotifyEmbeds",
    "FixYoutubeEmbeds",
    "ForceOwnerCrown",
    "FriendInvites",
    "FriendsSince",
    "GameActivityToggle",
    "GifPaste",
    "GreetStickerPicker",
    "HideAttachments",
    "iLoveSpam",
    "IgnoreActivities",
    "ImageZoom",
    "InvisibleChat",
    "KeepCurrentChannel",
    "LastFMRichPresence",
    "LoadingQuotes",
    "MemberCount",
    "MessageClickActions",
    "MessageLinkEmbeds",
    "MessageLogger",
    "MessageTags",
    "MoreCommands",
    "MoreKaomoji",
    "MoreUserTags",
    "Moyai",
    "MuteNewGuild",
    "MutualGroupDMs",
    "NoBlockedMessages",
    "NoDevtoolsWarning",
    "NoF1",
    "NoMosaic",
    "NoPendingCount",
    "NoProfileThemes",
    "NoRPC",
    "NoReplyMention",
    "NoScreensharePreview",
    "NoSystemBadge",
    "NoTypingAnimation",
    "NoUnblockToJump",
    "NormalizeMessageLinks",
    "NotificationVolume",
    "NSFWGateBypass",
    "oneko",
    "OpenInApp",
    "PartySounds",
    "PermissionFreeWill",
    "PermissionsViewer",
    "petpet",
    "PictureInPicture",
    "PinDMs",
    "PlainFolderIcon",
    "PlatformIndicators",
    "PreviewMessage",
    "PronounDB",
    "QuickMention",
    "QuickReply",
    "ReactErrorDecoder",
    "ReadAllNotificationsButton",
    "RelationshipNotifier",
    "ReplaceGoogleSearch",
    "ReplyTimestamp",
    "ResurrectHome",
    "RevealAllSpoilers",
    "ReverseImageSearch",
    "ReviewDB",
    "RoleColorEverywhere",
    "SecretRingTone",
    "SendTimestamps",
    "ServerListIndicators",
    "SessionInfo",
    "Settings",
    "ShikiCodeblocks",
    "ShowAllMessageButtons",
    "ShowConnections",
    "ShowHiddenChannels",
    "ShowMeYourName",
    "ShowTimeoutDuration",
    "SilentMessageToggle",
    "SilentTyping",
    "SortFriendRequests",
    "SpotifyControls",
    "SpotifyCrack",
    "SpotifyShareCommands",
    "StartupTimings",
    "SupportHelper",
    "TextReplace",
    "ThemeAttributes",
    "TimeBarAllActivities",
    "Translate",
    "TypingIndicator",
    "TypingTweaks",
    "Unindent",
    "UnsuppressEmbeds",
    "UrbanDictionary",
    "UserVoiceShow",
    "USRBG",
    "ValidUser",
    "VcNarrator",
    "VencordToolbox",
    "ViewIcons",
    "ViewRaw",
    "VoiceChatDoubleClick",
    "VoiceMessages",
    "VolumeBooster",
    "WhoReacted",
    "Wikisearch",
    "XSOverlay"
]);

export async function isFirstRun(): Promise<boolean> {
    if (TESTING_MODE) {
        console.log("TESTING_MODE: Simulating first run =", SIMULATE_FIRST_RUN);
        return SIMULATE_FIRST_RUN;
    }

    const firstRun = await DataStore.get(FIRST_RUN_KEY);
    return firstRun !== false;
}

export async function setFirstRunComplete(): Promise<void> {
    if (TESTING_MODE) {
        console.log("TESTING_MODE: Skipping setFirstRunComplete");
        return;
    }

    await DataStore.set(FIRST_RUN_KEY, false);
}

export async function getKnownPlugins(): Promise<Set<string>> {
    if (TESTING_MODE) {
        console.log("TESTING_MODE: Using simulated known plugins");
        if (SIMULATE_FIRST_RUN) {
            console.log("TESTING_MODE: Returning base plugins for new user simulation");
            return new Set([...BASE_VENCORD_PLUGINS]);
        } else {
            console.log("TESTING_MODE: Returning all plugins for existing user simulation");
            return new Set(Object.keys(plugins));
        }
    }

    let knownPlugins = await DataStore.get(KNOWN_PLUGINS_DATA_KEY) as string[];
    if (knownPlugins === undefined) {
        if (await isFirstRun()) {
            knownPlugins = [...BASE_VENCORD_PLUGINS];
            await setFirstRunComplete();
        } else {
            knownPlugins = Object.keys(plugins);
        }
        DataStore.set(KNOWN_PLUGINS_DATA_KEY, knownPlugins);
    }
    return new Set(knownPlugins);
}

export async function getNewPlugins(): Promise<Set<string>> {
    const currentPlugins = Object.keys(plugins);
    const knownPlugins = await getKnownPlugins();
    return new Set(currentPlugins.filter(p => !knownPlugins.has(p)));
}

export async function writeKnownPlugins(): Promise<void> {
    if (TESTING_MODE) {
        console.log("TESTING_MODE: Skipping writeKnownPlugins");
        return;
    }

    const currentPlugins = Object.keys(plugins);
    const knownPlugins = await getKnownPlugins();
    DataStore.set(KNOWN_PLUGINS_DATA_KEY, [...new Set([...currentPlugins, ...knownPlugins])]);
}

export function getCustomPlugins(): Set<string> {
    const currentPlugins = Object.keys(plugins);
    return new Set(currentPlugins.filter(p => !BASE_VENCORD_PLUGINS.has(p)));
}

export function getTestingInfo() {
    return {
        testingMode: TESTING_MODE,
        simulateFirstRun: SIMULATE_FIRST_RUN,
        totalPlugins: Object.keys(plugins).length,
        basePlugins: BASE_VENCORD_PLUGINS.size,
        customPlugins: getCustomPlugins().size
    };
}
