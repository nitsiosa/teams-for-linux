"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert");
const buildThemesMenu = require("../../app/menus/themesMenu");
const {
  BUILTIN_THEMES,
  DEFAULT_THEME_ID,
  NO_THEME,
} = require("../../app/customCSS/themes");

const DEFAULT_LABEL = "Default — Pearl Luxe";

function fakeMenus({ cssName = "", cssLocation = "", customThemes = [] } = {}) {
  const calls = [];
  return {
    calls,
    configGroup: {
      themeSelection: { cssName, cssLocation },
      customThemes,
    },
    selectTheme: (value) => calls.push(["selectTheme", value]),
    openThemesFolder: () => calls.push(["openThemesFolder"]),
  };
}

function findItem(menu, label) {
  const item = menu.submenu.find((candidate) => candidate.label === label);
  assert.ok(item, `Expected theme menu entry ${label}`);
  return item;
}

describe("Settings theme menu", () => {
  it("offers every existing built-in theme with its persisted name", () => {
    const menus = fakeMenus();
    const menu = buildThemesMenu(menus);
    assert.strictEqual(menu.label, "Theme");
    const builtins = findItem(menu, "Built-in").submenu;
    const expected = BUILTIN_THEMES.filter(
      (theme) => theme.id !== DEFAULT_THEME_ID
    );
    assert.deepStrictEqual(
      builtins.map((item) => item.label),
      expected.map((theme) => theme.name)
    );
    for (const [index, item] of builtins.entries()) {
      assert.strictEqual(item.type, "checkbox");
      item.click();
      assert.deepStrictEqual(
        menus.calls.at(-1),
        ["selectTheme", expected[index].value]
      );
    }
  });

  it("groups discovered custom themes and uses metadata names for display", () => {
    const customThemes = [
      { id: "glass-dark", name: "Glass Dark", value: "custom:glass-dark" },
      { id: "nord-glass", name: "Nord Glass", value: "custom:nord-glass" },
    ];
    const menus = fakeMenus({ customThemes });
    const custom = findItem(buildThemesMenu(menus), "Custom").submenu;
    assert.deepStrictEqual(custom.map((item) => item.label), ["Glass Dark", "Nord Glass"]);
    for (const [index, item] of custom.entries()) {
      assert.strictEqual(item.type, "checkbox");
      item.click();
      assert.deepStrictEqual(menus.calls.at(-1), ["selectTheme", customThemes[index].value]);
    }
  });

  it("omits the empty custom group and selects Pearl Luxe by default", () => {
    const menu = buildThemesMenu(fakeMenus());
    assert.ok(!menu.submenu.some((item) => item.label === "Custom"));
    assert.strictEqual(findItem(menu, DEFAULT_LABEL).checked, true);
    assert.strictEqual(findItem(menu, NO_THEME.name).checked, false);
    assert.ok(!menu.submenu.some((item) => item.label === "Custom CSS file"));
  });

  it("marks an existing built-in as selected and Default as unselected", () => {
    const menu = buildThemesMenu(fakeMenus({ cssName: "compactDark" }));
    const builtins = findItem(menu, "Built-in").submenu;
    assert.deepStrictEqual(builtins.filter((item) => item.checked).map((item) => item.label), ["Compact Dark"]);
    assert.strictEqual(findItem(menu, DEFAULT_LABEL).checked, false);
  });

  it("marks the selected custom theme and leaves built-ins unchecked", () => {
    const menu = buildThemesMenu(fakeMenus({
      cssName: "custom:glass-dark",
      customThemes: [{ id: "glass-dark", name: "Glass Dark", value: "custom:glass-dark" }],
    }));
    assert.strictEqual(findItem(menu, "Custom").submenu[0].checked, true);
    assert.ok(findItem(menu, "Built-in").submenu.every((item) => !item.checked));
    assert.strictEqual(findItem(menu, DEFAULT_LABEL).checked, false);
  });

  it("shows missing selections as Default without changing the stored value", () => {
    const menus = fakeMenus({ cssName: "custom:removed-theme", cssLocation: "/existing/direct.css" });
    const menu = buildThemesMenu(menus);
    assert.strictEqual(findItem(menu, DEFAULT_LABEL).checked, true);
    assert.strictEqual(findItem(menu, "Custom CSS file").checked, false);
    assert.strictEqual(menus.configGroup.themeSelection.cssName, "custom:removed-theme");
    assert.deepStrictEqual(menus.calls, []);
  });

  it("keeps direct CSS selectable when a named theme takes precedence", () => {
    const menus = fakeMenus({ cssName: "compactDark", cssLocation: "/existing/direct.css" });
    const direct = findItem(buildThemesMenu(menus), "Custom CSS file");
    assert.strictEqual(direct.type, "checkbox");
    assert.strictEqual(direct.checked, false);
    direct.click();
    assert.deepStrictEqual(menus.calls, [["selectTheme", null]]);
  });

  it("marks direct CSS selected when no named theme is configured", () => {
    const menu = buildThemesMenu(fakeMenus({ cssLocation: "/existing/direct.css" }));
    assert.strictEqual(findItem(menu, "Custom CSS file").checked, true);
    assert.strictEqual(findItem(menu, DEFAULT_LABEL).checked, false);
  });

  it("wires default, no-theme and Open themes folder through Menus", () => {
    const menus = fakeMenus();
    const menu = buildThemesMenu(menus);
    findItem(menu, DEFAULT_LABEL).click();
    findItem(menu, NO_THEME.name).click();
    findItem(menu, "Open themes folder").click();
    assert.deepStrictEqual(menus.calls, [
      ["selectTheme", DEFAULT_THEME_ID],
      ["selectTheme", NO_THEME.value],
      ["openThemesFolder"],
    ]);
  });

  it("marks the explicit no-theme choice", () => {
    const menu = buildThemesMenu(fakeMenus({ cssName: NO_THEME.value }));
    assert.strictEqual(findItem(menu, NO_THEME.name).checked, true);
    assert.strictEqual(findItem(menu, DEFAULT_LABEL).checked, false);
  });

  it("escapes metadata ampersands so Electron displays names as literal text", () => {
    const menus = fakeMenus({ customThemes: [{ id: "a-b", name: "A & B", value: "custom:a-b" }] });
    const custom = findItem(buildThemesMenu(menus), "Custom").submenu;
    assert.strictEqual(custom[0].label, "A && B");
    custom[0].click();
    assert.deepStrictEqual(menus.calls, [["selectTheme", "custom:a-b"]]);
  });
});
