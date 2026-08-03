#!/usr/bin/env python3
"""
sw-lint.py — falla si sw.js cambió de forma que afecta a assets cacheados
pero la constante VERSION no se ha tocado desde el commit anterior.

Uso: se ejecuta como pre-commit hook (ver .githooks/pre-commit).
"""
import re
import subprocess
import sys


def git_show(ref, path):
    try:
        return subprocess.run(
            ['git', 'show', f'{ref}:{path}'],
            capture_output=True, text=True, check=True
        ).stdout
    except subprocess.CalledProcessError:
        return None


def extract_version(content):
    if content is None:
        return None
    m = re.search(r"VERSION\s*=\s*['\"]([^'\"]+)['\"]", content)
    return m.group(1) if m else None


def staged_files():
    out = subprocess.run(
        ['git', 'diff', '--cached', '--name-only'],
        capture_output=True, text=True, check=True
    ).stdout
    return set(out.splitlines())


def main():
    changed = staged_files()
    # ¿ha cambiado algo que probablemente esté precacheado?
    watched_ext = ('.html', '.css', '.js', '.json', '.png', '.svg')
    relevant_change = any(
        f.endswith(watched_ext) and f != 'sw.js' and f != 'scripts/sw-lint.py'
        for f in changed
    )
    sw_changed = 'sw.js' in changed

    if not relevant_change:
        return 0

    old_version = extract_version(git_show('HEAD', 'sw.js'))
    new_content = None
    try:
        with open('sw.js', encoding='utf-8') as f:
            new_content = f.read()
    except FileNotFoundError:
        print('sw-lint: no se encuentra sw.js')
        return 1
    new_version = extract_version(new_content)

    if old_version and new_version and old_version == new_version:
        print(
            f"sw-lint: cambiaste archivos cacheados pero VERSION en sw.js "
            f"sigue en '{old_version}'. Súbela antes de commitear."
        )
        return 1

    return 0


if __name__ == '__main__':
    sys.exit(main())
