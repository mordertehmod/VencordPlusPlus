/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { isPluginEnabled } from "@api/PluginManager";
import { Icon, User } from "@vencord/discord-types";
import { findComponentByCodeLazy, findStoreLazy } from "@webpack";
import { Button, ChannelStore, GuildActions, MediaEngineStore, NavigationRouter, PermissionsBits, PermissionStore, Tooltip, useEffect, UserStore, useState, VoiceActions, VoiceStateStore } from "@webpack/common";
import { JSX } from "react";

import { ButtonVisibility } from "./settings";
import { settings } from "./settings";

const SoundboardStore = findStoreLazy("SoundboardStore");
const DeafenIconSelf = findComponentByCodeLazy("M22.7 2.7a1", "1.4l20-20ZM17") as Icon;
const DeafenIconOther = findComponentByCodeLazy("M21.76.83a5.02", "M12.38") as Icon;
const ChatIcon = findComponentByCodeLazy(".css,d:\"M12 22a10") as Icon;
const MuteIconSelf = findComponentByCodeLazy("d:\"m2.7 22.7 20-20a1", "1.4ZM10.8") as Icon;
const MuteIconOther = findComponentByCodeLazy("M21.76.83a5.02", "M12 2c.33 0") as Icon;

function VoiceUserButton({ user, tooltip, icon, onClick, visibility }: {
    user: User;
    tooltip: string;
    icon: JSX.Element;
    onClick: () => void;
    visibility?: ButtonVisibility;
}) {
    if (visibility === "hide") return null;
    const disabled = visibility === "disable";

    return (
        <div className="voice-user-button-container">
            <Tooltip text={tooltip} shouldShow={!disabled}>
                {({ onMouseEnter, onMouseLeave }) => (
                    <Button
                        size={Button.Sizes.MIN}
                        color={Button.Colors.TRANSPARENT}
                        look={Button.Looks.FILLED}
                        disabled={disabled}
                        onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClick();
                        }}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                    >
                        {icon}
                    </Button>
                )}
            </Tooltip>
        </div>
    );
}

function getUserName(user: User) {
    const username = `@${user.username}`;
    if (settings.store.whichNameToShow === "global") {
        return user.globalName ?? username;
    } else if (settings.store.whichNameToShow === "nickname") {
        return username;
    } else if (settings.store.whichNameToShow === "both" && user.globalName) {
        return `${user.globalName} / ${username}`;
    }
    return username;
}

function canServerMuteDeafen(userId: string) {
    if (!settings.store.useServer) return { canMute: false, canDeafen: false };

    const voiceState = VoiceStateStore.getVoiceStateForUser(userId);
    const channel = voiceState?.channelId ? ChannelStore.getChannel(voiceState.channelId) : null;
    if (!channel?.guild_id) return { canMute: false, canDeafen: false };

    const canMute = PermissionStore.can(PermissionsBits.MUTE_MEMBERS, channel);
    const canDeafen = PermissionStore.can(PermissionsBits.DEAFEN_MEMBERS, channel);

    return { canMute, canDeafen };
}

function getServerMuteDeafenState(userId: string) {
    const voiceState = VoiceStateStore.getVoiceStateForUser(userId);
    if (!voiceState) return { isServerMuted: false, isServerDeafened: false };

    return {
        isServerMuted: voiceState.mute ?? false,
        isServerDeafened: voiceState.deaf ?? false
    };
}

export function UserChatButton({ user, visibility }: { user: User; visibility?: ButtonVisibility }) {
    const isCurrent = user.id === UserStore.getCurrentUser().id;
    return (
        <VoiceUserButton
            user={user}
            visibility={visibility}
            tooltip={isCurrent ? "Navigate to DMs" : `Open DMs with ${getUserName(user)}`}
            icon={<ChatIcon size="sm" />}
            onClick={() => {
                if (isCurrent) {
                    NavigationRouter.transitionTo("/users/@me/");
                    return;
                }
                const chanId = ChannelStore.getDMFromUserId(user.id);
                NavigationRouter.transitionTo(`/channels/@me/${chanId}/`);
            }}
        />
    );
}

