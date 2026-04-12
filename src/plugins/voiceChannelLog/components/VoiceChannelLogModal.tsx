/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { classes } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Channel } from "@vencord/discord-types";
import { findStoreLazy } from "@webpack";
import { Button, React, ScrollerThin } from "@webpack/common";

import { clearLogs, getVcLogs, vcLogSubscribe } from "../logs";
import settings from "../settings";
import { cl } from "../utils";
import { VoiceChannelLogEntryComponent } from "./VoiceChannelLogEntryComponent";

const AccessibilityStore = findStoreLazy("AccessibilityStore");

export function openVoiceChannelLog(channel: Channel) {
    return openModal(props => (
        <VoiceChannelLogModal props={props} channel={channel} />
    ));
}

export function VoiceChannelLogModal({ channel, props }: { channel: Channel; props: ModalProps; }) {
    const { newestFirst } = settings.use();
    const logs = React.useSyncExternalStore(vcLogSubscribe, () => getVcLogs(channel.id));
    const orderedLogs = newestFirst ? [...logs].reverse() : logs;

    return (
        <ModalRoot {...props} size={ModalSize.LARGE}>
            <ModalHeader>
                <BaseText size="lg" weight="semibold" className={cl("header")} style={{ flexGrow: 1 }}>
                    {channel.name} logs
                </BaseText>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>

            <ModalContent>
                <ScrollerThin fade className={classes(cl("scroller"), `group-spacing-${AccessibilityStore.messageGroupSpacing}`)}>
                    {orderedLogs.length > 0 ? orderedLogs.map((entry, i) => {
                        const elements: React.ReactNode[] = [];
                        const date = entry.timestamp.toDateString();

                        if (i === 0 || date !== orderedLogs[i - 1].timestamp.toDateString()) {
                            elements.push(
                                <div key={`sep-${date}-${i}`} className={cl("date-separator")} role="separator" aria-label={date}>
                                    <span>{date}</span>
                                </div>
                            );
                        }

                        elements.push(
                            <VoiceChannelLogEntryComponent key={`entry-${entry.userId}-${entry.timestamp.valueOf()}-${i}`} logEntry={entry} channel={channel} />
                        );

                        return elements;
                    }) : (
                        <div className={cl("empty")}>No logs to display.</div>
                    )}
                </ScrollerThin>
            </ModalContent>

            <ModalFooter>
                <Button color={Button.Colors.RED} onClick={() => clearLogs(channel.id)}>
                    Clear logs
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}
