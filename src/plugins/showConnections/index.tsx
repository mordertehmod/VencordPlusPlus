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

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { CopyIcon, LinkIcon } from "@components/Icons";
import { makeRange } from "@components/PluginSettings/components";
import { Devs } from "@utils/constants";
import { openUserProfile } from "@utils/discord";
import { Margins } from "@utils/margins";
import { copyWithToast } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { Clickable, Forms, Slider, Tooltip, UserProfileStore, useState } from "@webpack/common";
import { Connection } from "@webpack/types";
import { User } from "discord-types/general";

import { VerifiedIcon } from "./VerifiedIcon";

const useLegacyPlatformType: (platform: string) => string = findByCodeLazy(".TWITTER_LEGACY:");
const platforms: { get(type: string): ConnectionPlatform; } = findByPropsLazy("isSupported", "getByUrl");
const getProfileThemeProps = findByCodeLazy(".getPreviewThemeColors", "primaryColor:");

const enum Spacing {
    COMPACT,
    COZY,
    ROOMY
}
const getSpacingPx = (spacing: Spacing | undefined) => (spacing ?? Spacing.COMPACT) * 2 + 4;

const settings = definePluginSettings({
    iconSize: {
        type: OptionType.NUMBER,
        description: "Icon size (px)",
        default: 32
    },
    iconSpacing: {
        type: OptionType.SELECT,
        description: "Icon margin",
        default: Spacing.COZY,
        options: [
            { label: "Compact", value: Spacing.COMPACT },
            { label: "Cozy", value: Spacing.COZY }, // US Spelling :/
            { label: "Roomy", value: Spacing.ROOMY }
        ]
    },
    maxNumberOfConnections: {
        type: OptionType.COMPONENT,
        description: "Max number of connections to show",
        component: props => {
            const [value, setValue] = useState(settings.store.maxNumberOfConnections || 13);
            const range = makeRange(6, 48, 7);
            return (
                <Forms.FormSection>
                    <Forms.FormTitle>
                        Max Number Of Connections
                    </Forms.FormTitle>
                    <Forms.FormText
                        className={Margins.bottom20}
                        type="description"
                    >
                        Max number of connections to show
                    </Forms.FormText>
                    <Slider
                        initialValue={value}
                        markers={range}
                        keyboardStep={1}
                        minValue={range[0]}
                        maxValue={range.at(-1)}
                        onValueChange={value => {
                            const rounded = Math.round(value);
                            setValue(rounded);
                            props.setValue(rounded);
                        }}
                        onValueRender={value => String(Math.round(value))}
                        onMarkerRender={value => String(value)}
                    />
                </Forms.FormSection>
            );
        }
    }
});

interface ConnectionPlatform {
    getPlatformUserUrl(connection: Connection): string;
    icon: { lightSVG: string, darkSVG: string; };
}

const profilePopoutComponent = ErrorBoundary.wrap(
    (props: { user: User; displayProfile?: any; }) => (
        <ConnectionsComponent
            {...props}
            id={props.user.id}
            theme={getProfileThemeProps(props).theme}
        />
    ),
    { noop: true }
);

function ConnectionsComponent({ id, theme }: { id: string, theme: string; }) {
    const profile = UserProfileStore.getUserProfile(id);
    if (!profile)
        return null;

    const { connectedAccounts } = profile;
    if (!connectedAccounts?.length)
        return null;

    const connections = connectedAccounts.map(connection => <CompactConnectionComponent connection={connection} theme={theme} key={connection.id} />);

    if (connectedAccounts.length > settings.store.maxNumberOfConnections) {
        connections.length = settings.store.maxNumberOfConnections;
        connections.push(<ConnectionsMoreIcon
            key="more-connections"
            numExtra={connectedAccounts.length - settings.store.maxNumberOfConnections}
            onClick={() => openUserProfile(id, {
                section: "USER_INFO",
                subsection: "CONNECTIONS"
            })}
        />);
    }
    return (
        <Flex style={{
            gap: getSpacingPx(settings.store.iconSpacing),
            flexWrap: "wrap"
        }}>
            {connections}
        </Flex>
    );
}

function ConnectionsMoreIcon({ numExtra, onClick }: { numExtra: number; onClick: () => void; }) {
    return (
        <Tooltip text="View all Connections">
            {props => (
                <Clickable
                    {...props}
                    onClick={onClick}
                >
                    {/* discords icon refuses to work with a custom width/height for some reason */}
                    <svg width={settings.store.iconSize} height={settings.store.iconSize} viewBox="0 0 24 24">
                        <path fill="var(--interactive-normal)" fillRule="evenodd" d="M4 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10-2a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm8 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" clipRule="evenodd"></path>
                    </svg>
                </Clickable>
            )}
        </Tooltip>
    );
}

function CompactConnectionComponent({ connection, theme }: { connection: Connection, theme: string; }) {
    const platform = platforms.get(useLegacyPlatformType(connection.type));
    const url = platform.getPlatformUserUrl?.(connection);

    const img = (
        <img
            aria-label={connection.name}
            src={theme === "light" ? platform.icon.lightSVG : platform.icon.darkSVG}
            style={{
                width: settings.store.iconSize,
                height: settings.store.iconSize
            }}
        />
    );

    const TooltipIcon = url ? LinkIcon : CopyIcon;

    return (
        <Tooltip
            text={
                <span className="vc-sc-tooltip">
                    <span className="vc-sc-connection-name">{connection.name}</span>
                    {connection.verified && <VerifiedIcon />}
                    <TooltipIcon height={16} width={16} />
                </span>
            }
            key={connection.id}
        >
            {tooltipProps =>
                url
                    ? <a
                        {...tooltipProps}
                        className="vc-user-connection"
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => {
                            if (Vencord.Plugins.isPluginEnabled("OpenInApp")) {
                                const OpenInApp = Vencord.Plugins.plugins.OpenInApp as any as typeof import("../openInApp").default;
                                // handleLink will .preventDefault() if applicable
                                OpenInApp.handleLink(e.currentTarget, e);
                            }
                        }}
                    >
                        {img}
                    </a>
                    : <button
                        {...tooltipProps}
                        className="vc-user-connection"
                        onClick={() => copyWithToast(connection.name)}
                    >
                        {img}
                    </button>

            }
        </Tooltip>
    );
}

export default definePlugin({
    name: "ShowConnections",
    description: "Show connected accounts in user popouts",
    authors: [Devs.TheKodeToad, Devs.sadan],
    settings,

    patches: [
        {
            find: ".hasAvatarForGuild(null==",
            replacement: {
                match: /currentUser:\i,guild:\i}\)(?<=user:(\i),bio:null==(\i)\?.+?)/,
                replace: "$&,$self.profilePopoutComponent({ user: $1, displayProfile: $2 })"
            }
        }
    ],

    profilePopoutComponent,
});
