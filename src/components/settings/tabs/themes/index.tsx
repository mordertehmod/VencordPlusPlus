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

import "./styles.css";

import { isPluginEnabled } from "@api/PluginManager";
import { Settings } from "@api/Settings";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Link } from "@components/Link";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { ThemeTab } from "@plugins/themeLibrary/components/ThemeTab";
import { getStylusWebStoreUrl } from "@utils/web";
import { Forms, React, TabBar, useState } from "@webpack/common";

import { CspErrorCard } from "./CspErrorCard";
import { LocalThemesTab } from "./LocalThemesTab";
import { OnlineThemesTab } from "./OnlineThemesTab";
import { Margins } from "@utils/margins";
import { on } from "events";
import { Heading, HeadingPrimary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { Flex } from "@components/Flex";

const enum ThemeTabs {
    LOCAL,
    ONLINE,
    THEME_LIBRARY
}

function ThemesTab() {
    const [currentTab, setCurrentTab] = useState(ThemeTabs.LOCAL);
    const [, forceUpdate] = useState({});

    return (
        <SettingsTab>
            <TabBar
                type="top"
                look="brand"
                className="vc-settings-tab-bar"
                selectedItem={currentTab}
                onItemSelect={setCurrentTab}
            >
                <TabBar.Item
                    className="vc-settings-tab-bar-item"
                    id={ThemeTabs.LOCAL}
                >
                    Local Themes
                </TabBar.Item>
                <TabBar.Item
                    className="vc-settings-tab-bar-item"
                    id={ThemeTabs.ONLINE}
                >
                    Online Themes
                </TabBar.Item>
                <TabBar.Item
                    className="vc-settings-tab-bar-item"
                    id={ThemeTabs.THEME_LIBRARY}
                >
                    Theme Library
                </TabBar.Item>
            </TabBar>

            <CspErrorCard />

            {currentTab === ThemeTabs.LOCAL && <LocalThemesTab />}
            {currentTab === ThemeTabs.ONLINE && <OnlineThemesTab />}
            {currentTab === ThemeTabs.THEME_LIBRARY && isPluginEnabled("ThemeLibrary") && <ThemeTab />}
            {currentTab === ThemeTabs.THEME_LIBRARY && !isPluginEnabled("ThemeLibrary") &&
                <EnableThemeLibraryPlugin onEnabled={() => forceUpdate({})} />
            }
        </SettingsTab>
    );
}

function EnableThemeLibraryPlugin({ onEnabled }: { onEnabled: () => void }) {
    return (
        <Card variant="danger" style={{ display: "flex", flexWrap: "wrap" }}>
            <Flex flexWrap="wrap" style={{ width: "100%", gap: "0.1em" }}>
                <div style={{ margin: "2px", flex: 1 }}>
                    <HeadingPrimary style={{ marginBottom: "4px" }}>Theme Library Plugin Not Enabled</HeadingPrimary>
                    <Paragraph>It must be enabled to access this feature.</Paragraph>
                </div>
                <div style={{ display: "flex", alignContent: "center", alignItems: "center", margin: "2px" }}>
                    <Button
                        variant="positive"
                        title="Enable Theme Library Plugin"
                        onClick={() => {
                            const settings = Settings.plugins["ThemeLibrary"];
                            const result = Vencord.Plugins.startPlugin(Vencord.Plugins.plugins["ThemeLibrary"]);

                            if (!result) {
                                settings.enabled = false;
                                const msg = `Error while starting ThemeLibrary plugin`;
                                console.error(msg);
                                return;
                            }

                            settings.enabled = true;
                            onEnabled();
                        }}
                    >
                        Enable ThemeLibrary
                    </Button>
                </div>
            </Flex>
        </Card>
    );
}

function UserscriptThemesTab() {
    return (
        <SettingsTab>
            <Card variant="danger">
                <Forms.FormTitle tag="h5">Themes are not supported on the Userscript!</Forms.FormTitle>

                <Forms.FormText>
                    You can instead install themes with the <Link href={getStylusWebStoreUrl()}>Stylus extension</Link>!
                </Forms.FormText>
            </Card>
        </SettingsTab>
    );
}

export default IS_USERSCRIPT
    ? wrapTab(UserscriptThemesTab, "Themes")
    : wrapTab(ThemesTab, "Themes");
