/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChannelToolbarButton } from "@api/HeaderBar";
import { addSurfacePropsProvider, notifySurfaceClassesChanged, type SurfaceId, type SurfaceProvidedProps } from "@api/SurfaceClasses";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { classes } from "@utils/misc";
import definePlugin from "@utils/types";
import { Clickable, ContextMenuApi, Menu } from "@webpack/common";
import type { FocusEvent as ReactFocusEvent, MouseEvent as ReactMouseEvent, ReactNode, SVGProps } from "react";

import { type PanelId, panelRegistry, setCollapseSettingChangeHandler, settings, setUserAreaDetachSettingChangeHandler, toolbarPanelOrder } from "./settings";
import managedStyle from "./style.css?managed";

const cl = classNameFactory("vc-collapsible-ui-");

const panelDependentSurfaces: Record<PanelId, SurfaceId[]> = {
    guildBar: ["guildBar", "sidebar", "userArea"],
    channelList: ["channelList", "base", "sidebar", "userArea"],
    membersList: ["membersList"],
    chatButtons: [],
    titleBar: ["titleBar"],
    headerBar: ["headerBar", "base"],
    userArea: ["userArea"],
};

// Keep these in sync with --vc-cui-collapsed-block-size and --vc-cui-header-bar-height in style.css.
const HEADER_BAR_COLLAPSED_INTERACTION_HEIGHT = 8;
const HEADER_BAR_EXPANDED_INTERACTION_HEIGHT = 32;
const DETACHED_USER_AREA_WIDTH = 312;
const DETACHED_USER_AREA_HEIGHT = 88;
const DETACHED_USER_AREA_MARGIN = 16;
const toolbarCollapsedSettingKeys: Parameters<typeof settings.use>[0] = ["guildBarCollapsed", "channelListCollapsed", "membersListCollapsed", "chatButtonsCollapsed", "titleBarCollapsed", "headerBarCollapsed", "userAreaCollapsed"];
const collapsedSettingKeysByPanel = {
    guildBar: ["guildBarCollapsed"],
    channelList: ["channelListCollapsed"],
    membersList: ["membersListCollapsed"],
    chatButtons: ["chatButtonsCollapsed"],
    titleBar: ["titleBarCollapsed"],
    headerBar: ["headerBarCollapsed"],
    userArea: ["userAreaCollapsed"],
} satisfies Record<PanelId, Parameters<typeof settings.use>[0]>;

let providerUnsubs: Array<() => void> = [];
let channelListExpandedByInteraction = false;
let headerBarExpandedByInteraction = false;
let headerBarPointerTrackerEnabled = false;
let userAreaDragState: { offsetX: number; offsetY: number; width: number; height: number; } | undefined;
let detachedUserAreaDragPosition: { x: number; y: number; } | undefined;
let detachedUserAreaPositionChanged = false;
let channelListElement: HTMLElement | null = null;
let userAreaElement: HTMLElement | null = null;

function PanelsIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" {...props}>
            <path fill="currentColor" d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3H3V5Zm0 5h6v11H5a2 2 0 0 1-2-2V10Zm8 0h10v9a2 2 0 0 1-2 2H11V10Zm2-5h8v3h-8V5Z" />
        </svg>
    );
}

function isPanelCollapsed(panelId: PanelId) {
    return settings.plain[panelRegistry[panelId].collapsedKey];
}

function usePanelCollapsed(panelId: PanelId) {
    const key = panelRegistry[panelId].collapsedKey;
    return settings.use(collapsedSettingKeysByPanel[panelId])[key];
}

function notifyPanelSurfacesChanged(panelId: PanelId) {
    for (const surfaceId of panelDependentSurfaces[panelId]) {
        notifySurfaceClassesChanged(surfaceId);
    }
}

function setHeaderBarExpandedByInteraction(expanded: boolean) {
    if (headerBarExpandedByInteraction === expanded) return;
    headerBarExpandedByInteraction = expanded;
    notifySurfaceClassesChanged("base");
    notifySurfaceClassesChanged("headerBar");
}

function setChannelListExpandedByInteraction(expanded: boolean) {
    if (channelListExpandedByInteraction === expanded) return;
    channelListExpandedByInteraction = expanded;
    notifySurfaceClassesChanged("base");
    notifySurfaceClassesChanged("sidebar");
}

function syncPanelCollapsedState(panelId: PanelId, collapsed: boolean) {
    if (panelId === "channelList") {
        channelListExpandedByInteraction = false;
    }

    if (panelId === "headerBar") {
        setHeaderBarPointerTrackerEnabled(collapsed);
        if (!collapsed) {
            headerBarExpandedByInteraction = false;
        }
    }

    notifyPanelSurfacesChanged(panelId);
}

