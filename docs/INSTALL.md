# Playing Moyu Rumble

## On this PC (no internet needed)

Double-click **`Play Moyu Rumble.bat`** in the game folder. The game opens in your browser.
Keep the black window open while you play; close it when you're done.

## On your Android phone

The game is put online once (free, on GitHub Pages). Your phone then installs it like a normal app,
and every update you make reaches the phone automatically.

### One-time setup (about 10 minutes)

1. **Make a GitHub account** at https://github.com/signup (free).
2. **Create an empty repository:** go to https://github.com/new
   - Repository name: `pinyin-quest`
   - Choose **Public** (free GitHub Pages hosting needs a public repository; anyone with the link can see the code and play)
   - Leave every other box unticked, then click **Create repository**
3. **Upload the game.** Copy the repository address (it looks like `https://github.com/YOUR-NAME/pinyin-quest.git`) and give it to Claude, which will upload the game.
   A GitHub sign-in window pops up once; sign in there.
4. **Turn on the website:** in the repository on GitHub, open **Settings → Pages**, and under
   "Build and deployment" set **Source** to **GitHub Actions**.
   Wait about 2 minutes. Your game is now at: `https://YOUR-NAME.github.io/pinyin-quest/`

### Install on the phone

1. Open that address in **Chrome** on your phone.
2. Tap the **⋮** menu (top right) → **Install app** (or **Add to Home screen → Install**).
3. Moyu Rumble now has its own icon in your app drawer and opens full-screen, like any app.
   Chrome builds a real Android app package for it behind the scenes.
4. For Mandarin audio: Android **Settings → Text-to-speech output → Google → ⚙ → Install voice data →
   Chinese (Mandarin)**. (Exact menu names vary a little by phone.)

### Optional: get an actual .apk file

1. Go to https://www.pwabuilder.com, paste your game address, and click **Start**.
2. Click **Package for stores → Android → Generate package → Download**.
3. Unzip it and copy the `.apk` file to your phone. Open it and allow "install unknown apps" when asked.

This APK opens the online game too, so it also updates automatically. You only need the APK if you
want a file to keep or share; the Chrome install above does the same job.

## Updating the game later

Ask Claude for the change, then say **"publish it"**. Claude uploads it to GitHub, the website rebuilds
itself in about 2 minutes, and **the app on your phone updates the next time you open it while online**.
No reinstalling.

To check which version you have, open **Settings** and look at **Version** at the bottom.

## Your progress

Progress is saved separately on each device (PC, phone). To move it, use **Settings → Export JSON**
on one device and **Import JSON** on the other. Progress on the phone is kept through updates,
as long as the game stays at the same web address.
