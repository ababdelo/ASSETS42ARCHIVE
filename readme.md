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

1. **Raw GitHub URLs**: Access files using the raw content URL format:
   ```
   https://raw.githubusercontent.com/ababdelo/Asset42Archive/main/[ProjectName]/assets/[path-to-file]
   ```

2. **In HTML**: Reference assets directly in HTML code served by the microcontroller:
   ```html
   <link rel="stylesheet" href="https://raw.githubusercontent.com/ababdelo/Asset42Archive/main/SAI42/assets/css/home.css">
   <script src="https://raw.githubusercontent.com/ababdelo/Asset42Archive/main/SAI42/assets/js/home.js"></script>
   <img src="https://raw.githubusercontent.com/ababdelo/Asset42Archive/main/SAI42/assets/images/logo.png">
   ```

3. **Benefits**:
   - Minimal memory footprint on embedded devices
   - Easy updates without reflashing the device
   - Centralized asset management
   - Browser handles all downloading and processing

## Current Projects

- **SAI42**: Smart Automated Irrigation System

## Notes

- Keep assets optimized for web delivery (minified CSS/JS, compressed images)
- Ensure file paths are consistent for easy URL construction
- Browser caching will help with performance after initial load

## License
This repository is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
