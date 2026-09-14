# Portable Windows app

After cloning or pulling this repository, double-click **VincentsVibeRoller.exe** in this folder. No installation, Node.js, build step, or Git LFS is needed. Close the running app before pulling an updated executable.

The app requires Windows x64 and internet access to the shared room service. It opens a clickable hotbar and a separate table/console that clicks through by default. Use **Interact with table** or **Ctrl+Shift+T** to interact with the table.

Successful main-branch release builds automatically replace the EXE here after browser, API, desktop, and portable-launch checks pass. `build.json` records the tested source commit and release; `SHA256SUMS.txt` records its SHA-256 checksum. This is the latest verified build, so it can lag source changes while their checks run. GitHub Releases retain versioned downloads.

The EXE is deliberately tracked as a normal Git file so a plain clone is immediately usable. Packaging fails if it reaches GitHub's 100 MiB per-file limit. Do not replace it with a pointer or require local compilation.
