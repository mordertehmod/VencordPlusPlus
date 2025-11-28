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

import { classNameFactory } from "@api/Styles";
import { Paragraph } from "@components/Paragraph";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { Plugin } from "@utils/types";
import { Clickable, React } from "@webpack/common";

const cl = classNameFactory("vc-plugin-modal-");

export const PluginTabs = ["settings", "keybinds", "changelog"] as const;

export type TabType = (typeof PluginTabs)[number];

interface TabsProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
}

export function Tabs({ activeTab, onTabChange }: TabsProps) {
    return (
        <div className={classes(cl("tabs"), Margins.bottom16)}>
            {PluginTabs.map((tab) => (
                <Clickable
                    key={tab}
                    className={classes(cl("tab"), activeTab === tab && cl("tab-active"))}
                    onClick={() => onTabChange(tab)}
                >
                    {tab[0].toUpperCase() + tab.slice(1)}
                </Clickable>
            ))}
        </div>
    );
}

interface PluginTabContentProps {
    activeTab: TabType;
    renderSettings: () => React.ReactNode;
    renderAboutComponent: () => React.ReactNode;
}

export function PluginTabContent({ activeTab, renderSettings, renderAboutComponent }: PluginTabContentProps) {
    switch (activeTab) {
        case "settings":
            return (
                <>
                    {renderAboutComponent()}
                    <section>
                        {renderSettings()}
                    </section>
                </>
            );
        case "keybinds":
            return (
                <section>
                    <Paragraph>Keybind content will go here</Paragraph>
                </section>
            );
        case "changelog":
            return (
                <section>
                    <Paragraph>This is where our plugin changelog will reside</Paragraph>
                </section>
            );
    }
}
