# Asset42Archive

Personal asset repository for hosting static resources (CSS, JavaScript, images) for my embedded systems projects.

## Purpose

This is my personal CDN solution for projects running on resource-constrained devices (ESP8266, ESP32) that can't store large asset files due to limited RAM and flash memory.

Assets are hosted here and referenced via raw GitHub URLs, so the client's browser fetches and processes them directly - keeping the microcontroller's memory free.

## Repository Structure

Each project has its own folder:

```
Asset42Archive/
├── SAI42/
│   └── assets/
│       ├── css/
│       ├── js/
│       └── images/
├── LibraryManager/
│   └── assets/
└── [Future Projects]/
    └── assets/
```

## Usage

Assets are served via **jsDelivr CDN** to avoid CORS restrictions and provide fast global delivery.

**URL Format:**
```
https://cdn.jsdelivr.net/gh/ababdelo/ASSETS42ARCHIVE@main/[ProjectName]/assets/[path-to-file]
```

**In HTML:**
```html
<!-- CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/ababdelo/ASSETS42ARCHIVE@main/SAI42/assets/css/home.css">

<!-- JavaScript -->
<script src="https://cdn.jsdelivr.net/gh/ababdelo/ASSETS42ARCHIVE@main/SAI42/assets/js/home.js"></script>

<!-- Images -->
<img src="https://cdn.jsdelivr.net/gh/ababdelo/ASSETS42ARCHIVE@main/SAI42/assets/images/Others/hero.webp">

<!-- Favicon -->
<link rel="icon" href="https://cdn.jsdelivr.net/gh/ababdelo/ASSETS42ARCHIVE@main/SAI42/assets/images/Others/logo/SAI42.ico">
```

**Benefits:**
- No CORS restrictions (CSS/JS load without issues)
- Fast global CDN delivery
- Automatic caching for better performance
- Minimal memory footprint on embedded devices
- Easy updates without reflashing the device
- Browser handles all downloading and processing

## Current Projects

- **SAI42**: Smart Automated Irrigation System

## Notes

- Assets are served through jsDelivr CDN for optimal performance and CORS compatibility
- Keep assets optimized for web delivery (minified CSS/JS, compressed images)
- CDN cache updates within 24 hours after pushing to GitHub
- Use manual cache purge at https://www.jsdelivr.com/tools/purge if immediate updates needed
- Ensure file paths are consistent for easy URL construction

## License
This repository is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
