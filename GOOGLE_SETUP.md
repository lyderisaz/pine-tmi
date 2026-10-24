# Connect Pušis to Google Drive (optional)

Pušis works without Google. Connecting Drive saves your data as one file, `pusis-data.json`, in your own Google Drive, so you can use Pušis on more than one device. Pušis has no server: your browser talks to Google directly.

## Using the live app
If the app owner has built in a Client ID, there is nothing to set up: click the muted **☁ Drive** pill in the header, choose your Google account, and allow access.
While the Google project is in *testing* mode, only people on the owner's **test users** list can sign in. Everyone else sees "access blocked". Ask the owner to add you, or use your own Client ID (below, then paste it in **⋯**).

## Creating a Client ID (app owner, or your own fork)
It takes about 10 minutes and costs nothing. Google renames console menus now and then, so the labels below may differ slightly.

### 1. Create a project
1. Open https://console.cloud.google.com/ and sign in with the Google account whose Drive you want to use.
2. Project picker (top bar) → **New project** → name it, e.g. `Pusis` → **Create**, then select it.

### 2. Turn on the Drive API
**APIs & Services → Library** → search **Google Drive API** → **Enable**.
(Later phases will also use *Google Calendar API* and *People API*. You don't need them now.)

### 3. Consent screen (Google Auth Platform)
1. **Google Auth Platform → Branding**: app name `Pušis`, your e-mail as the support and developer contact → Save.
2. **Audience**: user type **External**, publishing status **Testing** → **Add users** → add your own Gmail address.
   *Testing* means only the users listed here can sign in, and Google does not need to review the app.
3. **Data access → Add or remove scopes** → add `https://www.googleapis.com/auth/drive.file` ("See, edit, create and delete only the specific Google Drive files you use with this app") → Save.

### 4. Create the Client ID
**Google Auth Platform → Clients → Create client**
- Application type: **Web application**
- Name: `Pusis web`
- **Authorized JavaScript origins**: add
  - `https://lyderisaz.github.io` (the live app; use your own GitHub Pages origin if you forked it)
  - `http://localhost:8000` (optional, for testing a local copy served with `python -m http.server 8000`)
- Authorized redirect URIs: leave empty.

→ **Create**, then copy the **Client ID** (it ends with `.apps.googleusercontent.com`). The Client ID is not a secret. Do **not** create or paste a client *secret*.

### 5. Put the Client ID into Pušis
- **App owner:** set `const BUILT_IN_CLIENT_ID = '…apps.googleusercontent.com';` in `index.html` (and the current `prototype/` version) and publish. Every device then just clicks **☁ Drive**.
- **Anyone else:** open the app → **⋯** → paste your own Client ID → **Connect Google Drive**. It is stored in that browser only.

Then pick your account and allow access. Google will warn that the app is unverified, because it is in testing mode. Continue only if you trust the owner of the Client ID.

The ☁ pill in the header shows the sync state:
- **☁ Drive** (muted): Drive is available but not connected. Click to connect.
- **☁ saved 10:42**: your data is in Drive.
- **☁ connect**: the sign-in has expired (after about an hour). Click it to renew; usually one click, with no password.
- **☁ conflict**: the Drive file was changed on another device. Click it and choose which copy to keep. Nothing is overwritten without asking.

## Notes
- Pušis can see **only the files it created** (scope `drive.file`), not the rest of your Drive.
- The access token stays in browser memory only. The Client ID and the Drive file id are stored in this browser.
- **⋯ → Disconnect** stops syncing. The Drive file stays in your Drive.
- Keep using **⋯ → Export JSON backup** now and then. This is a prototype.
