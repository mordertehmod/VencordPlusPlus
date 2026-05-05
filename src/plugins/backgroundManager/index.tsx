/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Ported from BackgroundManager by Narukami
// Original: https://github.com/Naru-kami/BackgroundManager-plugin

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { clear, createStore, del, entries, set } from "@api/DataStore";
import { HeaderBarButton } from "@api/HeaderBar";
import { definePluginSettings, Settings as AppSettings, useSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Switch } from "@components/Switch";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { chooseFile } from "@utils/web";
import type { Message } from "@vencord/discord-types";
import { Alerts, Dialog, Menu, Popout, ThemeStore, Toasts, Tooltip, useCallback, useEffect, useRef, useState } from "@webpack/common";
import type { SVGProps } from "react";

const cl = classNameFactory("vc-bgmanager-");
const imageStore = createStore("BackgroundManager", "ImageStore");
const SLIDESHOW_INTERVAL_MS = 5 * 60 * 1000;
const THEME_BACKGROUND_PROP_RE = /background|bg|wallpaper|backdrop/i;
const THEME_IMAGE_PROP_RE = /image|img/i;

type MediaKind = "image" | "video";
type ThemeMode = "light" | "dark";

interface StoredMedia {
    blob: Blob;
    width: number;
    height: number;
    selected: boolean;
    kind: MediaKind;
}

interface MediaItem extends StoredMedia {
    id: number;
    src: string;
}

interface ThemeCssTarget {
    property: string;
    selector: string;
}

interface PendingMetadataRequest {
    blob: Blob;
    kind: MediaKind;
    resolve: (metadata: Omit<MediaItem, "id" | "selected"> | null) => void;
    src: string;
}

interface ImageContextProps {
    src?: string;
}

type MessageContextTarget =
    Pick<HTMLElement, "dataset" | "tagName">
    & Partial<Pick<HTMLAnchorElement, "href">>
    & Partial<Pick<HTMLMediaElement, "currentSrc" | "src">>;

interface MessageContextProps {
    mediaItem?: {
        contentType?: string;
        url?: string;
    };
    message?: Message;
    target?: MessageContextTarget;
}

type RuleWithChildren = CSSRule & {
    cssRules?: CSSRuleList;
};

let mediaItems: MediaItem[] = [];
let activeLayerIdx = 0;
let currentMedia: MediaItem | null = null;
let layerMedia: [MediaItem | null, MediaItem | null] = [null, null];
let slideshowTimer: ReturnType<typeof setInterval> | null = null;
let visCleanup: (() => void) | null = null;
let pendingMetadataRequests: PendingMetadataRequest[] = [];

const uiListeners = new Set<() => void>();
const metadataListeners = new Set<() => void>();
const themeCssTargetCache = new Map<string, ThemeCssTarget[]>();

function notifyUI() {
    uiListeners.forEach(listener => listener());
}

function notifyMetadataListeners() {
    metadataListeners.forEach(listener => listener());
}

function showFailureToast(message: string) {
    Toasts.show({
        id: Toasts.genId(),
        message,
        type: Toasts.Type.FAILURE
    });
}

