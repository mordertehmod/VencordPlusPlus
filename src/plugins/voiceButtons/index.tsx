/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./components/styles.css";

import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { User } from "@vencord/discord-types";
import { UserStore } from "@webpack/common";

import { openVoiceButtonsSettings } from "./components/settingsModal";
import { ButtonVisibility, settings } from "./settings";
import { UserChatButton, UserDeafenButton, UserFakeDeafenButton, UserMuteButton } from "./utils";

export default definePlugin({
    name: "VoiceButtons",
    description: "Quickly DM, mute, or deafen any user right from the voice-call panel.",
    authors: [Devs.LSDZaddi],
    settings,

    toolboxActions: {
        "VoiceButtons Settings": openVoiceButtonsSettings
    },

    patches: [
        {
            find: "\"avatarContainerClass\",\"userNameClassName\"",
            replacement: [
                {
                    match: /flipped\]:\i\}\),children:\[/,
                    replace: "$&$self.renderButtons(arguments[0].user),"
                }
            ]
        }
    ],
    renderButtons(user: User) {
        if (!user) return null;

        const isSelf = user.id === UserStore.getCurrentUser().id;

        const chatVis = (isSelf ? settings.store.chatButtonSelf : settings.store.chatButtonOthers) as ButtonVisibility;
        const muteVis = (isSelf ? settings.store.muteButtonSelf : settings.store.muteButtonOthers) as ButtonVisibility;
        const deafenVis = (isSelf ? settings.store.deafenButtonSelf : settings.store.deafenButtonOthers) as ButtonVisibility;
        const fakeDeafenVis = isSelf ? settings.store.fakeDeafenButtonSelf as ButtonVisibility : "hide";

        return (
            <Flex flexDirection="row" className="voice-user-buttons">
                <UserChatButton user={user} visibility={chatVis} />
                <UserMuteButton user={user} visibility={muteVis} />
                <UserDeafenButton user={user} visibility={deafenVis} />
                <UserFakeDeafenButton user={user} visibility={fakeDeafenVis} />
            </Flex>
        );
    }
});
