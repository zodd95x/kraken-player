# Streaming service support

Kraken Player connects to Subsonic-compatible streaming servers (such as Navidrome, Subsonic, Airsonic and more) for cloud music playback.

## Features

- **Multiple servers**: configure several servers at once and switch anytime.
- **Auto-connect**: the app reconnects to your last server on startup.
- **Lyrics support**: parses lyrics returned by the Subsonic protocol (both Plain text and Structured formats) and converts them to LRC for display.
- **Browse by category**: explore your library by **songs**, **artists**, **albums** and **playlists**.
- **Seamless integration**: streaming songs join playlists, favorites and playback just like local music.

## Setup guide

1. Go to **Settings** -> **Streaming services**, or click the **Streaming** page in the sidebar.
2. Click **Add server**.
3. Fill in the server details:
   - **Name**: a custom name (e.g. "My Navidrome").
   - **Address**: the server URL (with port, e.g. `https://music.example.com`).
   - **Username**: your account name.
   - **Password**: your password (or token).
   - **Type**: choose Navidrome or Subsonic.
4. Click **Confirm** to save and connect.

## FAQ

### Connection failed?

- Check that the server address is correct and includes `http://` or `https://`.
- Make sure the server supports the Subsonic API with the right permissions enabled.
- With a self-signed certificate, the app may block the connection — make sure your network setup is safe before bypassing HTTPS certificate errors.

### No lyrics showing?

- Make sure the server has scraped and stored lyrics correctly.
- For Navidrome, embedded lyrics and `.lrc` files are supported.

### Playlist sync

- Reading server-side playlists is supported; playlists created in the app do not sync back to the server yet (depends on future updates).
