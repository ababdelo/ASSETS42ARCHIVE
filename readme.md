# Asset42Archive

Personal asset repository for hosting static resources (CSS, JavaScript, images) for my embedded systems projects.

## Purpose

This is my personal CDN solution for projects running on resource-constrained devices (ESP8266, ESP32) that can't store large asset files due to limited RAM and flash memory.

Assets are hosted here and referenced via raw GitHub URLs, so the client's browser fetches and processes them directly - keeping the microcontroller's memory free.

## Repository Structure

Assets are organized into **shared** (reusable across projects) and **specific** (project-dedicated) folders:

```
Asset42Archive/
├── assets/
│   ├── shared/           # Reusable assets across projects
│   │   └── audio/
│   └── specific/         # Project-specific assets
│       ├── SAI42/
│       │   ├── css/
│       │   ├── js/
│       │   └── images/
│       ├── SCHED-PMP/
│       │   ├── css/
│       │   ├── js/
│       │   └── images/
│       └── [Future Projects]/
└── ...
```

## Usage

Assets are served via **jsDelivr CDN** to avoid CORS restrictions and provide fast global delivery.

**URL Format:**
```
# Shared assets
https://cdn.jsdelivr.net/gh/ababdelo/ASSETS42ARCHIVE@main/assets/shared/[type]/[file]

# Project-specific assets
https://cdn.jsdelivr.net/gh/ababdelo/ASSETS42ARCHIVE@main/assets/specific/[ProjectName]/[type]/[file]
```

**In HTML:**
```html
<!-- Shared Audio -->
<audio src="https://cdn.jsdelivr.net/gh/ababdelo/ASSETS42ARCHIVE@main/assets/shared/audio/relaxingLand.mp3"></audio>

<!-- Project CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/ababdelo/ASSETS42ARCHIVE@main/assets/specific/SAI42/css/home.css">

<!-- Project JavaScript -->
<script src="https://cdn.jsdelivr.net/gh/ababdelo/ASSETS42ARCHIVE@main/assets/specific/SAI42/js/home.js"></script>

<!-- Project Images -->
<img src="https://cdn.jsdelivr.net/gh/ababdelo/ASSETS42ARCHIVE@main/assets/specific/SAI42/images/Others/hero.webp">

<!-- Favicon -->
<link rel="icon" href="https://cdn.jsdelivr.net/gh/ababdelo/ASSETS42ARCHIVE@main/assets/specific/SAI42/images/Others/logo/SAI42.ico">
```

**Benefits:**
- No CORS restrictions (CSS/JS load without issues)
- Fast global CDN delivery
- Automatic caching for better performance
- Minimal memory footprint on embedded devices
- Easy updates without reflashing the device
- Browser handles all downloading and processing
- **Shared assets** reduce duplication across projects
- **Specific assets** keep project resources isolated

## Current Projects

- **SAI42**: Smart Automated Irrigation System
- **SCHED-PMP**: Scheduling/PMP Project

## Notes

- Assets are served through jsDelivr CDN for optimal performance and CORS compatibility
- Keep assets optimized for web delivery (minified CSS/JS, compressed images)
- CDN cache updates within 24 hours after pushing to GitHub
- Use manual cache purge at https://www.jsdelivr.com/tools/purge if immediate updates needed
- Ensure file paths are consistent for easy URL construction

## License
This repository is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
