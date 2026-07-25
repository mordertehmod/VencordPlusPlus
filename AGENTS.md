# Agent Documentation for Equicord Development

This guide explains how to effectively use Claude Code agents when working on the Equicord/VencordPlusPlus codebase.

## Overview

Claude Code agents are AI assistants that help with software development tasks. When working on this codebase, agents follow the development guidelines specified in [CLAUDE.md](./CLAUDE.md) (also available as `.rules`).

## Quick Start

### Common Agent Tasks

**Plugin Development:**
```
Create a new plugin called [PluginName] that [description]
```

**Bug Fixes:**
```
Fix the issue in [plugin/component] where [description of bug]
```

**Code Exploration:**
```
Find all places where [feature/API] is used
Show me how [feature] is implemented
```

**Refactoring:**
```
Refactor [component/function] to [improvement]
```

## Key Guidelines for Agents

### Critical Rules

When working with agents on this codebase, ensure they follow these principles:

1. **Minimal Changes**: Agents should make the smallest possible changes to fix issues or implement features.
2. **No Over-engineering**: Avoid premature abstractions. Three similar lines are better than a premature abstraction.
3. **Follow Existing Patterns**: Use existing utilities from `@utils/`, `@api/`, and `@components/`.
4. **Modern TypeScript**: Use optional chaining (`?.`), nullish coalescing (`??`), and proper types from `@vencord/discord-types`.
5. **No Raw DOM**: Always use webpack patches and React, never raw DOM manipulation.

### Plugin Development Best Practices

**Creating a New Plugin:**

1. Use the existing plugin structure in `src/plugins/`
2. Import types from `@vencord/discord-types` (never use `any` for Discord objects)
3. Use `definePluginSettings` from `@api/Settings`
4. Use `classNameFactory` from `@utils/css` for styling
5. Wrap complex components with `ErrorBoundary.wrap(Component, { noop: true })`

**Example Plugin Structure:**
```ts
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

const settings = definePluginSettings({
    // settings here
});

export default definePlugin({
    name: "PluginName",
    description: "Plugin description.",
    authors: [Devs.YourName],
    settings,
    // patches, components, etc.
});
```

### Webpack Patching

Agents working on patches should follow these rules:

**Do:**
- Use `#{intl::KEY}` for stable anchors in find strings
- Use bounded gaps like `.{0,50}` instead of `.+?` or `.*?`
- Match only what needs to be replaced
- Use `$&` to keep original content when appending/prepending

**Don't:**
- Hardcode minified variables (`e,t,n,r`) - use `\i` instead
- Use unbounded gaps (`.+?` or `.*?`)
- Use generic patterns without anchors
- Use raw intl hashes - use `#{intl::KEY_NAME}` instead

**Example Patch:**
```js
{
    find: "#{intl::PIN_MESSAGE}),icon:",
    replacement: {
        match: /#{intl::PIN_MESSAGE}\)/,
        replace: "$self.getPinLabel(arguments[0]))"
    }
}
```

### Common Utilities Reference

Agents should use these utilities instead of implementing their own:

**Discord Utils** (`@utils/discord`):
- `getCurrentChannel()`, `getCurrentGuild()`
- `openUserProfile()`, `openPrivateChannel()`
- `insertTextIntoChatInputBox()`, `sendMessage()`
- `getUniqueUsername()`, `fetchUserProfile()`

**Text Utils** (`@utils/text`):
- `formatDuration()`, `humanFriendlyJoin()`
- `makeCodeblock()`, `toInlineCode()`

**CSS Utils** (`@utils/css`):
- `classNameFactory()` - Always use for class names

**Misc Utils** (`@utils/misc`):
- `classes()` - Use for combining class names (not template strings)
- `sleep()`, `isObject()`, `pluralise()`

**Logger** (`@utils/Logger`):
- Use instead of `console.log/warn/error`

### React Guidelines

**Do:**
- Return `null` for conditional rendering (not `undefined`)
- Always return cleanup functions in `useEffect`
- Use `ErrorBoundary.wrap()` for complex components

**Don't:**
- Use `React.memo()`, `React.lazy`, `React.Children`
- Use `React.cloneElement` or `React.isValidElement`

### TypeScript Best Practices

**Preferred Patterns:**
- `value != null` instead of `value !== null && value !== undefined`
- `value ?? defaultValue` instead of `value || defaultValue`
- `array.length` instead of `array && array.length > 0` (when array is guaranteed)
- Early returns and guard clauses over deep nesting

### Forbidden Practices

Agents must never:

1. **Selfbot/API Abuse**: No automation of user actions or API abuse
2. **CSS-only Plugins**: No plugins that only hide/redesign UI
3. **Third-party Bot Plugins**: No plugins targeting specific third-party bots
4. **Untrusted APIs**: No plugins requiring user-supplied API keys
5. **Raw DOM Manipulation**: Use webpack patches and React instead
6. **Hardcoded URLs**: Use `IconUtils` from `@webpack/common` for Discord CDN URLs

## Testing and Validation

### Before Submitting Changes

Agents should:

1. **Build the project**: `pnpm build` or `pnpm watch`
2. **Run linters**: `pnpm lint` and `pnpm lint:fix`
3. **Test in Discord**: Verify the changes work in the actual Discord client
4. **Check for errors**: Look for console errors or warnings

### Plugin Testing Checklist

- [ ] Plugin loads without errors
- [ ] Settings save and load correctly
- [ ] Patches apply without breaking Discord
- [ ] UI components render properly
- [ ] No console errors or warnings
- [ ] Works with other plugins enabled

## Common Scenarios

### Scenario 1: Adding a New Feature to an Existing Plugin

```
I need to add [feature] to the [PluginName] plugin.
The feature should [description].
Please follow the existing code style and use the utilities from @utils/.
```

### Scenario 2: Fixing a Patch That Broke

```
The [PluginName] plugin patch is broken after a Discord update.
The patch was matching [old pattern] but now needs to match [new pattern].
Please update the patch to work with the latest Discord version.
```

### Scenario 3: Creating a New Utility Function

```
I need a utility function that [description].
Please add it to the appropriate file in src/utils/
and follow the existing patterns in that file.
```

## Plugin Interop

When one plugin needs to interact with another:

```ts
import { isPluginEnabled } from "@api/PluginManager";
import otherPlugin from "@plugins/otherPlugin";

if (!isPluginEnabled(otherPlugin.name)) return null;
otherPlugin.someFunction();
```

**Don't** use:
- `Vencord.Plugins.plugins`
- `plugin.started`
- `"as unknown as"` casting

## Resources

- **Development Guidelines**: See [CLAUDE.md](./CLAUDE.md) for complete coding standards
- **Contributing**: See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines
- **Discord Types**: Import from `@vencord/discord-types`
- **Webpack Common**: Import stores, components, and utils from `@webpack/common`

## Getting Help

If an agent encounters issues:

1. Check the development guidelines in CLAUDE.md
2. Look for similar implementations in existing plugins
3. Verify that dependencies and types are correctly imported
4. Ensure the build process completes without errors
5. Test changes in a development build before submitting

---

Remember: The goal is to make **minimal, focused changes** that solve the specific problem at hand. Agents should avoid refactoring, adding comments (unless requested), or making changes beyond what's necessary for the task.