function syncAllPanelCollapsedStates() {
    for (const panelId of toolbarPanelOrder) {
        syncPanelCollapsedState(panelId, isPanelCollapsed(panelId));
    }
}

// Electron drag regions do not provide stable hover events, so keep this as a
// coordinate-only tracker while headerbar collapse is enabled.
function handleHeaderBarPointerMove(event: MouseEvent) {
    if (!isPanelCollapsed("headerBar")) {
        setHeaderBarPointerTrackerEnabled(false);
        setHeaderBarExpandedByInteraction(false);
        return;
    }

    const interactionHeight = headerBarExpandedByInteraction ? HEADER_BAR_EXPANDED_INTERACTION_HEIGHT : HEADER_BAR_COLLAPSED_INTERACTION_HEIGHT;
    setHeaderBarExpandedByInteraction(event.clientY >= 0 && event.clientY <= interactionHeight);
}

function setHeaderBarPointerTrackerEnabled(enabled: boolean) {
    if (headerBarPointerTrackerEnabled === enabled) return;
    headerBarPointerTrackerEnabled = enabled;

    if (enabled) {
        document.addEventListener("mousemove", handleHeaderBarPointerMove, true);
    } else {
        document.removeEventListener("mousemove", handleHeaderBarPointerMove, true);
    }
}

function setPanelCollapsed(panelId: PanelId, collapsed: boolean) {
    const key = panelRegistry[panelId].collapsedKey;
    if (settings.plain[key] === collapsed) return;
    settings.store[key] = collapsed;
}

function togglePanel(panelId: PanelId) {
    setPanelCollapsed(panelId, !isPanelCollapsed(panelId));
}

function openToolbarMenu(event: ReactMouseEvent) {
    ContextMenuApi.openContextMenu(event, () => <ToolbarMenu onClose={ContextMenuApi.closeContextMenu} />);
}

function containsRelatedTarget(event: ReactFocusEvent<HTMLElement> | ReactMouseEvent<HTMLElement>) {
    const { currentTarget, relatedTarget } = event;
    return relatedTarget instanceof Node && currentTarget.contains(relatedTarget);
}

function isUserAreaNode(node: unknown) {
    return node instanceof Element && node.closest("[data-vc-collapsible-ui-user-area]") != null;
}

function isUserAreaEvent(event: ReactFocusEvent<HTMLElement> | ReactMouseEvent<HTMLElement>) {
    if (isUserAreaNode(event.target)) return true;

    const path = event.nativeEvent.composedPath();
    if (path.some(isUserAreaNode)) return true;

    if ("clientX" in event && "clientY" in event) {
        const rect = userAreaElement?.getBoundingClientRect();
        if (rect && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) {
            return true;
        }
    }

    return false;
}

function isChannelListNode(node: unknown) {
    return node instanceof Element && node.closest("[data-vc-collapsible-ui-channel-list]") != null;
}

function isChannelListEvent(event: ReactFocusEvent<HTMLElement> | ReactMouseEvent<HTMLElement>) {
    if (isChannelListNode(event.target)) return true;

    const path = event.nativeEvent.composedPath();
    if (path.some(isChannelListNode)) return true;

    if ("clientX" in event && "clientY" in event) {
        const rect = channelListElement?.getBoundingClientRect();
        if (rect && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) {
            return true;
        }
    }

    return false;
}

function shouldDetachUserArea() {
    return settings.plain.detachUserArea && !isPanelCollapsed("userArea");
}

function setChannelListElement(element: HTMLElement | null) {
    channelListElement = element;
}

function setUserAreaElement(element: HTMLElement | null) {
    userAreaElement = element;
}

function syncUserAreaDetachState() {
    notifySurfaceClassesChanged("sidebar");
    notifySurfaceClassesChanged("userArea");
}

function clampUserAreaPosition(x: number, y: number, width = DETACHED_USER_AREA_WIDTH, height = DETACHED_USER_AREA_HEIGHT) {
    const maxX = Math.max(DETACHED_USER_AREA_MARGIN, window.innerWidth - width - DETACHED_USER_AREA_MARGIN);
    const maxY = Math.max(DETACHED_USER_AREA_MARGIN, window.innerHeight - height - DETACHED_USER_AREA_MARGIN);

    return {
        x: Math.min(Math.max(DETACHED_USER_AREA_MARGIN, x), maxX),
        y: Math.min(Math.max(DETACHED_USER_AREA_MARGIN, y), maxY),
    };
}

