---
name: ascii-image-converter
description: Convert images to ASCII or braille art using the ascii-image-converter CLI tool. Use when users want to convert images (PNG, JPG, GIF, WEBP, BMP, TIFF) to text-based art for terminal display, saving as images, or generating text files. Triggers on requests like "convert image to ascii", "make ascii art", "create braille art from image", or any image-to-text conversion.
---

# ASCII Image Converter

Convert images to ASCII or braille art using the `ascii-image-converter` CLI tool.

## Prerequisites

Ensure the tool is installed. Check with:
```bash
which ascii-image-converter
```

If not installed, install via:
```bash
# Snap (Linux)
sudo snap install ascii-image-converter

# Homebrew (macOS/Linux)
brew install TheZoraiz/tap/ascii-image-converter

# Go
go install github.com/TheZoraiz/ascii-image-converter@latest

# Arch Linux (AUR)
yay -S ascii-image-converter-git
```

## Supported Formats

Input: JPEG, PNG, BMP, WEBP, TIFF, GIF

## Basic Usage

```bash
# Convert single image
ascii-image-converter image.png

# Convert multiple images
ascii-image-converter image1.png image2.jpg

# Convert from URL
ascii-image-converter https://example.com/image.png

# Pipe from stdin
curl -s https://example.com/image.png | ascii-image-converter -
```

## Display Options

| Flag | Description |
|------|-------------|
| `-C, --color` | Display with original image colors (16/256/truecolor based on terminal) |
| `-b, --braille` | Use braille characters instead of ASCII |
| `-g, --grayscale` | Display in grayscale colors |
| `-n, --negative` | Invert colors |
| `-c, --complex` | Use wider character set for more detail |

## Sizing Options

| Flag | Description |
|------|-------------|
| `-d, --dimensions [width,height]` | Set specific character dimensions |
| `-W, --width [n]` | Set width (height auto-calculated maintaining aspect ratio) |
| `-H, --height [n]` | Set height (width auto-calculated maintaining aspect ratio) |
| `-f, --full` | Fit to terminal width |

## Customization

| Flag | Description |
|------|-------------|
| `-m, --map "<chars>"` | Custom ASCII character mapping (darkest to lightest) |
| `--threshold [0-255]` | Braille dot sensitivity (lower = more dots) |
| `--dither` | Apply dithering for braille art |
| `--color-bg` | Apply color to background instead of text |
| `-x, --flipX` | Horizontal flip |
| `-y, --flipY` | Vertical flip |

## Saving Output

**Important**: The `-s`, `--save-gif`, and `--save-txt` flags expect a **directory path**, not a filename. The tool auto-generates the output filename as `<input-name>-ascii-art.<ext>`.

| Flag | Description |
|------|-------------|
| `-s, --save-img [dir]` | Save as PNG to directory (outputs `<name>-ascii-art.png`) |
| `--save-txt [dir]` | Save as text file to directory (outputs `<name>-ascii-art.txt`) |
| `--save-gif [dir]` | Save GIF as animated ASCII GIF to directory (outputs `<name>-ascii-art.gif`) |
| `--save-bg [R,G,B,A]` | Background color for saved images (default: black) |
| `--font [path]` | TTF font for saved images |
| `--font-color [R,G,B]` | Text color for saved images |
| `--only-save` | Skip terminal output, only save to file |

## Common Recipes

### High-quality colored ASCII art
```bash
ascii-image-converter -C -c -W 80 image.png
```

### Braille art with dithering (great for detailed images)
```bash
ascii-image-converter -b --dither -W 80 image.png
```

### Save as PNG with custom font
```bash
ascii-image-converter -C -c image.png -s . --font /path/to/font.ttf
# Outputs: image-ascii-art.png in current directory
```

### White text on black background (for dark terminals)
```bash
ascii-image-converter -n image.png
```

### Save braille art as text file
```bash
ascii-image-converter -b --dither image.png --save-txt . --only-save
# Outputs: image-ascii-art.txt in current directory
```

### Animated GIF to ASCII GIF
```bash
ascii-image-converter -C animation.gif --save-gif .
# Outputs: animation-ascii-art.gif in current directory
```

### Custom character map (simple to complex)
```bash
ascii-image-converter -m " .:-=+*#%@" image.png
```

## Tips

1. **Terminal compatibility**: Use `-C` only if your terminal supports colors
2. **Sizing**: Start with `-W 80` for a reasonable width, adjust as needed
3. **Braille vs ASCII**: Braille (`-b`) gives much higher resolution but requires Unicode support
4. **Dithering**: The `--dither` flag significantly improves braille art quality
5. **Complex mode**: Use `-c` for images with lots of detail

## Troubleshooting

- **Garbled output**: Terminal may not support colors. Try without `-C`
- **Braille not showing**: Ensure terminal font supports braille Unicode (U+2800-U+28FF)
- **Aspect ratio wrong**: The tool accounts for terminal character aspect ratio automatically
- **Colors look off**: Check terminal's color mode (16/256/truecolor)
