# Search the Ships

A userscript that adds a beautifully designed button to book-related websites to search the current book title on various archives, with a centralized status indicator. The script is fully responsive and allows searching with specific file types like EPUBs and PDFs.

## Features

- **Fixed Position Button**: Adds a clickable button in the bottom-right corner of supported pages.
- **Dropdown Menu**: Hover to reveal a dropdown with available search sites.
- **Submenus**: Each search site includes options for specific file types (e.g., All Files, EPUBs, PDFs) for better filtering.
- **Centralized Status Indicators**: One indicator per site checks reachability in real-time.
- **Built-in Settings**: The main button includes a settings control that opens GM_config for vertical/horizontal position, vertical/horizontal margin (px), and button colors.
- **Responsive Design**: Adjusts for smaller screens (e.g., mobile devices).
- **Automatic Title Extraction**: Parses book titles from page elements or page title as fallback.

## Supported Book Websites

This script works on the following sites:

- [The Greatest Books](https://thegreatestbooks.org/)
- [Goodreads](https://www.goodreads.com/)
- Amazon domains:
  - Amazon.com
  - Amazon.fr
  - Amazon.de
  - Amazon.co.uk
  - Amazon.it
  - Other Amazon regional sites (generic match)

## Search Archives Included

#### 📚 Books

1. **Anna's Archive**: Searches across multiple mirrors for a wide range of books and documents.
2. **Z-Library**: Access to a large collection of ebooks with various domain mirrors.
3. **Mobilism**: A forum for mobile ebooks and audiobooks.
4. **Library Genesis**: Known for academic and general books.

#### 🎧 Audiobooks

1. **AudiobookBay**: Search for audiobook torrents
2. **MyAnonaMouse**: Search for audiobooks and ebooks via torrents

Each site links directly to the search results for the extracted book title.

## Usage

- Navigate to a book page on one of the supported websites.
- The "Search the Ships" button appears in the bottom-right corner by default (fully configurable in settings).
- Hover over the button to open the dropdown menu.
- Click the gear icon on the right side of the main button to open settings.
- Hover over a search site to reveal submenus with file type options (e.g., All Files, EPUBs, PDFs).
- Click a link to open search results in a new tab.
- Centralized status indicators show site availability.

## Permissions

- **GM_config dependency**: The script loads GM_config from a remote `@require` URL.
- **GM_config storage**: The script uses GM_config with `GM_getValue` and `GM_setValue` to persist the button settings.
- **@match**: Limited to specific book sites for security.

## Author

Script created by GoldRift.

## License

MIT License - feel free to use, modify, and distribute.

## Contributing

If you find bugs or have suggestions, please report via [GreasyFork feedback](https://greasyfork.org/en/scripts/553077-search-the-ships/feedback) or [GitHub Issues](https://github.com/GoldRift/Search-the-Ships/issues)

## Disclaimer

This tool is for educational and research purposes. Respect copyright laws and use licensed content where appropriate.

<img width="1920" height="913" alt="Screenshot_20260625_170919" src="https://github.com/user-attachments/assets/d204d3af-ce87-4ffc-ba1d-ba09e89163bc" />

