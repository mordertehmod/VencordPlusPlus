/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import "./PluginModal.css";

import { generateId } from "@api/Commands";
import { useSettings } from "@api/Settings";
import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Paragraph } from "@components/Paragraph";
import { debounce } from "@shared/debounce";
import { gitRemote } from "@shared/vencordUserAgent";
import { classNameFactory } from "@utils/css";
import { proxyLazy } from "@utils/lazy";
import { Margins } from "@utils/margins";
import { classes, isObjectEmpty } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { OptionType, Plugin } from "@utils/types";
import { User } from "@vencord/discord-types";
import { findByPropsLazy, findComponentByCodeLazy, findCssClassesLazy } from "@webpack";
import { Clickable, FluxDispatcher, React, Toasts, Tooltip, useEffect, UserStore, UserSummaryItem, UserUtils, useState } from "@webpack/common";
import { Constructor } from "type-fest";

import { PluginMeta } from "~plugins";

import { OptionComponentMap } from "./components";
import { openContributorModal } from "./ContributorModal";
import { GithubButton, WebsiteButton } from "./LinkIconButton";
import { PluginTabContent, Tabs, TabType } from "./PluginTabs";

const cl = classNameFactory("vc-plugin-modal-");

const AvatarStyles = findCssClassesLazy("moreUsers", "avatar", "clickableAvatar");
const ConfirmModal = findComponentByCodeLazy('parentComponent:"ConfirmModal"');
const WarningIcon = findComponentByCodeLazy("3.15H3.29c-1.74");
const UserRecord: Constructor<Partial<User>> = proxyLazy(() => UserStore.getCurrentUser().constructor) as any;

interface PluginModalProps extends ModalProps {
    plugin: Plugin;
    onRestartNeeded(key: string): void;
}

export function makeDummyUser(user: { username: string; id?: string; avatar?: string; }) {
    const newUser = new UserRecord({
        username: user.username,
        id: user.id ?? generateId(),
        avatar: user.avatar,
        /** To stop discord making unwanted requests... */
        bot: true,
    });

    FluxDispatcher.dispatch({
        type: "USER_UPDATE",
        user: newUser,
    });

    return newUser;
}