function showSuccessToast(message: string) {
    Toasts.show({
        id: Toasts.genId(),
        message,
        type: Toasts.Type.SUCCESS
    });
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

function inferMediaKind(blob: Blob): MediaKind | null {
    if (blob.type.startsWith("image/")) return "image";
    if (blob.type === "video/mp4") return "video";
    return null;
}

function queueMetadataRequest(blob: Blob, kind: MediaKind) {
    return new Promise<Omit<MediaItem, "id" | "selected"> | null>(resolve => {
        pendingMetadataRequests.push({
            blob,
            kind,
            resolve,
            src: URL.createObjectURL(blob)
        });
        notifyMetadataListeners();
    });
}

function settleMetadataRequest(metadata: Omit<MediaItem, "id" | "selected"> | null) {
    const request = pendingMetadataRequests.shift();
    if (!request) return;

    if (!metadata) {
        URL.revokeObjectURL(request.src);
    }

    request.resolve(metadata);
    notifyMetadataListeners();
}

function clearMetadataRequests() {
    for (const request of pendingMetadataRequests) {
        URL.revokeObjectURL(request.src);
        request.resolve(null);
    }

    pendingMetadataRequests = [];
    notifyMetadataListeners();
}

async function loadFromDB(): Promise<MediaItem[]> {
    try {
        const all = await entries<number, StoredMedia>(imageStore);
        return all
            .filter(([id]) => typeof id === "number")
            .sort(([left], [right]) => left - right)
            .map(([id, item]) => ({
                ...item,
                kind: item.kind ?? inferMediaKind(item.blob) ?? "image",
                id,
                src: URL.createObjectURL(item.blob)
            }));
    } catch {
        return [];
    }
}

async function saveMediaToDB(id: number, data: StoredMedia) {
    await set(id, data, imageStore);
}

async function deleteMediaFromDB(id: number) {
    await del(id, imageStore);
}

async function readMediaMetadata(blob: Blob): Promise<Omit<MediaItem, "id" | "selected"> | null> {
    const kind = inferMediaKind(blob);
    if (!kind) return null;

    return queueMetadataRequest(blob, kind);
}

async function addMedia(blob: Blob): Promise<MediaItem | null> {
    const metadata = await readMediaMetadata(blob);
    if (!metadata) return null;

    const nextId = mediaItems.length > 0 ? Math.max(...mediaItems.map(item => item.id)) + 1 : 0;
    const item: MediaItem = {
        id: nextId,
        selected: false,
        ...metadata
    };

    mediaItems.push(item);
    await saveMediaToDB(nextId, {
        blob,
        width: metadata.width,
        height: metadata.height,
        selected: false,
        kind: metadata.kind
    });
    notifyUI();
    return item;
}

function removeMedia(id: number) {
    const media = mediaItems.find(item => item.id === id);
    if (!media) return;

    URL.revokeObjectURL(media.src);
    if (media.selected) removeBackground();
    mediaItems = mediaItems.filter(item => item.id !== id);
    void deleteMediaFromDB(id);
    notifyUI();
}

async function selectMedia(id: number) {
    for (const media of mediaItems) {
        const wasSelected = media.selected;
        media.selected = media.id === id;
        if (wasSelected === media.selected) continue;

        await saveMediaToDB(media.id, {
            blob: media.blob,
            width: media.width,
            height: media.height,
            selected: media.selected,
            kind: media.kind
        });
    }

    const selectedMedia = mediaItems.find(item => item.selected);
    if (selectedMedia) setBackground(selectedMedia);
    notifyUI();
}

function deselectAll() {
    mediaItems.forEach(media => {
        media.selected = false;
        void saveMediaToDB(media.id, {
            blob: media.blob,
            width: media.width,
            height: media.height,
            selected: false,
            kind: media.kind
        });
    });

    removeBackground();
    notifyUI();
}

function setBackground(media: MediaItem) {
    currentMedia = media;
    if (document.visibilityState === "visible") activeLayerIdx ^= 1;
    layerMedia[activeLayerIdx] = media;
    notifyUI();
}

function removeBackground() {
    currentMedia = null;
    layerMedia = [null, null];
    activeLayerIdx = 0;
    notifyUI();
}

function getThemeMode(): ThemeMode | undefined {
    if (!ThemeStore) return undefined;
    return ThemeStore.theme === "light" ? "light" : "dark";
}

function getThemeCssSignature(
    enabledThemes: readonly string[],
    enabledThemeLinks: readonly string[],
    useQuickCss: boolean,
    themeMode: ThemeMode | undefined
) {
    return [
        themeMode ?? "unknown",
        String(useQuickCss),
        ...enabledThemes,
        "",
        ...enabledThemeLinks
    ].join("\0");
}

function resolveThemeLink(rawLink: string, themeMode: ThemeMode | undefined) {
    const match = /^@(light|dark) (.*)/.exec(rawLink);
    if (!match) return rawLink;

    const [, mode, link] = match;
    return mode === themeMode ? link : null;
}

async function fetchCssSource(url: string) {
    try {
        const response = await fetch(url);
        if (!response.ok) return "";
        return await response.text();
    } catch {
        return "";
    }
}

async function resolveCssImports(css: string, baseUrl?: string, seen = new Set<string>()) {
    if (!baseUrl) return css;

    const imports = Array.from(css.matchAll(/@import\s+(?:url\(\s*)?(?:(["'])(.*?)\1|([^"')\s;]+))\s*\)?[^;]*;/gi));
    if (imports.length === 0) return css;

    let resolvedCss = "";
    let lastIndex = 0;

    for (const match of imports) {
        const index = match.index ?? 0;
        resolvedCss += css.slice(lastIndex, index);
        lastIndex = index + match[0].length;

        const specifier = match[2] ?? match[3];
        if (!specifier) continue;

        let importUrl: string;
        try {
            importUrl = new URL(specifier, baseUrl).toString();
        } catch {
            continue;
        }

        if (seen.has(importUrl)) continue;
        seen.add(importUrl);

        const importedCss = await fetchCssSource(importUrl);
        if (!importedCss) continue;

        resolvedCss += await resolveCssImports(importedCss, importUrl, seen);
    }

    resolvedCss += css.slice(lastIndex);
    return resolvedCss;
}

async function loadThemeCssSources(
    enabledThemes: readonly string[],
    enabledThemeLinks: readonly string[],
    useQuickCss: boolean,
    themeMode: ThemeMode | undefined
) {
    const cssSources: string[] = [];

    if (useQuickCss) {
        const quickCss = await VencordNative.quickCss.get();
        if (quickCss.trim().length > 0) {
            cssSources.push(quickCss);
        }
    }

    const resolvedThemeLinks = enabledThemeLinks
        .map(link => resolveThemeLink(link, themeMode))
        .filter((link): link is string => link != null);

    const onlineThemes = await Promise.all(resolvedThemeLinks.map(async link => {
        const css = await fetchCssSource(link);
        if (!css) return "";
        return resolveCssImports(css, link, new Set([link]));
    }));

    cssSources.push(...onlineThemes.filter(css => css.length > 0));

    if (IS_WEB) {
        const localThemes = await Promise.all(enabledThemes.map(theme => VencordNative.themes.getThemeData(theme)));
        cssSources.push(...localThemes.filter((css): css is string => !!css && css.trim().length > 0));
        return cssSources;
    }

    const localThemes = await Promise.all(enabledThemes.map(async theme => {
        const themeUrl = `vencord:///themes/${theme}?v=${Date.now()}`;
        const css = await fetchCssSource(themeUrl);
        if (!css) return "";
        return resolveCssImports(css, themeUrl, new Set([themeUrl]));
    }));

    cssSources.push(...localThemes.filter(css => css.length > 0));
    return cssSources;
}

function getStyleProperties(style: CSSStyleDeclaration) {
    return Array.from({ length: style.length }, (_, index) => style.item(index));
}

function pickThemeCssTargets(targets: Map<string, ThemeCssTarget>) {
    const properties = Array.from(targets.keys());
    const selectedProperty = properties.length === 1
        ? properties[0]
        : properties.find(property => THEME_BACKGROUND_PROP_RE.test(property))
        ?? properties.find(property => THEME_IMAGE_PROP_RE.test(property));

    return selectedProperty ? [targets.get(selectedProperty)!] : [];
}

function collectThemeCssTargets(rules: CSSRuleList, targets: Map<string, ThemeCssTarget>) {
    for (const rule of Array.from(rules)) {
        if (rule instanceof CSSStyleRule) {
            for (const property of getStyleProperties(rule.style)) {
                const value = rule.style.getPropertyValue(property).trim();
                if (!property.startsWith("--") || !value.startsWith("url")) continue;

                targets.set(property, {
                    property,
                    selector: rule.selectorText ?? ":root"
                });
            }
            continue;
        }

        const nestedRules = (rule as RuleWithChildren).cssRules;
        if (nestedRules) collectThemeCssTargets(nestedRules, targets);
    }
}

function parseThemeCssTargetsFromText(css: string) {
    const targets = new Map<string, ThemeCssTarget>();

    for (const block of css.matchAll(/([^{}]+)\{([^{}]+)\}/g)) {
        const trimmedSelector = block[1].trim();
        const selector = trimmedSelector.length > 0 ? trimmedSelector : ":root";

        for (const declaration of block[2].matchAll(/(--[A-Za-z0-9_-]+)\s*:\s*url\([^;]+?\)/g)) {
            const property = declaration[1];
            targets.set(property, { property, selector });
        }
    }

    return pickThemeCssTargets(targets);
}

async function parseThemeCssTargets(css: string) {
    try {
        const sheet = new CSSStyleSheet();
        await sheet.replace(css);

        const targets = new Map<string, ThemeCssTarget>();
        collectThemeCssTargets(sheet.cssRules, targets);
        return pickThemeCssTargets(targets);
    } catch {
        return parseThemeCssTargetsFromText(css);
    }
}

async function getThemeCssTargets(
    enabledThemes: readonly string[],
    enabledThemeLinks: readonly string[],
    useQuickCss: boolean,
    themeMode: ThemeMode | undefined
) {
    const signature = getThemeCssSignature(enabledThemes, enabledThemeLinks, useQuickCss, themeMode);
    const cachedTargets = themeCssTargetCache.get(signature);
    if (cachedTargets) return cachedTargets;

    const cssSources = await loadThemeCssSources(enabledThemes, enabledThemeLinks, useQuickCss, themeMode);
    const targets = (await Promise.all(cssSources.map(parseThemeCssTargets))).flat();
    themeCssTargetCache.set(signature, targets);
    return targets;
}

function startSlideshow() {
    stopSlideshow();
    if (!settings.store.enableSlideshow || mediaItems.length < 2) return;

    let hidden = false;
    const onVisibilityChange = () => {
        if (document.visibilityState === "visible") hidden = false;
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    visCleanup = () => document.removeEventListener("visibilitychange", onVisibilityChange);
    slideshowTimer = setInterval(() => {
        if (document.visibilityState === "hidden") {
            if (hidden) return;
            hidden = true;
        }

        nextImage();
    }, settings.store.slideshowInterval ?? SLIDESHOW_INTERVAL_MS);
}

function stopSlideshow() {
    if (slideshowTimer) {
        clearInterval(slideshowTimer);
        slideshowTimer = null;
    }

    visCleanup?.();
    visCleanup = null;
}

function nextImage() {
    if (mediaItems.length < 2) return;

    const currentIndex = mediaItems.findIndex(item => item.selected);
    let nextIndex: number;

    if (settings.store.shuffleSlideshow || currentIndex === -1) {
        let attempts = 0;
        do {
            nextIndex = Math.floor(Math.random() * mediaItems.length);
        } while (nextIndex === currentIndex && attempts++ < 25);
    } else {
        nextIndex = (currentIndex + 1) % mediaItems.length;
    }

    void selectMedia(mediaItems[nextIndex].id);
}

function formatSize(bytes: number) {
    const units = ["B", "KiB", "MiB", "GiB"];
    let unitIndex = 0;

    while (bytes >= 1024 && unitIndex < units.length - 1) {
        bytes /= 1024;
        unitIndex++;
    }

    return `${unitIndex > 0 ? bytes.toFixed(1) : String(bytes)} ${units[unitIndex]}`;
}

async function fetchAndAddMedia(src: string) {
    try {
        const url = new URL(src);
        if (url.origin === "https://media.discordapp.net") {
            url.host = "cdn.discordapp.com";
            for (const param of ["size", "width", "height", "quality", "format"]) {
                url.searchParams.delete(param);
            }
        }

        const response = await fetch(url.toString(), { mode: "cors" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const blob = await response.blob();
        const item = await addMedia(blob);
        if (!item) {
            throw new Error("Only images and MP4 videos are supported");
        }

        showSuccessToast("Added to Background Manager");
    } catch (error) {
        showFailureToast(`Failed to add background media: ${getErrorMessage(error)}`);
    }
}

const settings = definePluginSettings({
    enableTransition: {
        type: OptionType.BOOLEAN,
        description: "Enable smooth crossfade transitions between backgrounds.",
        default: true,
        onChange: notifyUI
    },
    transitionDuration: {
        type: OptionType.NUMBER,
        description: "Transition duration in milliseconds.",
        default: 1000,
        onChange: notifyUI
    },
    enableSlideshow: {
        type: OptionType.BOOLEAN,
        description: "Auto-cycle through backgrounds every 5 minutes.",
        default: false,
        onChange: enabled => enabled ? startSlideshow() : stopSlideshow()
    },
    slideshowInterval: {
        type: OptionType.NUMBER,
        description: "Slideshow interval in milliseconds.",
        default: SLIDESHOW_INTERVAL_MS,
        onChange: () => {
            if (settings.store.enableSlideshow) startSlideshow();
        }
    },
    shuffleSlideshow: {
        type: OptionType.BOOLEAN,
        description: "Randomize slideshow order.",
        default: true
    },
    overwriteCSS: {
        type: OptionType.BOOLEAN,
        description: "Auto-detect and overwrite theme background CSS variables.",
        default: true,
        onChange: notifyUI
    },
    xPosition: {
        type: OptionType.SLIDER,
        description: "Horizontal position offset (%).",
        default: 0,
        markers: [-50, -25, 0, 25, 50],
        onChange: notifyUI
    },
    yPosition: {
        type: OptionType.SLIDER,
        description: "Vertical position offset (%).",
        default: 0,
        markers: [-50, -25, 0, 25, 50],
        onChange: notifyUI
    },
    dimming: {
        type: OptionType.SLIDER,
        description: "Background dimming (%).",
        default: 0,
        markers: [0, 25, 50, 75, 100],
        onChange: notifyUI
    },
    blur: {
        type: OptionType.SLIDER,
        description: "Background blur (px).",
        default: 0,
        markers: [0, 25, 50, 75, 100],
        onChange: notifyUI
    },
    grayscale: {
        type: OptionType.SLIDER,
        description: "Grayscale filter (%).",
        default: 0,
        markers: [0, 25, 50, 75, 100],
        onChange: notifyUI
    },
    saturate: {
        type: OptionType.SLIDER,
        description: "Saturation (%).",
        default: 100,
        markers: [0, 50, 100, 200, 300],
        onChange: notifyUI
    },
    contrast: {
        type: OptionType.SLIDER,
        description: "Contrast (%).",
        default: 100,
        markers: [0, 50, 100, 200, 300],
        onChange: notifyUI
    },
    clearDatabase: {
        type: OptionType.COMPONENT,
        description: "Delete all stored background media.",
        component: () => (
            <button
                className={cl("clear-btn")}
                onClick={() => Alerts.show({
                    title: "Delete All Backgrounds",
                    body: "This will permanently delete all stored background media.",
                    confirmColor: "vc-bgmanager-confirm-red",
                    confirmText: "Delete",
                    cancelText: "Cancel",
                    onConfirm: async () => {
                        mediaItems.forEach(media => URL.revokeObjectURL(media.src));
                        mediaItems = [];
                        removeBackground();
                        stopSlideshow();
                        clearMetadataRequests();
                        await clear(imageStore);
                        notifyUI();
                        showSuccessToast("All backgrounds deleted");
                    }
                })}
            >
                Delete All Backgrounds
            </button>
        )
    }
});

const imageCtxPatch: NavContextMenuPatchCallback = (children, { src }: ImageContextProps) => {
    if (!src) return;

    children.push(
        <Menu.MenuSeparator />,
        <Menu.MenuItem
            id="vc-bgmanager-add"
            label="Add to Background Manager"
            action={() => fetchAndAddMedia(src)}
        />
    );
};

const messageCtxPatch: NavContextMenuPatchCallback = (children, props: MessageContextProps) => {
    let src: string | undefined;

    if (props.mediaItem?.contentType?.startsWith("image") || props.mediaItem?.contentType === "video/mp4") {
        src = props.mediaItem.url;
    } else if (props.target?.tagName === "VIDEO") {
        src = props.target.currentSrc ?? props.target.src;
    } else if (props.target?.dataset?.role === "img") {
        src = props.message?.embeds.find(embed => embed.image?.url === props.target?.href)?.image?.proxyURL;
    }

    if (!src) return;

    children.push(
        <Menu.MenuSeparator />,
        <Menu.MenuItem
            id="vc-bgmanager-add"
            label="Add to Background Manager"
            action={() => fetchAndAddMedia(src)}
        />
    );
};

function useMediaItems() {
    const [, update] = useState(0);

    useEffect(() => {
        const listener = () => update(count => count + 1);
        uiListeners.add(listener);
        return () => {
            uiListeners.delete(listener);
        };
    }, []);

    return mediaItems;
}

function usePendingMetadataRequest() {
    const [, update] = useState(0);

    useEffect(() => {
        const listener = () => update(count => count + 1);
        metadataListeners.add(listener);
        return () => {
            metadataListeners.delete(listener);
        };
    }, []);

    return pendingMetadataRequests[0] ?? null;
}

function useThemeMode() {
    const [themeMode, setThemeMode] = useState<ThemeMode | undefined>(() => getThemeMode());

    useEffect(() => {
        if (!ThemeStore) return;

        const updateThemeMode = () => setThemeMode(getThemeMode());
        ThemeStore.addChangeListener(updateThemeMode);
        updateThemeMode();

        return () => {
            ThemeStore.removeChangeListener(updateThemeMode);
        };
    }, []);

    return themeMode;
}

function GalleryIcon(props: SVGProps<SVGSVGElement>) {
    return <svg {...props} viewBox="0 0 24 24" fill="currentColor"><path d="M20 4v12H8V4zm0-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m-8.5 9.67 1.69 2.26 2.48-3.1L19 15H9zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6z" /></svg>;
}

const SvgIcon = ({ d, size = 24 }: { d: string; size?: number; }) =>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d={d} /></svg>;

const ICONS = {
    upload: "M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2m0 12H4V6h5.17l2 2H20zM9.41 14.42 11 12.84V17h2v-4.16l1.59 1.59L16 13.01 12.01 9 8 13.01z",
    remove: "M22 8h-8v-2h8v2zM19 10H12V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zM5 19l3-4 2 3 3-4 4 5H5z",
    del: "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    next: "M5.7 6.71c-.39.39-.39 1.02 0 1.41L9.58 12 5.7 15.88c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l4.59-4.59c.39-.39.39-1.02 0-1.41L7.12 6.71c-.39-.39-1.03-.39-1.42 0M12.29 6.71c-.39.39-.39 1.02 0 1.41L16.17 12l-3.88 3.88c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l4.59-4.59c.39-.39.39-1.02 0-1.41L13.7 6.7c-.38-.38-1.02-.38-1.41.01",
};

function MetadataProbeHost() {
    const request = usePendingMetadataRequest();
    if (!request) return null;

    if (request.kind === "image") {
        return (
            <img
                key={request.src}
                className={cl("probe")}
                src={request.src}
                onLoad={event => settleMetadataRequest({
                    blob: request.blob,
                    kind: request.kind,
                    width: event.currentTarget.naturalWidth,
                    height: event.currentTarget.naturalHeight,
                    src: request.src
                })}
                onError={() => settleMetadataRequest(null)}
            />
        );
    }

    return (
        <video
            key={request.src}
            className={cl("probe")}
            src={request.src}
            muted
            preload="metadata"
            onLoadedMetadata={event => settleMetadataRequest({
                blob: request.blob,
                kind: request.kind,
                width: event.currentTarget.videoWidth,
                height: event.currentTarget.videoHeight,
                src: request.src
            })}
            onError={() => settleMetadataRequest(null)}
        />
    );
}

function BgStyleInjector() {
    const [, update] = useState(0);
    const appSettings = useSettings(["enabledThemes", "enabledThemeLinks", "useQuickCss"]);
    const themeMode = useThemeMode();
    const [themeOverrideCss, setThemeOverrideCss] = useState("");

    useEffect(() => {
        const listener = () => update(count => count + 1);
        uiListeners.add(listener);
        return () => {
            uiListeners.delete(listener);
        };
    }, []);

    const enabledThemesKey = appSettings.enabledThemes.join("\0");
    const enabledThemeLinksKey = appSettings.enabledThemeLinks.join("\0");

    useEffect(() => {
        const media = currentMedia;
        if (!settings.store.overwriteCSS || media?.kind !== "image") {
            setThemeOverrideCss("");
            return;
        }

        let cancelled = false;

        void getThemeCssTargets(
            appSettings.enabledThemes,
            appSettings.enabledThemeLinks,
            appSettings.useQuickCss,
            themeMode
        ).then(targets => {
            if (cancelled) return;

            setThemeOverrideCss(targets.map(({ property, selector }) =>
                `${selector}{${property}:url('${media.src}')!important}`
            ).join("\n"));
        }).catch(() => {
            if (!cancelled) setThemeOverrideCss("");
        });

        return () => {
            cancelled = true;
        };
    }, [
        appSettings.useQuickCss,
        currentMedia?.kind,
        currentMedia?.src,
        enabledThemeLinksKey,
        enabledThemesKey,
        themeMode,
        settings.store.overwriteCSS
    ]);

    const hasLayers = currentMedia != null || layerMedia[0] != null || layerMedia[1] != null;
    if (!hasLayers) return <MetadataProbeHost />;

    const pluginSettings = settings.store;
    const transition = pluginSettings.enableTransition ? pluginSettings.transitionDuration : 0;
    const filterParts = [
        `grayscale(${pluginSettings.grayscale}%)`,
        `contrast(${pluginSettings.contrast}%)`,
        `saturate(${pluginSettings.saturate}%)`
    ];
    if (pluginSettings.blur > 0) {
        filterParts.push(`blur(${pluginSettings.blur}px)`);
    }

    const filter = filterParts.join(" ");
    const backgroundPosition = `calc(50% - ${pluginSettings.xPosition}%) calc(50% - ${pluginSettings.yPosition}%)`;
    const dimming = pluginSettings.dimming / 100;
    const shouldRenderThemeOverride = currentMedia?.kind === "image" && pluginSettings.overwriteCSS;

    return (
        <>
            <MetadataProbeHost />
            {layerMedia.map((media, index) => {
                const isActive = activeLayerIdx === index && currentMedia != null;

                return (
                    <div
                        key={`layer-${index}-${media?.id ?? "empty"}`}
                        className={cl("layer", `layer-${index}`)}
                        style={{
                            opacity: isActive ? 1 : 0,
                            transition: `opacity ${transition}ms ease-out`
                        }}
                    >
                        {media?.kind === "image" && (
                            <div
                                className={cl("layer-image")}
                                style={{
                                    backgroundImage: `url(${media.src})`,
                                    backgroundPosition,
                                    filter
                                }}
                            />
                        )}
                        {media?.kind === "video" && (
                            <video
                                key={media.src}
                                className={cl("layer-video")}
                                src={media.src}
                                autoPlay
                                loop
                                muted
                                playsInline
                                style={{
                                    filter,
                                    objectPosition: backgroundPosition
                                }}
                            />
                        )}
                        {media && dimming > 0 && (
                            <div
                                className={cl("layer-dim")}
                                style={{ opacity: dimming }}
                            />
                        )}
                    </div>
                );
            })}
            {shouldRenderThemeOverride && themeOverrideCss && <style>{themeOverrideCss}</style>}
        </>
    );
}

function MediaThumbnail({ media }: { media: MediaItem; }) {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    return (
        <button
            className={classes(cl("thumb"), media.selected && cl("selected"))}
            onClick={() => {
                void selectMedia(media.id);
                if (settings.store.enableSlideshow) startSlideshow();
            }}
        >
            {!loaded && !error && <span className={cl("thumb-loading")}>Loading...</span>}
            {error && <span className={cl("thumb-error")}>Error</span>}
            {!error && media.kind === "image" && (
                <img
                    className={loaded ? undefined : cl("hidden")}
                    src={media.src}
                    onLoad={() => setLoaded(true)}
                    onError={() => setError(true)}
                />
            )}
            {!error && media.kind === "video" && (
                <video
                    className={loaded ? undefined : cl("hidden")}
                    src={media.src}
                    muted
                    loop
                    playsInline
                    autoPlay
                    onLoadedData={() => setLoaded(true)}
                    onError={() => setError(true)}
                />
            )}
            <div className={cl("thumb-info")}>
                <span>{formatSize(media.blob.size)}</span>
                {media.width > 0 && media.height > 0 && <span>{media.width}x{media.height}</span>}
            </div>
            <button
                className={cl("delete")}
                onClick={event => {
                    event.stopPropagation();
                    removeMedia(media.id);
                }}
            >
                <SvgIcon d={ICONS.del} size={16} />
            </button>
        </button>
    );
}

function ManagerPopout() {
    const storedMedia = useMediaItems();
    const totalSize = storedMedia.reduce((size, item) => size + item.blob.size, 0);

    const handleFile = useCallback(async (blob: Blob) => {
        try {
            const item = await addMedia(blob);
            if (item) return;

            showFailureToast("Only images and MP4 videos are supported");
        } catch (error) {
            showFailureToast(`Failed to add background media: ${getErrorMessage(error)}`);
        }
    }, []);

    const handleUpload = useCallback(async () => {
        const files = await chooseFile("image/*,video/mp4");
        if (!files) return;

        const selectedFiles = Array.isArray(files) ? files : [files];
        await Promise.all(selectedFiles.map(handleFile));
    }, [handleFile]);

    const toggleSlideshow = useCallback((enabled: boolean) => {
        settings.store.slideshowInterval = SLIDESHOW_INTERVAL_MS;
        settings.store.enableSlideshow = enabled;
        if (enabled) {
            startSlideshow();
        } else {
            stopSlideshow();
        }

        notifyUI();
    }, []);

    return (
        <Dialog className={cl("popout")}>
            <div className={cl("content")}>
                <div className={cl("title-row")}>
                    <span className={cl("title")}>Background Manager</span>
                    {storedMedia.length > 0 && <span className={cl("summary")}>Total: {formatSize(totalSize)}</span>}
                </div>
                <div className={cl("input-row")}>
                    <div className={cl("slideshow-control")}>
                        <div className={cl("slideshow-meta")}>
                            <span className={cl("slideshow-label")}>Slideshow</span>
                            <span className={cl("slideshow-note")}>Every 5 minutes</span>
                        </div>
                        <Switch checked={settings.store.enableSlideshow} onChange={toggleSlideshow} />
                    </div>
                    <Tooltip text="Upload Backgrounds">
                        {tooltipProps => (
                            <button {...tooltipProps} className={cl("btn", "btn-upload")} onClick={handleUpload}>
                                <SvgIcon d={ICONS.upload} />
                            </button>
                        )}
                    </Tooltip>
                    <Tooltip text="Remove Background">
                        {tooltipProps => (
                            <button {...tooltipProps} className={cl("btn", "btn-remove")} onClick={deselectAll}>
                                <SvgIcon d={ICONS.remove} />
                            </button>
                        )}
                    </Tooltip>
                </div>
                {storedMedia.length > 0 && settings.store.enableSlideshow && storedMedia.length >= 2 && (
                    <div className={cl("info")}>
                        <span>Every 5 minutes</span>
                        <Tooltip text="Next Background">
                            {tooltipProps => (
                                <button {...tooltipProps} className={cl("btn", "btn-next")} onClick={nextImage}>
                                    <SvgIcon d={ICONS.next} size={18} />
                                </button>
                            )}
                        </Tooltip>
                    </div>
                )}
                <div className={cl("grid")}>
                    {storedMedia.map(media => <MediaThumbnail key={media.id} media={media} />)}
                </div>
            </div>
        </Dialog>
    );
}

function BgManagerHeaderButton() {
    const buttonRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Popout
            position="bottom"
            align="right"
            spacing={8}
            animation={Popout.Animation.NONE}
            shouldShow={isOpen}
            onRequestClose={() => setIsOpen(false)}
            targetElementRef={buttonRef}
            renderPopout={() => <ErrorBoundary><ManagerPopout /></ErrorBoundary>}
        >
            {(_, { isShown }) => (
                <HeaderBarButton
                    ref={buttonRef}
                    icon={GalleryIcon}
                    tooltip={isShown ? null : "Background Manager"}
                    onClick={() => setIsOpen(open => !open)}
                    selected={isShown}
                />
            )}
        </Popout>
    );
}

export default definePlugin({
    name: "BackgroundManager",
    description: "Manage custom background images and MP4 videos with slideshow, transitions, and adjustments. Originally by Narukami.",
    authors: [Devs.benjii],
    settings,

    patches: [
        {
            find: "this.renderArtisanalHack()",
            replacement: {
                match: /children:(\i)=>\(0,(\i)\.jsx\)\("div",\{className:(\i)\(\)\((\i)\.bg,\1\)\}\)/,
                replace: 'children:$1=>(0,$2.jsxs)("div",{className:$3()($4.bg,$1,$self.getHostClass()),children:[$self.renderBgStyles()]})'
            }
        }
    ],

    contextMenus: {
        "image-context": imageCtxPatch,
        message: messageCtxPatch,
    },

    headerBarButton: {
        icon: GalleryIcon,
        render: BgManagerHeaderButton,
    },

    getHostClass() {
        return cl("host");
    },

    renderBgStyles() {
        return <BgStyleInjector />;
    },

    async start() {
        mediaItems = await loadFromDB();
        themeCssTargetCache.clear();

        if (settings.store.overwriteCSS) {
            void getThemeCssTargets(
                AppSettings.enabledThemes,
                AppSettings.enabledThemeLinks,
                AppSettings.useQuickCss,
                getThemeMode()
            );
        }

        const selectedMedia = mediaItems.find(item => item.selected);
        if (selectedMedia) setBackground(selectedMedia);
        if (settings.store.enableSlideshow) startSlideshow();
    },

    stop() {
        stopSlideshow();
        removeBackground();
        clearMetadataRequests();
        themeCssTargetCache.clear();
        mediaItems.forEach(media => URL.revokeObjectURL(media.src));
        mediaItems = [];
    }
});
