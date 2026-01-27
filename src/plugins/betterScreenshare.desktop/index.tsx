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
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import ErrorBoundary from "@components/ErrorBoundary";
import { findComponentByCodeLazy } from "@webpack";
import { UserStore } from "@webpack/common";

import { addSettingsPanelButton, Emitter, removeSettingsPanelButton, ScreenshareSettingsIcon } from "../philsPluginLibraryVisualRefresh";
import { SendCustomScreenSharePreviewImageButton } from "./components";
import { PluginInfo } from "./constants";
import { openScreenshareModal } from "./modals";
import { ScreenshareAudioPatcher, ScreensharePatcher } from "./patchers";
import { GoLivePanelWrapper, replacedSubmitFunction } from "./patches";
import { CustomStreamPreviewState } from "./state";
import { initScreenshareAudioStore, initScreenshareStore } from "./stores";
import { StreamCreateEvent, StreamDeleteEvent } from "./types";
import { parseStreamKey, stopSendingScreenSharePreview } from "./utilities";

const PanelButton = findComponentByCodeLazy(".GREEN,positionKeyStemOverride:");
const PanelButtonNew = findComponentByCodeLazy("tooltipPositionKey", "positionKeyStemOverride");

function screenshareSettingsButton(props: { nameplate?: any; }) {
    const { buttonLocation } = settings.use(["buttonLocation"]);
    if (buttonLocation !== "voicePanel" && buttonLocation !== "both") return null;

    return (
        <PanelButton
            tooltipText="Screenshare Settings"
            icon={ScreenshareSettingsIcon}
            role="button"
            plated={props?.nameplate != null}
            onClick={openScreenshareModal}
        />
    );
}

const settings = definePluginSettings({
    buttonLocation: {
        type: OptionType.SELECT,
        description: "Where to show the Screenshare Settings button",
        options: [
            { label: "Above your avatar", value: "settingsPanel", default: true },
            { label: "Beside your avatar", value: "voicePanel", default: false },
            { label: "Both", value: "both", default: false },
            { label: "None", value: "none", default: false }
        ],
        onChange: (value: string) => {
            if (value === "settingsPanel" || value === "both") {
                addSettingsPanelButton({
                    name: PluginInfo.PLUGIN_NAME,
                    icon: ScreenshareSettingsIcon,
                    tooltipText: "Screenshare Settings",
                    onClick: openScreenshareModal
                });
            } else {
                removeSettingsPanelButton(PluginInfo.PLUGIN_NAME);
            }
        }
    },
    openSettings: {
        type: OptionType.COMPONENT,
        component: () => (
            <Button
                onClick={() => openScreenshareModal()}
            >
                Open Screenshare Settings
            </Button>
        )
    }
});

/*
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
*/

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
        /*
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
        */
        {
            find: "#{intl::ACCOUNT_SPEAKING_WHILE_MUTED}",
            replacement: {
                match: /speaking:.{0,100}style:.,children:\[/,
                replace: "$&$self.screenshareSettingsButton(arguments[0]),"
            }
        }
        /*
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
        */
    ],
    settings,
    start(): void {
        initScreenshareStore();
        initScreenshareAudioStore();
        this.screensharePatcher = new ScreensharePatcher().patch();
        this.screenshareAudioPatcher = new ScreenshareAudioPatcher().patch();

        const loc = settings.store.buttonLocation;
        if (loc === "settingsPanel" || loc === "both") {
            addSettingsPanelButton({
                name: PluginInfo.PLUGIN_NAME,
                icon: ScreenshareSettingsIcon,
                tooltipText: "Screenshare Settings",
                onClick: openScreenshareModal
            });
        }
    },
    stop(): void {
        this.screensharePatcher?.unpatch();
        this.screenshareAudioPatcher?.unpatch();
        Emitter.removeAllListeners(PluginInfo.PLUGIN_NAME);
        removeSettingsPanelButton(PluginInfo.PLUGIN_NAME);
        CustomStreamPreviewState.reset();
    },
    toolboxActions: {
        "Open Screenshare Settings": openScreenshareModal
    },
    replacedSubmitFunction,
    GoLivePanelWrapper,
    screenshareSettingsButton: ErrorBoundary.wrap(screenshareSettingsButton, { noop: true }),
    //renderYABDButton,
    //sendCustomScreenSharePreviewImageButton
});