export function UserMuteButton({ user, visibility }: { user: User; visibility?: ButtonVisibility;}) {
    const isCurrent = (user.id === UserStore.getCurrentUser().id);
    const { canMute: canServerMute } = canServerMuteDeafen(user.id);
    const { isServerMuted } = getServerMuteDeafenState(user.id);

    const useServerMuteForSelf = isCurrent && settings.store.serverSelf;

    const isLocalMuted = (isCurrent && MediaEngineStore.isSelfMute()) || MediaEngineStore.isLocalMute(user.id);
    const isMuted = canServerMute ? isServerMuted : isLocalMuted;
    const color = isMuted ? "var(--status-danger)" : "var(--channels-default)";

    const muteAction = canServerMute && (useServerMuteForSelf || !isCurrent) ? "Server Mute" : "Mute";
    const tooltipAction = isMuted ? (canServerMute && (useServerMuteForSelf || !isCurrent) ? "Unserver Mute" : "Unmute") : muteAction;

    return (
        <VoiceUserButton
            user={user}
            visibility={visibility}
            tooltip={`${tooltipAction} ${isCurrent ? "yourself" : `${getUserName(user)}`}`}
            icon={isCurrent ? <MuteIconSelf muted={isMuted} size="sm" color={color} /> : <MuteIconOther muted={isMuted} size="sm" color={color} />}
            onClick={() => {
                if (canServerMute) {
                    if (!useServerMuteForSelf) {
                        VoiceActions.toggleSelfMute();
                        return;
                    }

                    const voiceState = VoiceStateStore.getVoiceStateForUser(user.id);
                    const channel = voiceState?.channelId ? ChannelStore.getChannel(voiceState.channelId) : null;
                    if (channel?.guild_id) {
                        GuildActions.setServerMute(channel.guild_id, user.id, !isServerMuted);
                    }
                } else {
                    if (isCurrent) {
                        VoiceActions.toggleSelfMute();
                    } else {
                        VoiceActions.toggleLocalMute(user.id);
                    }
                }
            }}
        />
    );
}

export function UserDeafenButton({ user, visibility }: { user: User; visibility?: ButtonVisibility; }) {
    const isCurrent = (user.id === UserStore.getCurrentUser().id);
    const { canDeafen: canServerDeafen } = canServerMuteDeafen(user.id);
    const { isServerDeafened } = getServerMuteDeafenState(user.id);

    const useServerDeafenForSelf = isCurrent && settings.store.serverSelf;

    const isMuted = MediaEngineStore.isLocalMute(user.id);
    const isSoundboardMuted = SoundboardStore.isLocalSoundboardMuted(user.id);
    const isVideoDisabled = MediaEngineStore.isLocalVideoDisabled(user.id);
    const isLocalDeafened = isCurrent && MediaEngineStore.isSelfDeaf() || isMuted && isSoundboardMuted && isVideoDisabled;

    const isDeafened = canServerDeafen && (useServerDeafenForSelf || !isCurrent) ? isServerDeafened : isLocalDeafened;
    const color = isDeafened ? "var(--status-danger)" : "var(--channels-default)";

    const deafenAction = canServerDeafen && (useServerDeafenForSelf || !isCurrent) ? "Server Deafen" : "Deafen";
    const tooltipAction = isDeafened ? (canServerDeafen && (useServerDeafenForSelf || !isCurrent) ? "Unserver Deafen" : "Undeafen") : deafenAction;

    return (
        <VoiceUserButton
            user={user}
            visibility={visibility}
            tooltip={`${tooltipAction} ${isCurrent ? "yourself" : `${getUserName(user)}`}`}
            icon={isCurrent ? <DeafenIconSelf muted={isDeafened} size="sm" color={color} /> : <DeafenIconOther muted={isDeafened} size="sm" color={color} />}
            onClick={() => {
                if (canServerDeafen) {
                    if (!useServerDeafenForSelf) {
                        VoiceActions.toggleSelfDeaf();
                        return;
                    }

                    const voiceState = VoiceStateStore.getVoiceStateForUser(user.id);
                    const channel = voiceState?.channelId ? ChannelStore.getChannel(voiceState.channelId) : null;
                    if (channel?.guild_id) {
                        GuildActions.setServerDeaf(channel.guild_id, user.id, !isServerDeafened);
                    }
                } else {
                    if (isCurrent) {
                        VoiceActions.toggleSelfDeaf();
                        return;
                    }
                    if (isMuted) {
                        VoiceActions.toggleLocalMute(user.id);
                        if (settings.store.muteSoundboard && isSoundboardMuted) {
                            VoiceActions.toggleLocalSoundboardMute(user.id);
                        }
                        if (settings.store.disableVideo && isVideoDisabled) {
                            VoiceActions.setDisableLocalVideo(
                                user.id,
                                "ENABLED",
                                "default"
                            );
                        }
                    } else {
                        VoiceActions.toggleLocalMute(user.id);
                        if (settings.store.muteSoundboard && !isSoundboardMuted) {
                            VoiceActions.toggleLocalSoundboardMute(user.id);
                        }
                        if (settings.store.disableVideo && !isVideoDisabled) {
                            VoiceActions.setDisableLocalVideo(
                                user.id,
                                "DISABLED",
                                "default"
                            );
                        }
                    }
                }
            }}
        />
    );
}

