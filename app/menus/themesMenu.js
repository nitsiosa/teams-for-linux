const {
  BUILTIN_THEMES,
  DEFAULT_THEME_ID,
  NO_THEME,
} = require("../customCSS/themes");

module.exports = function buildThemesMenu(Menus) {
  const customThemes = Menus.configGroup.customThemes ?? [];
  const selection = Menus.configGroup.themeSelection ?? {
    cssName: Menus.configGroup.startupConfig.customCSSName ?? "",
    cssLocation: Menus.configGroup.startupConfig.customCSSLocation ?? "",
  };
  const available = [...BUILTIN_THEMES, NO_THEME, ...customThemes];
  const knownSelection = available.some((theme) => theme.value === selection.cssName);
  const usingDirectCss = !selection.cssName && Boolean(selection.cssLocation);
  const effectiveSelection = selection.cssName ||
    (usingDirectCss ? "" : DEFAULT_THEME_ID);
  const themeItem = (theme) => ({
    // Theme metadata is text, including literal ampersands, not a mnemonic.
    label: theme.name.replaceAll("&", "&&"),
    // Radio groups are independent in nested native menus and auto-check
    // their first item. Controlled checkboxes show one selection across groups.
    type: "checkbox",
    checked: effectiveSelection === theme.value,
    click: () => Menus.selectTheme(theme.value),
  });
  const otherBuiltins = BUILTIN_THEMES.filter(
    (theme) => theme.id !== DEFAULT_THEME_ID
  );
  return {
    label: "Theme",
    submenu: [
      {
        label: "Default — Pearl Luxe",
        type: "checkbox",
        checked: effectiveSelection === DEFAULT_THEME_ID ||
          (Boolean(selection.cssName) && !knownSelection),
        click: () => Menus.selectTheme(DEFAULT_THEME_ID),
      },
      {
        label: NO_THEME.name,
        type: "checkbox",
        checked: effectiveSelection === NO_THEME.value,
        click: () => Menus.selectTheme(NO_THEME.value),
      },
      { label: "Built-in", submenu: otherBuiltins.map(themeItem) },
      ...(customThemes.length
        ? [{ label: "Custom", submenu: customThemes.map(themeItem) }] : []),
      ...(selection.cssLocation ? [{
        label: "Custom CSS file",
        type: "checkbox",
        checked: usingDirectCss,
        click: () => Menus.selectTheme(null),
      }] : []),
      { type: "separator" },
      { label: "Open themes folder", click: () => Menus.openThemesFolder() },
    ],
  };
};
