import { classNameFactory } from "@api/Styles";
import { Flex } from "@components/Flex";
import { Margins } from '@utils/margins';
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Forms, Select, Switch, TabBar, Text, useState } from "@webpack/common";

import { settings } from "../settings";
import React from "react";
import { BaseText } from "@components/BaseText";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { FormSwitch } from "@components/FormSwitch";

const cl = classNameFactory("vc-voicebuttons-settings-");

const buttonVisibilityOptions = [
    { label: "Show", value: "show" },
    { label: "Hide", value: "hide" },
    { label: "Disable", value: "disable" },
];

const buttonVisibilityOptionsOthers = [
    { label: "Show", value: "show" },
    { label: "Hide", value: "hide" },
];

const nameFormatOptions = [
    { label: "Global Name", value: "global" },
    { label: "Username", value: "username" },
    { label: "Both", value: "both" },
];

const enum SettingsTab {
    SELF,
    OTHERS,
    BEHAVIOR
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className={cl("setting-row")}>
            <BaseText>{label}</BaseText>
            {children}
        </div>
    );
}

function SelfSettings() {
    const [, forceUpdate] = useState(0);
    const rerender = () => forceUpdate(n => n + 1);

    return (
        <Flex flexDirection="column" style={{ gap: "12px" }}>
            <Heading tag="h3">Button Visibility (Self)</Heading>

            <SettingRow label="Chat Button">
                <Select
                    options={buttonVisibilityOptions}
                    isSelected={v => settings.store.chatButtonSelf === v}
                    select={v => { settings.store.chatButtonSelf = v; rerender(); }}
                    serialize={v => v}
                />
            </SettingRow>

            <SettingRow label="Mute Button">
                <Select
                    options={buttonVisibilityOptions}
                    isSelected={v => settings.store.muteButtonSelf === v}
                    select={v => { settings.store.muteButtonSelf = v; rerender(); }}
                    serialize={v => v}
                />
            </SettingRow>

            <SettingRow label="Deafen Button">
                <Select
                    options={buttonVisibilityOptions}
                    isSelected={v => settings.store.deafenButtonSelf === v}
                    select={v => { settings.store.deafenButtonSelf = v; rerender(); }}
                    serialize={v => v}
                />
            </SettingRow>

            <SettingRow label="Fake Deafen Button">
                <Select
                    options={buttonVisibilityOptions}
                    isSelected={v => settings.store.fakeDeafenButtonSelf === v}
                    select={v => { settings.store.fakeDeafenButtonSelf = v; rerender(); }}
                    serialize={v => v}
                />
            </SettingRow>

            <Paragraph className={Margins.top8}>
            Fake Deafen requires the FakeDeafen plugin to be enabled.
            </Paragraph>
        </Flex>
    );
}

function OthersSettings() {
    const [, forceUpdate] = useState(0);
    const rerender = () => forceUpdate(n => n + 1);

    return (
        <Flex flexDirection="column" style={{ gap: "12px" }}>
            <Forms.FormTitle tag="h3">Button Visibility (Other Users)</Forms.FormTitle>

            <SettingRow label="Chat Button">
                <Select
                    options={buttonVisibilityOptionsOthers}
                    isSelected={v => settings.store.chatButtonOthers === v}
                    select={v => { settings.store.chatButtonOthers = v; rerender(); }}
                    serialize={v => v}
                />
            </SettingRow>

            <SettingRow label="Mute Button">
                <Select
                    options={buttonVisibilityOptionsOthers}
                    isSelected={v => settings.store.muteButtonOthers === v}
                    select={v => { settings.store.muteButtonOthers = v; rerender(); }}
                    serialize={v => v}
                />
            </SettingRow>

            <SettingRow label="Deafen Button">
                <Select
                    options={buttonVisibilityOptionsOthers}
                    isSelected={v => settings.store.deafenButtonOthers === v}
                    select={v => { settings.store.deafenButtonOthers = v; rerender(); }}
                    serialize={v => v}
                />
            </SettingRow>
        </Flex>
    );
}

function BehaviorSettings() {
    const [, forceUpdate] = useState(0);
    const rerender = () => forceUpdate(n => n + 1);

    return (
        <Flex flexDirection="column">
            <Heading tag="h3">Behavior</Heading>

            <FormSwitch
                value={settings.store.muteSoundboard}
                onChange={v => { settings.store.muteSoundboard = v; rerender(); }}
                title="Mute Soundboard"
                className={Margins.bottom16}
            >
            </FormSwitch>

            <FormSwitch
                value={settings.store.disableVideo}
                onChange={v => { settings.store.disableVideo = v; rerender(); }}
                title="Disable Video"
                className={Margins.bottom16}
            >
            </FormSwitch>

            <FormSwitch
                value={settings.store.useServer}
                onChange={v => { settings.store.useServer = v; rerender(); }}
                title="Use Server Mute/Deafen"
                className={Margins.bottom16}
            >
            </FormSwitch>

            <FormSwitch
                value={settings.store.serverSelf}
                onChange={v => { settings.store.serverSelf = v; rerender(); }}
                title="Use Server Mute/Deafen for Self"
                className={Margins.bottom16}
            >
            </FormSwitch>

            <Heading tag="h3" className={Margins.top16}>Display</Heading>

            <SettingRow label="Name Format in Tooltip">
                <Select
                    options={nameFormatOptions}
                    isSelected={v => settings.store.whichNameToShow === v}
                    select={v => { settings.store.whichNameToShow = v; rerender(); }}
                    serialize={v => v}
                />
            </SettingRow>
        </Flex>
    );
}

function SettingsModal({ rootProps }: { rootProps: ModalProps }) {
    const [currentTab, setCurrentTab] = useState(SettingsTab.SELF);

    return (
        <ModalRoot {...rootProps} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>VoiceButtons Settings</Text>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>

            <ModalContent className={cl("content")}>
                <TabBar
                    type="top"
                    look="brand"
                    className={cl("tab-bar")}
                    selectedItem={currentTab}
                    onItemSelect={setCurrentTab}
                >
                    <TabBar.Item className={cl("tab-bar-item")} id={SettingsTab.SELF}>
                        Self
                    </TabBar.Item>
                    <TabBar.Item className={cl("tab-bar-item")} id={SettingsTab.OTHERS}>
                        Other Users
                    </TabBar.Item>
                    <TabBar.Item className={cl("tab-bar-item")} id={SettingsTab.BEHAVIOR}>
                        Behavior
                    </TabBar.Item>
                </TabBar>

                <div className={cl("tab-content")}>
                    {currentTab === SettingsTab.SELF && <SelfSettings />}
                    {currentTab === SettingsTab.OTHERS && <OthersSettings />}
                    {currentTab === SettingsTab.BEHAVIOR && <BehaviorSettings />}
                </div>
            </ModalContent>
        </ModalRoot>
    );
}

export function openVoiceButtonsSettings() {
    openModal(props => <SettingsModal rootProps={props} />);
}