function getDetachedUserAreaPosition() {
    if (detachedUserAreaDragPosition) return detachedUserAreaDragPosition;

    const storedX = settings.plain.detachedUserAreaX ?? -1;
    const storedY = settings.plain.detachedUserAreaY ?? -1;
    const defaultPosition = clampUserAreaPosition(
        window.innerWidth - DETACHED_USER_AREA_WIDTH - 24,
        window.innerHeight - DETACHED_USER_AREA_HEIGHT - 88
    );

    if (!Number.isFinite(storedX) || !Number.isFinite(storedY) || storedX < 0 || storedY < 0) return defaultPosition;
    return clampUserAreaPosition(storedX, storedY);
}

function persistDetachedUserAreaPosition(x: number, y: number, width?: number, height?: number) {
    const position = clampUserAreaPosition(x, y, width, height);
    const roundedX = Math.round(position.x);
    const roundedY = Math.round(position.y);
    if (settings.plain.detachedUserAreaX === roundedX && settings.plain.detachedUserAreaY === roundedY) return;

    settings.store.detachedUserAreaX = roundedX;
    settings.store.detachedUserAreaY = roundedY;
}

function handleDetachedUserAreaMouseMove(event: MouseEvent) {
    if (!userAreaDragState) return;
    const position = clampUserAreaPosition(
        event.clientX - userAreaDragState.offsetX,
        event.clientY - userAreaDragState.offsetY,
        userAreaDragState.width,
        userAreaDragState.height
    );
    if (detachedUserAreaDragPosition?.x === position.x && detachedUserAreaDragPosition.y === position.y) return;

    detachedUserAreaDragPosition = position;
    detachedUserAreaPositionChanged = true;
    notifySurfaceClassesChanged("userArea");
}

function stopDetachedUserAreaDrag() {
    const dragState = userAreaDragState;
    if (dragState && detachedUserAreaDragPosition && detachedUserAreaPositionChanged) {
        persistDetachedUserAreaPosition(detachedUserAreaDragPosition.x, detachedUserAreaDragPosition.y, dragState.width, dragState.height);
    }

    userAreaDragState = undefined;
    detachedUserAreaDragPosition = undefined;
    detachedUserAreaPositionChanged = false;
    document.removeEventListener("mousemove", handleDetachedUserAreaMouseMove, true);
    document.removeEventListener("mouseup", stopDetachedUserAreaDrag, true);
}

function startDetachedUserAreaDrag(event: ReactMouseEvent<HTMLElement>) {
    if (!shouldDetachUserArea() || event.button !== 0) return;

    const { target } = event;
    if (target instanceof Element && target.closest("button, a, input, textarea, select, [role='button'], [aria-haspopup='menu']")) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const height = Math.min(rect.height, DETACHED_USER_AREA_HEIGHT);
    detachedUserAreaDragPosition = getDetachedUserAreaPosition();
    detachedUserAreaPositionChanged = false;
    userAreaDragState = {
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        width: rect.width,
        height,
    };

    document.addEventListener("mousemove", handleDetachedUserAreaMouseMove, true);
    document.addEventListener("mouseup", stopDetachedUserAreaDrag, true);
}

const ToolbarMenu = ErrorBoundary.wrap(({ onClose }: { onClose(): void; }) => {
    const store = settings.use(toolbarCollapsedSettingKeys);

    return (
        <Menu.Menu navId="vc-collapsible-ui-toolbar-menu" onClose={onClose} aria-label="Collapsible UI">
            {toolbarPanelOrder.map(panelId => {
                const panel = panelRegistry[panelId];
                const collapsed = store[panel.collapsedKey];

                return (
                    <Menu.MenuCheckboxItem
                        key={panelId}
                        id={`vc-collapsible-ui-${panel.classId}`}
                        label={panel.label}
                        checked={!collapsed}
                        action={() => togglePanel(panelId)}
                    />
                );
            })}
        </Menu.Menu>
    );
}, { noop: true });

const ToolbarButtons = ErrorBoundary.wrap(() => {
    const store = settings.use(toolbarCollapsedSettingKeys);
    const anyCollapsed = toolbarPanelOrder.some(panelId => store[panelRegistry[panelId].collapsedKey]);

    return (
        <ChannelToolbarButton
            icon={PanelsIcon}
            tooltip="Collapsible UI"
            aria-label="Collapsible UI"
            selected={anyCollapsed}
            onClick={openToolbarMenu}
            onContextMenu={openToolbarMenu}
        />
    );
}, { noop: true });

