# Zoom/Google Meet Transcriber

Join meetings as a bot, transcribe in real-time, and generate summaries.

## Installation

```bash
cortex plugin install github:CortexPrism/cortex-plugin-zoom-transcriber
```

## Tools

### zoom_join_meeting

Join a Zoom meeting as a bot.

- `meeting_id` (string, required) — Zoom meeting ID
- `meeting_password` (string, optional) — Meeting password
- `display_name` (string, default: "CortexPrism Bot") — Bot display name

### zoom_record

Start or stop recording.

- `meeting_id` (string, required) — Zoom meeting ID
- `action` (enum: start, stop, required) — Recording action

### zoom_transcribe

Transcribe a Zoom recording.

- `recording_file` (string, required) — Recording file path
- `language` (string, default: "en") — Language code
- `output_format` (enum: text, srt, vtt, default: text) — Output format

### zoom_generate_summary

Generate meeting summary from transcript.

- `transcript` (string, required) — Meeting transcript text
- `meeting_title` (string, optional) — Meeting title

### zoom_extract_actions

Extract action items from transcript.

- `transcript` (string, required) — Meeting transcript text

## Configuration

| Field            | Type    | Required | Description                           |
| ---------------- | ------- | -------- | ------------------------------------- |
| zoomClientId     | text    | Yes      | Zoom app client ID                    |
| zoomClientSecret | secret  | Yes      | Zoom app client secret                |
| zoomAccountId    | text    | Yes      | Zoom account ID                       |
| defaultLanguage  | text    | No       | Default language code (default: "en") |
| autoRecord       | boolean | No       | Auto-record on join (default: false)  |

## License

MIT
