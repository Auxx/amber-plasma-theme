# Amber

Amber is a dark theme for KDE Plasma 6 in warm tones. It is flat and quiet:
the areas of an application are told apart by steps of tone, not by lines.
Corners are square. A widget that is hovered or focused changes tone; it
gets no outline and no glow.

## Status

Amber is in early development and nothing can be installed yet.

## Documentation

- [Vision](docs/product/vision.md)
- [Roadmap](docs/product/roadmap.md)
- [Architecture overview](docs/architecture/overview.md)

## Known gaps

- **Icons are the icon theme's.** Breeze's full-colour file and
  application icons, such as the text file, PDF and network drive icons,
  hold cool greys. Amber has no icon theme. (seen in P2.3)
- **KWin dims the window behind a dialog**, which darkens and desaturates
  its tones towards a neutral near-black. It is KWin's dialog parent
  effect, a system setting. (seen in P2.3)

## Licence

MIT. See [LICENSE](LICENSE).

The Union style in `parts/union-style/amber/` is a copy of KDE's Breeze
style and stays BSD-2-Clause, with its notices and its own `LICENSE`. The
rest of Amber is MIT.
