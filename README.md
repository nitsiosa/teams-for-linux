# Teams for Linux

<p align="center">
  <img src="build/icon-source/harbour-huddle-app-icon.svg" alt="Harbour Huddle application icon" width="128">
</p>

[![Matrix Space](https://img.shields.io/matrix/teams-for-linux-space%3Amatrix.org?server_fqdn=matrix.org&label=Matrix%20Space)](https://matrix.to/#/#teams-for-linux-space:matrix.org "Matrix Space")
![](https://img.shields.io/github/release/IsmaelMartinez/teams-for-linux.svg?style=flat)
![](https://img.shields.io/github/downloads/IsmaelMartinez/teams-for-linux/total.svg?style=flat)
![Build & Release](https://github.com/IsmaelMartinez/teams-for-linux/workflows/Build%20&%20Release/badge.svg)
![](https://img.shields.io/librariesio/github/IsmaelMartinez/teams-for-linux)
[![Known Vulnerabilities](https://snyk.io//test/github/IsmaelMartinez/teams-for-linux/badge.svg?targetFile=package.json)](https://snyk.io//test/github/IsmaelMartinez/teams-for-linux?targetFile=package.json)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=IsmaelMartinez_teams-for-linux&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=IsmaelMartinez_teams-for-linux)

**Unofficial Microsoft Teams client for Linux** — a native desktop app that wraps the Teams web version with enhanced Linux integration.

✅ **System notifications**  
✅ **System tray integration** (badge support varies by desktop environment)  
✅ **Custom backgrounds & themes**  
✅ **Screen sharing support**  
✅ **Multiple account profiles**  

> [!NOTE]
> This is an independent project, not affiliated with Microsoft. Some features are limited by the Teams web app.

## Ubuntu Wayland prototype in this fork

The `feat/ubuntu-wayland-media` branch is a fork-local prototype for Ubuntu
desktops running GNOME on Wayland. It keeps the upstream application and
profile name, and adds:

- a **Teams for Linux (Wayland)** launcher that selects native Wayland before
  Electron starts;
- an opt-in xdg-desktop-portal screen/window picker, enabled by that launcher,
  so a cancelled picker cancels the share instead of returning a dead stream;
- the unchanged **Teams for Linux** X11/XWayland launcher as a fallback;
- startup diagnostics for missing PipeWire, xdg-desktop-portal, or a ScreenCast
  portal backend; and
- Harbour Huddle application artwork for the package, launcher, windows,
  notifications, and default color tray icon.
- **Pearl Luxe** as the default appearance: adaptive warm Light/Night styling
  for audited chat regions and every wrapper-owned local view, with a forced
  Night option and an explicit Microsoft Teams/no-custom-theme fallback.

The monochrome tray variants remain upstream artwork because they are designed
for contrast on light and dark desktop panels.

On first launch after this theme was introduced, the app backs up
`config.json` to `config.pre-pearl-luxe-v1.json`, selects Pearl Luxe, and turns
on system-theme following. This happens once; later choices under
**Settings → Theme** are respected.

### Install this fork's `.deb`

The package is not published as a release. Build it from this branch with
Node.js 24:

```bash
git clone https://github.com/nitsiosa/teams-for-linux.git
cd teams-for-linux
git switch feat/ubuntu-wayland-media
npm ci
npx electron-builder --x64 -l deb --publish never
sha256sum dist/teams-for-linux_2.27.0_amd64.deb
sudo apt install ./dist/teams-for-linux_2.27.0_amd64.deb
```

The install adds two application-grid entries:

- **Teams for Linux (Wayland)** — recommended on a Wayland desktop when full
  desktop sharing is required.
- **Teams for Linux** — the upstream X11/XWayland fallback.

To remove the local package:

```bash
sudo apt remove teams-for-linux
```

Automated validation, known limitations, the security review, and the
two-person meeting checklist live in [`docs/wayland/`](docs/wayland/).
Automated tests and local portal probes do not prove real Teams media success;
use [`ACCEPTANCE_CHECKLIST.md`](docs/wayland/ACCEPTANCE_CHECKLIST.md) before
treating the package as accepted. Remote control and Outlook are out of scope
for this fork.

## Sponsor

### Recall.ai — API for Meeting Recording and Transcription
> If you're looking for a meeting recording API, consider checking out [Recall.ai](https://www.recall.ai/product/microsoft-teams-recording-api?utm_source=github&utm_medium=sponsorship&utm_campaign=ismaelmartinez-teams-for-linux), an API that records and transcribes Zoom, Google Meet, Microsoft Teams, in-person meetings, and more.

_This sponsorship helps support the ongoing development of teams-for-linux._

## Installation

### Package Repositories

We have dedicated Debian/DEB and RHEL/Fedora/RPM repositories at https://teamsforlinux.de hosted with :heart: by [Nils Büchner](https://github.com/nbuechner). Please follow the installation instructions there.

### Distribution Packages

[![AUR: teams-for-linux](https://img.shields.io/badge/AUR-teams--for--linux-blue.svg)](https://aur.archlinux.org/packages/teams-for-linux)
[![Pacstall: teams-for-linux-deb](https://img.shields.io/badge/Pacstall-teams--for--linux--deb-00958C)](https://github.com/pacstall/pacstall-programs/tree/master/packages/teams-for-linux-deb)
[![Vylen Linux: teams-for-linux](https://img.shields.io/badge/Vylen_Linux-teams--for--linux-green)](https://vylen.gitlab.io/packages/#teams-for-linux)  
[![Get it from the Snap Store](https://snapcraft.io/static/images/badges/en/snap-store-black.svg)](https://snapcraft.io/teams-for-linux)
<a href='https://flathub.org/apps/details/com.github.IsmaelMartinez.teams_for_linux'><img width='170' alt='Download on Flathub' src='https://flathub.org/assets/badges/flathub-badge-en.png'/></a>

### Manual Download

Download from [GitHub Releases](https://github.com/IsmaelMartinez/teams-for-linux/releases) — available as AppImage, deb, rpm, snap, tar.gz (plus Windows/macOS builds).

> [!TIP]
> For AppImage files, use [`AppImageLauncher`](https://github.com/TheAssassin/AppImageLauncher) for better desktop integration.

## Quick Start

1. **Install** using your preferred method above
2. **Launch** with `teams-for-linux` 
3. **Configure** by creating `~/.config/teams-for-linux/config.json` if needed

## Documentation

📖 **[Complete Documentation](https://ismaelmartinez.github.io/teams-for-linux/)** — Enhanced documentation with search, mobile optimization, and comprehensive guides

| Topic | Description |
|-------|-------------|
| **[Installation Guide](https://ismaelmartinez.github.io/teams-for-linux/installation)** | Package repositories and installation methods |
| **[Configuration Guide](https://ismaelmartinez.github.io/teams-for-linux/configuration)** | Complete setup and configuration options |
| **[Troubleshooting](https://ismaelmartinez.github.io/teams-for-linux/troubleshooting)** | Common issues and solutions |
| **[Multiple Profiles](https://ismaelmartinez.github.io/teams-for-linux/multiple-instances)** | Running work & personal accounts |
| **[Custom Backgrounds](https://ismaelmartinez.github.io/teams-for-linux/custom-backgrounds)** | Video call backgrounds setup |
| **[Contributing](https://ismaelmartinez.github.io/teams-for-linux/contributing)** | Development setup and contribution guidelines |
| **[Privacy & Data Protection](https://ismaelmartinez.github.io/teams-for-linux/privacy)** | What personal data the app does and does not handle |

## Project Activity

![Alt](https://repobeats.axiom.co/api/embed/e63dcc8b154ee5f4490674818df091c243b041b7.svg "Repobeats analytics image")

## Support & Community

- 💬 **Chat**: Join our [Matrix Space](https://matrix.to/#/#teams-for-linux-space:matrix.org)
- 🐛 **Issues**: [Report bugs](https://github.com/IsmaelMartinez/teams-for-linux/issues)
- 🤝 **Contributing**: See [`CONTRIBUTING.md`](CONTRIBUTING.md)

## Security & Sandboxing

Electron's contextIsolation and sandbox features are disabled to enable Teams DOM access functionality. For enhanced security, use system-level sandboxing:

**Available options**:
- **Flatpak**: Built-in isolation via Flathub
- **Snap packages**: Application confinement with auto-updates
- **Firejail**: Use this [script](https://codeberg.org/lars_uffmann/teams-for-linux-jailed) for manual sandboxing
- **AppArmor/SELinux**: Most Linux distributions include these by default

System-level sandboxing provides better isolation than Electron's built-in features while preserving full functionality.

## Advanced Usage

## History

Read about the history of this project in the [`HISTORY.md`](HISTORY.md) file.

## License

**GPL-3.0** — See [`LICENSE.md`](LICENSE.md)

The Harbour Huddle application icon was supplied by the fork maintainer and is
published here with permission. Remaining upstream icons are from
[Icon Duck](https://iconduck.com/sets/hugeicons-essential-free-icons) (CC BY 4.0).
