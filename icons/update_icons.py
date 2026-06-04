#!/usr/bin/env python3
"""Sync the Material Symbols icon font with Odoo.

o-spreadsheet uses the same icon font as Odoo to keep a consistent look. This
script downloads the font subset and its stylesheet from a given Odoo branch.

Usage: python update_icons.py [branch]

  branch: the Odoo branch to fetch the font from (default: master)
"""

import argparse
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

BASE_URL = "https://raw.githubusercontent.com/odoo/odoo/{branch}/addons/web/static/src/libs/materialsymbols"

FONT_FILE = "material_symbols_outlined_subset.woff2"
CSS_FILE = "material_symbols_outlined.css"

ICONS_DIR = Path(__file__).resolve().parent


def download(url: str) -> bytes:
    print(f"Fetching {url}")
    try:
        with urllib.request.urlopen(url) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        sys.exit(f"Error: could not fetch {url} ({error.code} {error.reason})")
    except urllib.error.URLError as error:
        sys.exit(f"Error: could not fetch {url} ({error.reason})")


def adapt_css(css: str) -> str:
    """Adapt the Odoo stylesheet to the o-spreadsheet layout.

    Odoo serves the font from an absolute url and declares a woff1 fallback for
    wkhtmltopdf. Here the font sits next to the css file, and only the woff2 is
    shipped.
    """
    css = re.sub(r"\s*/\* WOFF1 fallback.*?\*/", "", css, flags=re.DOTALL)
    css = re.sub(r"src:[^;]*;", f"src: url('./{FONT_FILE}') format('woff2');", css)
    if "/web/static" in css:
        sys.exit(f"Error: unexpected content in {CSS_FILE}, it must be updated manually:\n{css}")
    return css


def format_css(path: Path) -> None:
    """The css file is not prettier-ignored, keep it formatted like the rest of the repo."""
    npx = shutil.which("npx")
    if not npx:
        print(f"Warning: npx not found, could not run prettier on {CSS_FILE}", file=sys.stderr)
        return
    result = subprocess.run([npx, "--no-install", "prettier", "--write", str(path)])
    if result.returncode:
        print(f"Warning: could not run prettier on {CSS_FILE}", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "branch", nargs="?", default="master", help="Odoo branch to fetch the font from"
    )
    branch = parser.parse_args().branch
    base_url = BASE_URL.format(branch=branch)

    # Download everything before writing anything, to avoid a half update.
    font = download(f"{base_url}/{FONT_FILE}")
    css = adapt_css(download(f"{base_url}/{CSS_FILE}").decode("utf-8"))

    (ICONS_DIR / FONT_FILE).write_bytes(font)
    # newline="\n": no CRLF on Windows.
    with open(ICONS_DIR / CSS_FILE, "w", encoding="utf-8", newline="\n") as css_file:
        css_file.write(css)

    format_css(ICONS_DIR / CSS_FILE)
    print(f"Updated {FONT_FILE} and {CSS_FILE} from odoo/{branch}")


if __name__ == "__main__":
    main()
