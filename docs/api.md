# HTTP API reference

## Overview

This app provides a local HTTP API service to control the player and access music services. The default port is `25884`.

## Basics

- **Base URL**: `http://localhost:25884`
- **API prefix**: `/api`
- **Response format**: JSON

## Standard response format

All endpoints follow this response format:

```json
{
  "code": 200,
  "message": "Success",
  "data": {}
}
```

### Status codes

- `200`: success
- `500`: server error

---

## Playback control API (Control API)

**Base path**: `/api/control`

### Play

**Endpoint**: `GET /api/control/play`

**Description**: send the play command

**Example response**:

```json
{
  "code": 200,
  "message": "Play command sent",
  "data": null
}
```

---

### Pause

**Endpoint**: `GET /api/control/pause`

**Description**: send the pause command

**Example response**:

```json
{
  "code": 200,
  "message": "Pause command sent",
  "data": null
}
```

---

### Play/pause toggle

**Endpoint**: `GET /api/control/toggle`

**Description**: toggle between play and pause

**Example response**:

```json
{
  "code": 200,
  "message": "Play/pause toggle command sent",
  "data": null
}
```

---

### Next song

**Endpoint**: `GET /api/control/next`

**Description**: play the next song

**Example response**:

```json
{
  "code": 200,
  "message": "Next song command sent",
  "data": null
}
```

---

### Previous song

**Endpoint**: `GET /api/control/prev`

**Description**: play the previous song

**Example response**:

```json
{
  "code": 200,
  "message": "Previous song command sent",
  "data": null
}
```

---

### Get status

**Endpoint**: `GET /api/control/status`

**Description**: get the app version, environment data and connection status

**Example response**:

```json
{
  "code": 200,
  "message": "Status retrieved",
  "data": {
    "version": {
      "app": "3.0.0-beta.6",
      "name": "Kraken Player"
    },
    "environment": {
      "platform": "win32",
      "arch": "x64",
      "nodeVersion": "20.x.x",
      "electronVersion": "x.x.x",
      "chromeVersion": "x.x.x",
      "v8Version": "x.x.x"
    },
    "connected": true,
    "window": "available"
  }
}
```

**Field reference**:

- `version.app`: app version number
- `version.name`: app name
- `environment.platform`: OS platform (win32/darwin/linux)
- `environment.arch`: system architecture (x64/arm64)
- `environment.nodeVersion`: Node.js version
- `environment.electronVersion`: Electron version
- `environment.chromeVersion`: Chrome version
- `environment.v8Version`: V8 engine version
- `connected`: whether connected
- `window`: window status

---

### Get current song info

**Endpoint**: `GET /api/control/song-info`

**Description**: get info about the currently playing song

> [!WARNING]
> Do not poll this endpoint (e.g. once per second) for progress — it hurts performance.
> For real-time progress and status, use the WebSocket connection and its events.

**Example response**:

```json
{
  "code": 200,
  "message": "Current song info retrieved",
  "data": {
    "playStatus": "play",
    "playName": "song name",
    "artistName": "artist name",
    "albumName": "album name",
    "currentTime": 123.45,
    "volume": 1,
    "playRate": 1,
    "id": 123456,
    "name": "song name",
    "artists": "artist name",
    "album": "album name",
    "cover": "http://...",
    "duration": 300,
    "lrcData": [],
    "yrcData": []
  }
}
```

---

## NetEase Cloud Music API (Netease API)

**Base path**: `/api/netease`

### Usage

The NetEase API supports all NeteaseCloudMusicApi Enhanced endpoints. Paths are automatically converted to kebab-case.

**Examples**:

- `GET /api/netease/login/cellphone?phone=xxx&password=xxx`
- `GET /api/netease/user/playlist?uid=xxx`
- `GET /api/netease/song/detail?ids=xxx`

For more endpoints, see the [NeteaseCloudMusicApi Enhanced docs](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced)

---

## Unblock API

**Base path**: `/api/unblock`

### NetEase unblock

**Endpoint**: `GET /api/unblock/netease?id={songId}`

**Description**: get the unlocked playback URL for a NetEase song

**Parameters**:

- `id` (required): song ID

**Example response**:

```json
{
  "code": 200,
  "url": "https://..."
}
```

---

### Kuwo unblock

**Endpoint**: `GET /api/unblock/kuwo?keyword={keyword}`

**Description**: get the unlocked playback URL from Kuwo Music

**Parameters**:

- `keyword` (required): search keyword (song name - artist name)
- `songName` (optional): song name, used to verify the match
- `artist` (optional): artist name, used to verify the match

**Example response**:

```json
{
  "code": 200,
  "url": "https://..."
}
```

---

### Bodian unblock

**Endpoint**: `GET /api/unblock/bodian?keyword={keyword}`

**Description**: get the unlocked playback URL from Bodian Music

**Parameters**:

- `keyword` (required): search keyword (song name - artist name)
- `songName` (optional): song name, used to verify the match
- `artist` (optional): artist name, used to verify the match

**Example response**:

```json
{
  "code": 200,
  "url": "https://..."
}
```

---

## Full API list

**Endpoint**: `GET /api`

**Description**: list all API modules

**Example response**:

```json
{
  "name": "Kraken Player API",
  "description": "Kraken Player API service",
  "author": "Kraken Player contributors",
  "list": [
    {
      "name": "NeteaseCloudMusicApi",
      "url": "/api/netease"
    },
    {
      "name": "UnblockAPI",
      "url": "/api/unblock"
    }
  ]
}
```

---

## Error handling

On error, endpoints return this format:

```json
{
  "code": 500,
  "message": "error description",
  "data": null
}
```

Common errors:

- `Main window not found`: the app's main window is not initialized
- `Playback failed`: the play operation failed
- `Failed to get status`: status retrieval failed

---

### Examples

#### cURL

```bash
# Play
curl http://localhost:25884/api/control/play

# Pause
curl http://localhost:25884/api/control/pause

# Next song
curl http://localhost:25884/api/control/next

# Get status
curl http://localhost:25884/api/control/status
```

#### JavaScript

```javascript
// Play
fetch("http://localhost:25884/api/control/play")
  .then((res) => res.json())
  .then((data) => console.log(data));

// Get status
fetch("http://localhost:25884/api/control/status")
  .then((res) => res.json())
  .then((data) => console.log(data));
```

#### Python

```python
import requests

# Play
response = requests.get('http://localhost:25884/api/control/play')
print(response.json())

# Get status
response = requests.get('http://localhost:25884/api/control/status')
print(response.json())
```

---

## Notes

1. All endpoints only work while the app is running
2. The HTTP API default port is `25884`, configurable via the `VITE_SERVER_PORT` environment variable
3. The WebSocket API default port is `25885`, changeable in the app settings
4. Unblock endpoints are for study purposes only — do not use them commercially
5. Some NetEase API features require login
6. Response times depend on network conditions and server load
7. WebSocket connections support heartbeat (PING/PONG) — clients should send heartbeats regularly to stay connected

---