function getFakeDeafenAPI() {
    if (!isPluginEnabled("FakeDeafen")) return null;
    const fakeDeafen = require("@plugins/fakeDeafen");
    try {
        return {
            store: fakeDeafen.fakeDeafenStore,
            useFakeDeafen: fakeDeafen.useFakeDeafen
        };
    } catch (error) {
        console.error("Failed to load FakeDeafen plugin API:", error);
        console.log(`FakeDeafen store: ${JSON.stringify(fakeDeafen.fakeDeafenStore)}`);
        console.log(`FakeDeafen useFakeDeafen: ${JSON.stringify(fakeDeafen.useFakeDeafen)}`);
        return null;
    }
}

function FakeDeafenIconSmall({ active }: { active: boolean }) {
    const color = active ? "var(--status-danger)" : "var(--channels-default)";
    return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path
                d="M5.274 5.876c0.396-0.89 0.744-1.934 1.611-2.476 4.086-2.554 8.316 1.441 7.695 5.786-0.359 2.515-3.004 3.861-4.056 5.965-0.902 1.804-4.457 3.494-4.742 0.925"
                stroke={color}
                strokeOpacity={0.9}
                strokeWidth={0.8}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M11.478 11.931c2.111-2.239 1.579-7.495-1.909-7.337-2.625 0.119-2.012 3.64-1.402 4.861"
                stroke={color}
                strokeOpacity={0.9}
                strokeWidth={0.8}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M7.636 7.755c2.796-0.194 3.747 2.749 1.933 4.563-0.472 0.472-1.386-0.214-1.933 0.06-0.547 0.274-0.957 1.136-1.497 0.507"
                stroke={color}
                strokeOpacity={0.9}
                strokeWidth={0.8}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {active && (
                <path
                    d="M19 1L1 19"
                    stroke="var(--status-danger)"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                />
            )}
        </svg>
    );
}



export function UserFakeDeafenButton({ user, visibility }: { user: User; visibility?: ButtonVisibility; }) {
    const isCurrent = user.id === UserStore.getCurrentUser().id;
    if (!isCurrent) return null;

    const api = getFakeDeafenAPI();
    if (!api) return null;

    const [isActive, setIsActive] = useState(api.store.enabled);
    useEffect(() => api.store.subscribe(() => setIsActive(api.store.enabled)), []);

    return (
        <VoiceUserButton
            user={user}
            visibility={visibility}
            tooltip={isActive ? "Disable Fake Deafen" : "Enable Fake Deafen"}
            icon={<FakeDeafenIconSmall active={isActive} />}
            onClick={() => api.store.toggle()}
        />
    );
}
