# ASCII Image Converter Examples

## Example Commands and Use Cases

### Profile Picture to Terminal Art
```bash
# Convert a profile picture to colorful ASCII
ascii-image-converter -C -c -W 60 profile.jpg
```

### Logo for README
```bash
# Generate ASCII logo for a text file
ascii-image-converter -c logo.png --save-txt logo.txt --only-save
```

### Discord/Slack Avatar
```bash
# Create a small, colored ASCII avatar
ascii-image-converter -C -W 40 avatar.png
```

### High-Detail Braille Art
```bash
# Best quality braille conversion
ascii-image-converter -b --dither -C -W 100 photo.jpg
```

### Create ASCII Art Image
```bash
# Save colored ASCII as shareable PNG
ascii-image-converter -C -c image.png -s ascii_art.png --save-bg 0,0,0,255
```

### Batch Processing
```bash
# Convert all PNGs in directory
for f in *.png; do
    ascii-image-converter -C -c -W 80 "$f" --save-txt "${f%.png}.txt" --only-save
done
```

### Animated GIF Processing
```bash
# Convert animated GIF to ASCII animation
ascii-image-converter -C animation.gif --save-gif ascii_animation.gif
```

## Character Map Examples

Default characters (darkest to brightest):
```
" ", ".", ":", "-", "=", "+", "*", "#", "%", "@"
```

Alternative maps:
```bash
# Simple gradient
ascii-image-converter -m " .-+#" image.png

# Block characters
ascii-image-converter -m " ░▒▓█" image.png

# Extended detail
ascii-image-converter -m " .,:;+*?%S#@" image.png
```

## Piping Examples

```bash
# From curl
curl -s https://example.com/image.png | ascii-image-converter -C -

# From base64
base64 -d image.b64 | ascii-image-converter -

# Screenshot to ASCII
import -window root -quality 100 png:- | ascii-image-converter -W 120 -
```
