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
import { findComponentByCodeLazy } from "@webpack";
import { UserStore } from "@webpack/common";

import { Emitter, ScreenshareSettingsIcon } from "../philsPluginLibraryVisualRefresh";
import { SendCustomScreenSharePreviewImageButton } from "./components";
import { PluginInfo } from "./constants";
import { openScreenshareModal } from "./modals";
import { ScreenshareAudioPatcher, ScreensharePatcher } from "./patchers";
import { GoLivePanelWrapper, replacedSubmitFunction } from "./patches";
import { CustomStreamPreviewState } from "./state";
import { initScreenshareAudioStore, initScreenshareStore } from "./stores";
import { StreamCreateEvent, StreamDeleteEvent } from "./types";
import { parseStreamKey, stopSendingScreenSharePreview } from "./utilities";

const Button = findComponentByCodeLazy( ".NONE,disabled:", ".PANEL_BUTTON" );

function screenshareSettingsButton()
{

    return (
        <Button
            tooltipText="Change screenshare settings"
            icon={ ScreenshareSettingsIcon }
            role="button"
            onClick={ openScreenshareModal }
        />
    );
}

function renderYABDButton()
{
    return (
        <Button
            tooltipText="Change screenshare settings (pos1)"
            icon={ ScreenshareSettingsIcon }
            button="button"
            onClick={ openScreenshareModal }
        />
    );
}

function renderYABDButtonAlt()
{
    return (
        <Button
            className="Change screenshare settings (pos1)"
            icon={ ScreenshareSettingsIcon }
            button="button"
            onClick={ openScreenshareModal }
        />
    );
}

function sendCustomScreenSharePreviewImageButton()
{
    return <SendCustomScreenSharePreviewImageButton />;
}

export default definePlugin( {
    name: "BetterScreenshare",
    description: "This plugin allows you to further customize your screen sharing.",
    authors: [ Devs.philhk, Devs.LSDZaddi ],
    dependencies: [ "PhilsPluginLibraryVisualRefresh" ],
    flux: {
        async STREAM_CREATE( { streamKey }: StreamCreateEvent ): Promise<void>
        {
            const { userId } = parseStreamKey( streamKey );

            if ( userId !== UserStore.getCurrentUser().id )
            {
                return;
            }

            CustomStreamPreviewState.setState( {
                isStreaming: true,
            } );
        },
        async STREAM_DELETE( { streamKey }: StreamDeleteEvent ): Promise<void>
        {
            const { userId } = parseStreamKey( streamKey );

            if ( userId !== UserStore.getCurrentUser().id )
            {
                return;
            }

            CustomStreamPreviewState.setState( {
                isStreaming: false,
            } );
            stopSendingScreenSharePreview();
        },
    },
    patches: [
        {
                        // OlD V1
            find: "GoLiveModal: user cannot be undefined", // Module: 60594; canaryRelease: 364525; L431
            replacement: {
                match: /onSubmit:(\w+)/,
                replace: "onSubmit:$self.replacedSubmitFunction($1)"
            }
        },
        {
                        // OlD V1
            find: "StreamSettings: user cannot be undefined", // Module: 641115; canaryRelease: 364525; L254
            replacement: {
                match: /\(.{0,10}(,{.{0,100}modalContent)/,
                replace: "($self.GoLivePanelWrapper$1"
            }
        },
        {
                        // Working
            find: "#{intl::ACCOUNT_SPEAKING_WHILE_MUTED}",
            replacement: {
                match: /className:\i\.buttons,.{0,50}children:\[/,
                replace: "$&$self.screenshareSettingsButton(),$self.sendCustomScreenSharePreviewImageButton(),"
            }
        },
                        // NEW PATCHES
        {
            find: "GoLiveModalV2",
            replacement: [
                {
                    match: /(className:(\w+)\.rightButtonGroup,children:\[)/,
                    replace: "$1$self.renderYABDButton(),"
                },
            ]
        },
        {
            find: "canStreamWithSettings",
            replacement: [
                {
                    match: /return!1/,
                    replace: "return true"
                },
                {
                    match: /return!0/,
                    replace: "return true"
                }
            ],
        }
    ],
    settings: definePluginSettings( {
        hideDefaultSettings: {
            type: OptionType.BOOLEAN,
            description: "Hide Discord screen sharing settings",
            default: true,
        }
    } ),
    start(): void
    {
        initScreenshareStore();
        initScreenshareAudioStore();
        this.screensharePatcher = new ScreensharePatcher().patch();
        this.screenshareAudioPatcher = new ScreenshareAudioPatcher().patch();

    },
    stop(): void
    {
        this.screensharePatcher?.unpatch();
        this.screenshareAudioPatcher?.unpatch();
        Emitter.removeAllListeners( PluginInfo.PLUGIN_NAME );
        CustomStreamPreviewState.reset();
    },
    toolboxActions: {
        "Open Screenshare Settings": openScreenshareModal
    },
    replacedSubmitFunction,
    GoLivePanelWrapper,
    screenshareSettingsButton,
    renderYABDButton,
    sendCustomScreenSharePreviewImageButton
} );