export default function PluginModal({ plugin, onRestartNeeded, onClose, transitionState }: PluginModalProps) {
    const pluginSettings = useSettings([`plugins.${plugin.name}.*`]).plugins[plugin.name];
    const hasSettings = Boolean(pluginSettings && plugin.options && !isObjectEmpty(plugin.options));

    const [authors, setAuthors] = useState<Partial<User>[]>([]);

    const [activeTab, setActiveTab] = useState<TabType>("settings");
    const [tabsError, setTabsError] = useState(false);
    const [infoExpanded, setInfoExpanded] = useState(false);

    useEffect(() => {
        (async () => {
            for (const user of plugin.authors.slice(0, 6)) {
                try {
                    const author = user.id
                        ? await UserUtils.getUser(String(user.id))
                            .catch(() => makeDummyUser({ username: user.name }))
                        : makeDummyUser({ username: user.name });

                    setAuthors(a => [...a, author]);
                } catch (e) {
                    continue;
                }
            }
        })();
    }, [plugin.authors]);

    function handleResetClick() {
        openWarningModal(plugin, onRestartNeeded);
    }

    function renderSettings() {
        if (!hasSettings || !plugin.options)
            return <Paragraph>There are no settings for this plugin.</Paragraph>;

        const options = Object.entries(plugin.options).map(([key, setting]) => {
            if (setting.type === OptionType.CUSTOM || setting.hidden) return null;

            function onChange(newValue: any) {
                const option = plugin.options?.[key];
                if (!option || option.type === OptionType.CUSTOM) return;

                pluginSettings[key] = newValue;

                if (option.restartNeeded) onRestartNeeded(key);
            }

            const Component = OptionComponentMap[setting.type];
            return (
                <ErrorBoundary noop key={key}>
                    <Component
                        id={key}
                        option={setting}
                        onChange={debounce(onChange)}
                        pluginSettings={pluginSettings}
                        definedSettings={plugin.settings}
                    />
                </ErrorBoundary>
            );
        });

        return (
            <div className="vc-plugins-settings">
                {options}
            </div>
        );
    }

    function renderMoreUsers(_label: string) {
        const remainingAuthors = plugin.authors.slice(6);

        return (
            <Tooltip text={remainingAuthors.map(u => u.name).join(", ")}>
                {({ onMouseEnter, onMouseLeave }) => (
                    <div
                        className={AvatarStyles.moreUsers}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                    >
                        +{remainingAuthors.length}
                    </div>
                )}
            </Tooltip>
        );
    }

    const pluginMeta = PluginMeta[plugin.name];
    const isCustomPlugin = pluginMeta.folderName.startsWith("src/zaddyplugins/") ?? false;

    return (
        <ModalRoot transitionState={transitionState} size={ModalSize.MEDIUM}>
            <ModalHeader separator={false} className={Margins.bottom8}>
                <div className={cl("header-spacer")} /> {/* This is hacky as fuck, but it centers the text without fucking up the flexbox*/}
                <div className={cl("header-title")}>
                    <BaseText size="xl" weight="bold">{plugin.name}</BaseText>
                        <Tooltip text={infoExpanded ? "Hide plugin info" : "Show plugin info"}>
                        {({ onMouseEnter, onMouseLeave }) => (
                            <Clickable
                                className={classes(cl("info-button"), infoExpanded && cl("info-button-expanded"))}
                                onClick={() => setInfoExpanded(!infoExpanded)}
                                onMouseEnter={onMouseEnter}
                                onMouseLeave={onMouseLeave}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24"><path fill="var(--interactive-normal)" d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" /></svg>
                            </Clickable>
                        )}
                    </Tooltip>
                </div>
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>

            <ModalContent className={Margins.bottom16}>
                    <section>
                        {infoExpanded && (
                            <Flex className={classes(cl("info"), cl("info-section"))}>
                                <Paragraph className={classes(cl("description"), Margins.bottom16)}>{plugin.description}</Paragraph>
                            </Flex>
                        )}
                    <Flex className={classes(cl("authorsAndButtons"), Margins.bottom16)}>
                        <Flex gap="8px">
                            <BaseText size="md" weight="semibold" color="text-strong" className={cl("authors-label")}>Authors:</BaseText>
                                <div style={{ width: "fit-content" }}>
                                    <ErrorBoundary noop>
                                        <UserSummaryItem
                                            users={authors}
                                            guildId={undefined}
                                            renderIcon={false}
                                            showDefaultAvatarsForNullUsers
                                            renderMoreUsers={renderMoreUsers}
                                            renderUser={(user: User) => (
                                                <Clickable
                                                className={AvatarStyles.clickableAvatar}
                                                onClick={() => openContributorModal(user)}
                                                >
                                                    <img
                                                        className={AvatarStyles.avatar}
                                                        src={user.getAvatarURL(void 0, 80, true)}
                                                        alt={user.username}
                                                        title={user.username}
                                                    />
                                                </Clickable>
                                            )}
                                        />
                                    </ErrorBoundary>
                                </div>
                        </Flex>

                        {!pluginMeta.userPlugin && (
                            <Flex gap="4px" className={cl("links")}>
                                <Tooltip text="View more info">
                                    {({ onMouseEnter, onMouseLeave }) => (
                                        <WebsiteButton
                                            text=""
                                            href={isCustomPlugin ? `https://zaddi.dev/VencordPlusPlus/plugins/${plugin.name}` : `https://vencord.dev/plugins/${plugin.name}`}
                                            onMouseEnter={onMouseEnter}
                                            onMouseLeave={onMouseLeave}
                                        />
                                    )}
                                </Tooltip>
                                <Tooltip text="Source Code">
                                    {({ onMouseEnter, onMouseLeave }) =>(
                                        <GithubButton
                                            text=""
                                            href={`https://github.com/${gitRemote}/tree/main/${pluginMeta.folderName}`}
                                            onMouseEnter={onMouseEnter}
                                            onMouseLeave={onMouseLeave}
                                        />
                                    )}
                                </Tooltip>
                            </Flex>
                        )}
                    </Flex>
                </section>

                <ErrorBoundary noop onError={() => setTabsError(true)}>
                    {!tabsError ? (
                        <>
                            <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
                            <PluginTabContent
                                activeTab={activeTab}
                                renderSettings={renderSettings}
                                renderAboutComponent={() => plugin.settingsAboutComponent && (
                                    <div className={Margins.top16}>
                                        <section>
                                            <ErrorBoundary message="An error occurred while rendering this plugin's custom Info Component">
                                                <plugin.settingsAboutComponent />
                                            </ErrorBoundary>
                                        </section>
                                    </div>
                                )}
                            />
                        </>
                    ) : (
                        <>
                            {plugin.settingsAboutComponent && (
                                <div className={Margins.top16}>
                                    <section>
                                        <ErrorBoundary message="An error occurred while rendering this plugin's custom Info Component">
                                            <plugin.settingsAboutComponent />
                                        </ErrorBoundary>
                                    </section>
                                </div>
                            )}

                            <section>
                                <BaseText size="lg" weight="semibold" color="text-strong" className={classes(Margins.top16, Margins.bottom8)}>Settings</BaseText>
                                {renderSettings()}
                            </section>
                        </>
                    )}
                </ErrorBoundary>
            </ModalContent>
            {((tabsError && hasSettings) || (!tabsError && activeTab === "settings" && hasSettings)) && (
            <ModalFooter>
                <Flex flexDirection="column" style={{ width: "100%" }}>
                    <Flex style={{ justifyContent: "space-between" }}>
                        {hasSettings ? (
                            <Tooltip text="Reset to default settings" shouldShow={!isObjectEmpty(pluginSettings)}>
                                {({ onMouseEnter, onMouseLeave }) => (
                                    <Button
                                        className={cl("disable-warning")}
                                        size="small"
                                        variant="primary"
                                        onClick={handleResetClick}
                                        onMouseEnter={onMouseEnter}
                                        onMouseLeave={onMouseLeave}
                                    >
                                        Reset
                                    </Button>
                                )}
                            </Tooltip>
                        ) : <div />}
                        </Flex>
                    </Flex>
                </ModalFooter>
            )}
        </ModalRoot>
    );
}

