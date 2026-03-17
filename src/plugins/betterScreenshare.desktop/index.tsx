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

import { addSettingsPanelButton, Emitter, removeSettingsPanelButton, removeVoicePanelButton, ScreenshareSettingsIcon } from "../philsPluginLibraryVisualRefresh";
import { StreamPreviewChangeIcon } from "./components";
import { PluginInfo } from "./constants";
import { openScreenshareModal, openScreensharePreviewModal } from "./modals";
import { ScreenshareAudioPatcher, ScreensharePatcher } from "./patchers";
import { GoLivePanelWrapper, replacedSubmitFunction } from "./patches";
import { CustomStreamPreviewState } from "./state";
import { initScreenshareAudioStore, initScreenshareStore } from "./stores";
import { StreamCreateEvent, StreamDeleteEvent } from "./types";
import { parseStreamKey, stopSendingScreenSharePreview } from "./utilities";

const PanelButton = findComponentByCodeLazy(".GREEN,positionKeyStemOverride:");

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

function screensharePreviewButton(props: { nameplate?: any; }) {
    const { fakePreviewButtonLocation } = settings.use(["fakePreviewButtonLocation"]);
    if (fakePreviewButtonLocation !== "voicePanel" && fakePreviewButtonLocation !== "both") return null;

    return (
        <PanelButton
            tooltipText="Custom Stream Preview Image"
            icon={StreamPreviewChangeIcon}
            role="button"
            plated={props?.nameplate != null}
            onClick={openScreensharePreviewModal}
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
    },
    enableFakePreview: {
        type: OptionType.BOOLEAN,
        description: "Enable fake screenshare preview (shows a static image instead of your actual screen)",
        default: false
    },
    fakePreviewButtonLocation: {
        type: OptionType.SELECT,
        description: "Where to show the stream preview image button",
        options: [
            { label: "Above your avatar", value: "settingsPanel", default: false },
            { label: "Beside your avatar", value: "voicePanel", default: true },
            { label: "Both", value: "both", default: false },
        ],
        onChange: (value: string) => {
            removeSettingsPanelButton("CustomScreenSharePreview");
            removeVoicePanelButton("CustomScreenSharePreview");
            if (value === "settingsPanel" || value === "both") {
                addSettingsPanelButton({
                    name: "CustomScreenSharePreview",
                    icon: StreamPreviewChangeIcon,
                    tooltipText: "Stream Preview Image",
                    onClick: openScreensharePreviewModal
                });
            }
        }
    },
});

export default definePlugin( {
    name: "BetterScreenshare",
    description: "This plugin allows you to further customize your screen sharing.",
    authors: [Devs.philhk, Devs.LSDZaddi],
    dependencies: ["PhilsPluginLibraryVisualRefresh"],
    flux: {
        async STREAM_CREATE({ streamKey }: StreamCreateEvent): Promise<void> {
            const { userId } = parseStreamKey(streamKey);

            if (userId !== UserStore.getCurrentUser().id)
                return;

            CustomStreamPreviewState.setState({
                isStreaming: true,
            });
        },
        async STREAM_DELETE({ streamKey }: StreamDeleteEvent): Promise<void>
        {
            const { userId } = parseStreamKey(streamKey);

            if (userId !== UserStore.getCurrentUser().id)
                return;

            CustomStreamPreviewState.setState({
                isStreaming: false,
            });

            stopSendingScreenSharePreview();
        },
    },

    patches: [
        {
            find: ".DISPLAY_NAME_STYLES_COACHMARK),",
            replacement: {
                match: /speaking:.{0,100}style:.,children:\[/,
                replace: "$&$self.screenshareSettingsButton(arguments[0]),$self.screensharePreviewButton(arguments[0]),"
            }
        }
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
        const previewLoc = settings.store.fakePreviewButtonLocation;
        if (settings.store.enableFakePreview && (previewLoc === "settingsPanel" || previewLoc === "both")) {
            addSettingsPanelButton({
                name: "CustomScreenSharePreview",
                icon: StreamPreviewChangeIcon,
                tooltipText: "Stream Preview Image",
                onClick: openScreensharePreviewModal
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
    screensharePreviewButton: ErrorBoundary.wrap(screensharePreviewButton, { noop: true }),
});
