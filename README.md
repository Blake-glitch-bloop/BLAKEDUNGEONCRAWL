# Pocket Dungeon

A mobile-friendly, five-floor dungeon crawler in plain HTML, CSS, and JavaScript. All artwork is drawn locally on Canvas. No dependencies, external fonts, downloads, ads, or accounts.

## Play

Open `index.html` in a browser, or serve this folder using any static web server. Drag the left joystick and hold the right attack button. Desktop controls: WASD / arrows, Space to attack, P / Escape to pause.

Clear the slimes to awaken each guardian. Dodge the guardian's telegraphed charge and attack while it recovers. Defeat it and walk into the glowing stairs at the top of the room. Descending restores two hearts. Complete all five floors to win.

The game pauses when the tab loses focus or becomes hidden. Sound is optional and off by default. Only your best floor is stored on the device; the current run stays in memory while the page is open.

## GitHub Pages

The game files are already at the root of this repository. In Settings → Pages, choose **Deploy from a branch**, select **main** and **/ (root)**, then save. Relative asset paths work on both project and user Pages sites. No build step is required.

After GitHub Pages finishes publishing, play at https://blake-glitch-bloop.github.io/BLAKEDUNGEONCRAWL/ .