export function openPluginModal(plugin: Plugin, onRestartNeeded?: (pluginName: string, key: string) => void) {
    openModal(modalProps => (
        <PluginModal
            {...modalProps}
            plugin={plugin}
            onRestartNeeded={(key: string) => onRestartNeeded?.(plugin.name, key)}
        />
    ));
}

function resetSettings(plugin: Plugin, onRestartNeeded?: (pluginName: string) => void) {
    const defaultSettings = plugin.settings?.def;
    const pluginName = plugin.name;

    if (!defaultSettings) return;

    const newSettings: Record<string, any> = {};
    let restartNeeded = false;

    for (const key in defaultSettings) {
        if (key === "enabled") continue;

        const setting = defaultSettings[key];
        setting.type = setting.type ?? OptionType.STRING;

        if (setting.type === OptionType.STRING) {
            newSettings[key] = setting.default !== undefined && setting.default !== "" ? setting.default : "";
        } else if ("default" in setting && setting.default !== undefined) {
            newSettings[key] = setting.default;
        }

        if (setting?.restartNeeded) {
            restartNeeded = true;
        }
    }

    const currentSettings = plugin.settings?.store;
    if (currentSettings) {
        Object.assign(currentSettings, newSettings);
    }

    if (restartNeeded) {
        onRestartNeeded?.(plugin.name);
    }

    Toasts.show({
        message: `Settings for ${pluginName} have been reset.`,
        id: Toasts.genId(),
        type: Toasts.Type.SUCCESS,
        options: {
            position: Toasts.Position.TOP
        }
    });
}

export function openWarningModal(plugin?: Plugin | null, onRestartNeeded?: (pluginName: string) => void, isPlugin = true, enabledPlugins?: number | null, reset?: () => void) {
    openModal(props => (
        <ConfirmModal
            {...props}
            className={cl("confirm")}
            header={isPlugin ? "Reset Settings" : "Disable Plugins"}
            confirmText={isPlugin ? "Reset" : "Disable All"}
            cancelText="Cancel"
            onConfirm={() => {
                if (isPlugin && plugin) {
                    resetSettings(plugin, onRestartNeeded);
                } else {
                    reset?.();
                }
            }}
            onCancel={props.onClose}
        >
            <Paragraph>
                {isPlugin
                    ? <>Are you sure you want to reset all settings for <strong>{plugin?.name}</strong> to their default values?</>
                    : `Are you sure you want to disable ${enabledPlugins} plugins?`
                }
            </Paragraph>
            <div className={classes(Margins.top16, cl("warning"))}>
                <WarningIcon color="var(--text-feedback-critical)" />
                <span>This action cannot be undone.</span>
            </div>
        </ConfirmModal>
    ));
}