const CollapsedMenuButton = ErrorBoundary.wrap(() => (
    <Clickable
        className={cl("restore-button")}
        role="button"
        tabIndex={0}
        aria-label="Collapsible UI"
        onClick={openToolbarMenu}
        onContextMenu={openToolbarMenu}
    >
        <PanelsIcon width={18} height={18} />
    </Clickable>
), { noop: true });

const ChatButtonsRow = ErrorBoundary.wrap(({ buttons }: { buttons: ReactNode[]; }) => {
    const chatButtonsCollapsed = usePanelCollapsed("chatButtons");

    if (buttons.length === 0) return <>{buttons}</>;

    return (
        <div className={classes(cl("chat-buttons"), chatButtonsCollapsed && cl("chat-buttons-collapsed"))}>
            <div className={cl("chat-buttons-items")}>
                {buttons}
            </div>
            <CollapsedMenuButton />
        </div>
    );
}, { noop: true });

export default definePlugin({
    name: "CollapsibleUI",
    description: "Native collapsible channel, member, chat button, and user area surfaces.",
    tags: ["Appearance", "Customisation", "Chat", "Servers"],
    dependencies: ["HeaderBarAPI", "ChatInputButtonAPI", "SurfaceClassesAPI"],
    authors: [Devs.benjii],
    searchTerms: ["ui", "sidebar", "collapsible"],
    managedStyle,
    settings,

    headerBarButton: {
        icon: PanelsIcon,
        location: "channeltoolbar",
        priority: 25,
        render: () => <ToolbarButtons />,
    },

    chatBarButtonWrapper: {
        wrapper: (buttons: ReactNode) => {
            if (!Array.isArray(buttons) || buttons.length === 0) return buttons;
            return <ChatButtonsRow buttons={buttons} />;
        },
        priority: 0,
    },

    isPanelCollapsed,

    usePanelCollapsed,

    setPanelCollapsed,

    flux: {
        CHANNEL_SELECT() {
            notifySurfaceClassesChanged("sidebar");
            notifySurfaceClassesChanged("userArea");
        },
        GUILD_SELECT() {
            notifySurfaceClassesChanged("sidebar");
            notifySurfaceClassesChanged("userArea");
        },
    },

    start() {
        const panelAttr = (classId: string, collapsed: boolean): SurfaceProvidedProps => {
            if (!collapsed) return {};

            return {
                [`data-vc-collapsible-ui-${classId}`]: "",
                [`data-vc-collapsible-ui-${classId}-collapsed`]: "",
            } as SurfaceProvidedProps;
        };

        providerUnsubs = [
            addSurfacePropsProvider("guildBar", () => panelAttr(panelRegistry.guildBar.classId, isPanelCollapsed("guildBar"))),
            addSurfacePropsProvider("channelList", () => {
                const attrs: SurfaceProvidedProps = panelAttr(panelRegistry.channelList.classId, isPanelCollapsed("channelList"));
                attrs.ref = setChannelListElement;
                return attrs;
            }),
            addSurfacePropsProvider("membersList", () => panelAttr(panelRegistry.membersList.classId, isPanelCollapsed("membersList"))),
            addSurfacePropsProvider("titleBar", () => panelAttr(panelRegistry.titleBar.classId, isPanelCollapsed("titleBar"))),
            addSurfacePropsProvider("headerBar", () => {
                const collapsed = isPanelCollapsed("headerBar");
                const attrs: SurfaceProvidedProps = panelAttr(panelRegistry.headerBar.classId, collapsed);
                if (collapsed && headerBarExpandedByInteraction) {
                    attrs["data-vc-collapsible-ui-header-bar-interaction-expanded"] = "";
                }
                attrs.onFocusCapture = () => {
                    if (isPanelCollapsed("headerBar")) setHeaderBarExpandedByInteraction(true);
                };
                attrs.onBlurCapture = event => {
                    if (containsRelatedTarget(event)) return;
                    if (isPanelCollapsed("headerBar")) setHeaderBarExpandedByInteraction(false);
                };
                return attrs;
            }),
            addSurfacePropsProvider("userArea", () => {
                const uaCollapsed = isPanelCollapsed("userArea");
                const clCollapsed = isPanelCollapsed("channelList");
                const gbCollapsed = isPanelCollapsed("guildBar");
                const attrs: SurfaceProvidedProps = panelAttr(panelRegistry.userArea.classId, uaCollapsed);
                attrs.ref = setUserAreaElement;
                if (!uaCollapsed && (clCollapsed || gbCollapsed)) {
                    attrs["data-vc-collapsible-ui-user-area"] = "";
                    attrs["data-vc-collapsible-ui-user-area-sidebar-collapsed"] = "";
                }
                if (shouldDetachUserArea()) {
                    const position = getDetachedUserAreaPosition();
                    attrs["data-vc-collapsible-ui-user-area"] = "";
                    attrs["data-vc-collapsible-ui-user-area-detached"] = "";
                    attrs.style = {
                        left: position.x,
                        top: position.y,
                    };
                    attrs.onMouseDownCapture = startDetachedUserAreaDrag;
                }
                if (uaCollapsed && clCollapsed) {
                    attrs["data-vc-collapsible-ui-user-area-channel-list-collapsed"] = "";
                }
                if (uaCollapsed && gbCollapsed) {
                    attrs["data-vc-collapsible-ui-user-area-guild-bar-collapsed"] = "";
                }
                return attrs;
            }),
            addSurfacePropsProvider("base", () => {
                const channelListCollapsed = isPanelCollapsed("channelList");
                const headerBarCollapsed = isPanelCollapsed("headerBar");
                return {
                    ...(channelListCollapsed || headerBarCollapsed ? { "data-vc-collapsible-ui-base": "" } : {}),
                    ...(channelListCollapsed ? { "data-vc-collapsible-ui-base-channel-list-collapsed": "" } : {}),
                    ...(channelListCollapsed && channelListExpandedByInteraction ? { "data-vc-collapsible-ui-base-channel-list-interaction-expanded": "" } : {}),
                    ...(headerBarCollapsed && !headerBarExpandedByInteraction ? { "data-vc-collapsible-ui-base-header-bar-collapsed": "" } : {}),
                    ...(headerBarCollapsed && headerBarExpandedByInteraction ? { "data-vc-collapsible-ui-base-header-bar-expanded": "" } : {}),
                } as SurfaceProvidedProps;
            }),
            addSurfacePropsProvider("sidebar", () => {
                const collapsed = isPanelCollapsed("channelList");
                const userAreaDetached = shouldDetachUserArea();
                return {
                    ...(collapsed ? {
                        "data-vc-collapsible-ui-sidebar": "",
                        "data-vc-collapsible-ui-sidebar-channel-list-collapsed": "",
                    } : {}),
                    ...(collapsed && channelListExpandedByInteraction ? {
                        "data-vc-collapsible-ui-sidebar-channel-list-expanded": "",
                    } : {}),
                    ...(userAreaDetached ? {
                        "data-vc-collapsible-ui-sidebar": "",
                        "data-vc-collapsible-ui-sidebar-user-area-detached": "",
                    } : {}),
                    onFocusCapture: event => {
                        if (isUserAreaEvent(event)) {
                            setChannelListExpandedByInteraction(false);
                            return;
                        }
                        if (isPanelCollapsed("channelList") && isChannelListEvent(event)) setChannelListExpandedByInteraction(true);
                    },
                    onBlurCapture: event => {
                        if (isUserAreaNode(event.relatedTarget)) {
                            setChannelListExpandedByInteraction(false);
                            return;
                        }
                        if (containsRelatedTarget(event)) return;
                        if (isPanelCollapsed("channelList")) setChannelListExpandedByInteraction(false);
                    },
                    onMouseOverCapture: event => {
                        if (isUserAreaEvent(event)) {
                            setChannelListExpandedByInteraction(false);
                            return;
                        }
                        if (isPanelCollapsed("channelList") && isChannelListEvent(event)) setChannelListExpandedByInteraction(true);
                    },
                    onMouseOutCapture: event => {
                        if (isUserAreaNode(event.relatedTarget)) {
                            setChannelListExpandedByInteraction(false);
                            return;
                        }
                        if (containsRelatedTarget(event)) return;
                        if (isPanelCollapsed("channelList")) setChannelListExpandedByInteraction(false);
                    },
                } as SurfaceProvidedProps;
            }),
        ];

        setCollapseSettingChangeHandler(syncPanelCollapsedState);
        setUserAreaDetachSettingChangeHandler(syncUserAreaDetachState);
        syncAllPanelCollapsedStates();
    },

    stop() {
        setCollapseSettingChangeHandler(undefined);
        setUserAreaDetachSettingChangeHandler(undefined);
        stopDetachedUserAreaDrag();
        providerUnsubs.forEach(unsub => unsub());
        providerUnsubs = [];
        setHeaderBarPointerTrackerEnabled(false);
        channelListElement = null;
        userAreaElement = null;
        channelListExpandedByInteraction = false;
        headerBarExpandedByInteraction = false;
    },
});
