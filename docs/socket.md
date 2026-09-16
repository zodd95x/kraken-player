# WebSocket API

**Base path**: `ws://localhost:25885` (default port, changeable in settings)

## Overview

The WebSocket API provides real-time two-way communication: control the player and receive playback status updates.

## Connecting

```javascript
const ws = new WebSocket("ws://localhost:25885");
```

## Message format

All messages follow this JSON format:

```json
{
  "type": "message type",
  "data": {}
}
```

## Controlling the player

**Message type**: `control`

**Request format**:

```json
{
  "type": "control",
  "data": {
    "command": "toggle|play|pause|next|prev"
  }
}
```

**Commands**:

- `toggle` - play/pause toggle
- `play` - play
- `pause` - pause
- `next` - next song
- `prev` - previous song

**Response format**:

Success:

```json
{
  "type": "control-response",
  "data": {
    "success": true,
    "command": "toggle",
    "message": "Play/pause command executed"
  }
}
```

Error:

```json
{
  "type": "error",
  "data": {
    "message": "error message"
  }
}
```

**Example**:

```javascript
// Connect
const ws = new WebSocket("ws://localhost:25885");

// Send control commands once connected
ws.onopen = () => {
  // Play/pause toggle
  ws.send(
    JSON.stringify({
      type: "control",
      data: {
        command: "toggle",
      },
    }),
  );

  // Next song
  ws.send(
    JSON.stringify({
      type: "control",
      data: {
        command: "next",
      },
    }),
  );
};

// Receive messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log("Message received:", message);
};
```

## Getting info

**Message type**: `get-song-info`

**Request format**:

```json
{
  "type": "get-song-info"
}
```

**Response format**:

Success:

```json
{
  "type": "song-info",
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

Error:

```json
{
  "type": "error",
  "data": {
    "message": "Failed to get current playback info"
  }
}
```

## Broadcast events

When the player state changes, the server broadcasts a message to all connected clients.

### Welcome message

Sent automatically after connecting:

```json
{
  "type": "welcome",
  "data": {
    "message": "Welcome to the Kraken Player WebSocket service",
    "timestamp": 1234567890123
  }
}
```

### Playback status updates

Fired when play/pause state changes:

```json
{
  "type": "status-change",
  "data": {
    "status": true, // true: playing, false: paused
    "timestamp": 1234567890123
  }
}
```

### Song info updates

Fired when the song changes or its info finishes loading:

```json
{
  "type": "song-change",
  "data": {
    "title": "song name - artist",
    "name": "song name",
    "artist": "artist",
    "album": "album name",
    "duration": 240000, // total length (ms)
    "timestamp": 1234567890123
  }
}
```

### Progress updates

Fired in real time during playback (about every 500ms):

```json
{
  "type": "progress-change",
  "data": {
    "currentTime": 12000, // current position (ms)
    "duration": 240000, // total length (ms)
    "timestamp": 1234567890123
  }
}
```

### Lyric updates

Fired when lyric data loads or changes:

```json
{
  "type": "lyric-change",
  "data": {
    "lrcData": [], // plain lyric lines
    "yrcData": [], // word-by-word lyric lines
    "timestamp": 1234567890123
  }
}
```

## Heartbeat

Clients can send a `PING` message as a heartbeat — the server automatically replies `PONG`:

```javascript
// Send heartbeat
ws.send("PING");

// Server automatically replies PONG
```

## Error handling

On error, the server sends an error message:

```json
{
  "type": "error",
  "data": {
    "message": "error description"
  }
}
```

Common errors:

- `Application not found or destroyed` - the main app window is not initialized
- `Missing command parameter` - the control command lacks a required parameter
- `Unknown control command` - unsupported control command
- `Malformed message` - the message is not valid JSON
