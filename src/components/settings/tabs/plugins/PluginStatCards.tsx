/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { BaseText } from "@components/BaseText";
import { Tooltip } from "@webpack/common";

function PluginStatsCardWrapper({ title, children }) {
    return (
        <div className="vc-plugin-stats-wrapper">
            <div className="vc-plugin-stats-header">
                <BaseText size="md" weight="semibold">{title}</BaseText>
            </div>
            {children}
        </div>
    );
}

export function StockPluginsCard({ totalStockPlugins, enabledStockPlugins }) {
    return (
        <PluginStatsCardWrapper title="Stock Plugins">
            <div className="vc-plugin-stats vc-stockplugins-stats-card">
                <div className="vc-plugin-stats-card-container">
                    <div className="vc-plugin-stats-card-section">
                        <BaseText size="md" weight="semibold">Enabled</BaseText>
                        <BaseText size="xl" weight="bold">{enabledStockPlugins}</BaseText>
                    </div>
                    <div className="vc-plugin-stats-card-divider"></div>
                    <div className="vc-plugin-stats-card-section">
                        <BaseText size="md" weight="semibold">Total</BaseText>
                        <BaseText size="xl" weight="bold">{totalStockPlugins}</BaseText>
                    </div>
                </div>
            </div>
        </PluginStatsCardWrapper>
    );
}

export function UserPluginsCard({ totalUserPlugins, enabledUserPlugins }) {
    if (totalUserPlugins === 0)
        return (
            <PluginStatsCardWrapper title="Custom Plugins">
                <div className="vc-plugin-stats vc-stockplugins-stats-card">
                    <div className="vc-plugin-stats-card-container ">
                        <div className="vc-plugin-stats-card-section">
                            <BaseText size="md" weight="semibold">Total Userplugins</BaseText>
                            <Tooltip
                                text={
                                    <img
                                        src="https://discord.com/assets/ab6835d2922224154ddf.svg"
                                        style={{ width: "40px", height: "40px" }}
                                    />
                                }
                            >
                                {tooltipProps => (
                                    <span style={{ display: "inline", position: "relative" }}>
                                        <BaseText size="xl" weight="bold" {...tooltipProps}>
                                            {totalUserPlugins}
                                        </BaseText>
                                    </span>
                                )}
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </PluginStatsCardWrapper>
        );
    else
        return (
            <PluginStatsCardWrapper title="Custom Plugins">
                <div className="vc-plugin-stats vc-stockplugins-stats-card">
                    <div className="vc-plugin-stats-card-container">
                        <div className="vc-plugin-stats-card-section">
                            <BaseText size="md" weight="semibold">Enabled</BaseText>
                            <BaseText size="xl" weight="bold">{enabledUserPlugins}</BaseText>
                        </div>
                        <div className="vc-plugin-stats-card-divider"></div>
                        <div className="vc-plugin-stats-card-section">
                            <BaseText size="md" weight="semibold">Total</BaseText>
                            <BaseText size="xl" weight="bold">{totalUserPlugins}</BaseText>
                        </div>
                    </div>
                </div>
            </PluginStatsCardWrapper>
        );
}
