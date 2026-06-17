import type { PluginContext, Tool, ToolCallResult, ToolContext } from './types.ts';

let pluginConfig: Record<string, unknown> = {};

export async function onLoad(ctx: PluginContext): Promise<void> {
  pluginConfig = await ctx.config.get() as Record<string, unknown>;
}

export async function onUnload(_ctx: PluginContext): Promise<void> {}

const zoomJoinMeetingTool: Tool = {
  definition: {
    name: 'zoom_join_meeting',
    description: 'Join a Zoom meeting as a bot',
    params: [
      { name: 'meeting_id', type: 'string', description: 'Zoom meeting ID', required: true },
      {
        name: 'meeting_password',
        type: 'string',
        description: 'Zoom meeting password',
        required: false,
      },
      {
        name: 'display_name',
        type: 'string',
        description: 'Display name for the bot',
        required: false,
        default: 'CortexPrism Bot',
      },
    ],
    capabilities: ['shell:run', 'network:fetch'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const meetingId = args.meeting_id as string;
      if (!meetingId) {
        return {
          toolName: 'zoom_join_meeting',
          success: false,
          output: '',
          error: 'meeting_id is required',
          durationMs: Date.now() - start,
        };
      }

      const clientId = pluginConfig.zoomClientId as string;
      const clientSecret = pluginConfig.zoomClientSecret as string;
      const accountId = pluginConfig.zoomAccountId as string;

      if (!clientId || !clientSecret || !accountId) {
        return {
          toolName: 'zoom_join_meeting',
          success: false,
          output: '',
          error: 'Zoom not configured. Set zoomClientId, zoomClientSecret, and zoomAccountId.',
          durationMs: Date.now() - start,
        };
      }

      const displayName = (args.display_name as string) ?? 'CortexPrism Bot';
      const password = args.meeting_password as string | undefined;

      const tokenResponse = await fetch(
        `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          },
        },
      );

      if (!tokenResponse.ok) {
        return {
          toolName: 'zoom_join_meeting',
          success: false,
          output: '',
          error: `Zoom auth error: ${tokenResponse.status}`,
          durationMs: Date.now() - start,
        };
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token as string;

      const meetingBody: Record<string, unknown> = {
        meeting_id: meetingId,
        display_name: displayName,
        auto_record: pluginConfig.autoRecord as boolean ?? false,
      };
      if (password) meetingBody.password = password;

      const response = await fetch(
        'https://api.zoom.us/v2/meetings/join',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(meetingBody),
        },
      );

      if (!response.ok) {
        return {
          toolName: 'zoom_join_meeting',
          success: false,
          output: '',
          error: `Zoom API error: ${response.status}`,
          durationMs: Date.now() - start,
        };
      }

      const data = await response.json();
      return {
        toolName: 'zoom_join_meeting',
        success: true,
        output: JSON.stringify(data),
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'zoom_join_meeting',
        success: false,
        output: '',
        error: `Failed to join meeting: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const zoomRecordTool: Tool = {
  definition: {
    name: 'zoom_record',
    description: 'Start or stop recording a Zoom meeting',
    params: [
      { name: 'meeting_id', type: 'string', description: 'Zoom meeting ID', required: true },
      {
        name: 'action',
        type: 'string',
        description: 'Recording action',
        required: true,
        enum: ['start', 'stop'],
      },
    ],
    capabilities: ['network:fetch'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const meetingId = args.meeting_id as string;
      const action = args.action as string;

      if (!meetingId || !action) {
        return {
          toolName: 'zoom_record',
          success: false,
          output: '',
          error: 'meeting_id and action are required',
          durationMs: Date.now() - start,
        };
      }

      if (!['start', 'stop'].includes(action)) {
        return {
          toolName: 'zoom_record',
          success: false,
          output: '',
          error: 'action must be "start" or "stop"',
          durationMs: Date.now() - start,
        };
      }

      const clientId = pluginConfig.zoomClientId as string;
      const clientSecret = pluginConfig.zoomClientSecret as string;
      const accountId = pluginConfig.zoomAccountId as string;

      if (!clientId || !clientSecret || !accountId) {
        return {
          toolName: 'zoom_record',
          success: false,
          output: '',
          error: 'Zoom not configured',
          durationMs: Date.now() - start,
        };
      }

      const tokenResponse = await fetch(
        `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
        {
          method: 'POST',
          headers: { Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}` },
        },
      );

      if (!tokenResponse.ok) {
        return {
          toolName: 'zoom_record',
          success: false,
          output: '',
          error: `Zoom auth error: ${tokenResponse.status}`,
          durationMs: Date.now() - start,
        };
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token as string;

      const endpoint = action === 'start'
        ? `https://api.zoom.us/v2/meetings/${meetingId}/recordings`
        : `https://api.zoom.us/v2/meetings/${meetingId}/recordings/stop`;

      const response = await fetch(endpoint, {
        method: action === 'start' ? 'POST' : 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        return {
          toolName: 'zoom_record',
          success: false,
          output: '',
          error: `Zoom API error: ${response.status}`,
          durationMs: Date.now() - start,
        };
      }

      return {
        toolName: 'zoom_record',
        success: true,
        output: `Recording ${action}ed for meeting ${meetingId}`,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'zoom_record',
        success: false,
        output: '',
        error: `Failed to ${(args.action as string) || 'manage'} recording: ${
          error instanceof Error ? error.message : String(error)
        }`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const zoomTranscribeTool: Tool = {
  definition: {
    name: 'zoom_transcribe',
    description: 'Transcribe a Zoom recording',
    params: [
      {
        name: 'recording_file',
        type: 'string',
        description: 'Path to recording file',
        required: true,
      },
      {
        name: 'language',
        type: 'string',
        description: 'Language code for transcription',
        required: false,
        default: 'en',
      },
      {
        name: 'output_format',
        type: 'string',
        description: 'Output format for transcript',
        required: false,
        enum: ['text', 'srt', 'vtt'],
        default: 'text',
      },
    ],
    capabilities: ['shell:run'],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const recordingFile = args.recording_file as string;
      if (!recordingFile) {
        return {
          toolName: 'zoom_transcribe',
          success: false,
          output: '',
          error: 'recording_file is required',
          durationMs: Date.now() - start,
        };
      }

      const language = (args.language as string) ?? pluginConfig.defaultLanguage as string ?? 'en';
      const outputFormat = (args.output_format as string) ?? 'text';

      if (!['text', 'srt', 'vtt'].includes(outputFormat)) {
        return {
          toolName: 'zoom_transcribe',
          success: false,
          output: '',
          error: 'output_format must be one of: text, srt, vtt',
          durationMs: Date.now() - start,
        };
      }

      let ext: string;
      switch (outputFormat) {
        case 'srt':
          ext = '.srt';
          break;
        case 'vtt':
          ext = '.vtt';
          break;
        default:
          ext = '.txt';
          break;
      }
      const outputFile = recordingFile.replace(/\.[^.]+$/, '') + '_transcript' + ext;

      return {
        toolName: 'zoom_transcribe',
        success: true,
        output: JSON.stringify({
          recording_file: recordingFile,
          language,
          output_format: outputFormat,
          output_file: outputFile,
          status:
            'Transcription requires external speech-to-text engine. Configure with your preferred STT provider.',
        }),
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'zoom_transcribe',
        success: false,
        output: '',
        error: `Failed to transcribe: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const zoomGenerateSummaryTool: Tool = {
  definition: {
    name: 'zoom_generate_summary',
    description: 'Generate a meeting summary from transcript',
    params: [
      {
        name: 'transcript',
        type: 'string',
        description: 'Meeting transcript text',
        required: true,
      },
      {
        name: 'meeting_title',
        type: 'string',
        description: 'Title of the meeting',
        required: false,
      },
    ],
    capabilities: [],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const transcript = args.transcript as string;
      if (!transcript) {
        return {
          toolName: 'zoom_generate_summary',
          success: false,
          output: '',
          error: 'transcript is required',
          durationMs: Date.now() - start,
        };
      }

      const meetingTitle = args.meeting_title as string || 'Meeting';
      const lines = transcript.split('\n').filter((l) => l.trim());
      const wordCount = transcript.split(/\s+/).filter(Boolean).length;

      const summary = {
        meeting_title: meetingTitle,
        word_count: wordCount,
        line_count: lines.length,
        estimated_duration_minutes: Math.ceil(wordCount / 150),
        key_points: lines.slice(0, 5),
        summary:
          `Transcript for "${meetingTitle}" contains ${lines.length} lines and approximately ${wordCount} words.`,
      };

      return {
        toolName: 'zoom_generate_summary',
        success: true,
        output: JSON.stringify(summary, null, 2),
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'zoom_generate_summary',
        success: false,
        output: '',
        error: `Failed to generate summary: ${
          error instanceof Error ? error.message : String(error)
        }`,
        durationMs: Date.now() - start,
      };
    }
  },
};

const zoomExtractActionsTool: Tool = {
  definition: {
    name: 'zoom_extract_actions',
    description: 'Extract action items from meeting transcript',
    params: [
      {
        name: 'transcript',
        type: 'string',
        description: 'Meeting transcript text',
        required: true,
      },
    ],
    capabilities: [],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const transcript = args.transcript as string;
      if (!transcript) {
        return {
          toolName: 'zoom_extract_actions',
          success: false,
          output: '',
          error: 'transcript is required',
          durationMs: Date.now() - start,
        };
      }

      const actionKeywords = [
        'action item',
        'todo',
        'to-do',
        'assign',
        'follow up',
        'follow-up',
        'deadline',
        'deliverable',
      ];
      const lines = transcript.split('\n');
      const actionLines = lines.filter((line) =>
        actionKeywords.some((kw) => line.toLowerCase().includes(kw))
      );

      const actions = actionLines.length > 0
        ? actionLines.map((line, i) => `${i + 1}. ${line.trim()}`).join('\n')
        : 'No explicit action items detected in transcript.';

      return {
        toolName: 'zoom_extract_actions',
        success: true,
        output: actions,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        toolName: 'zoom_extract_actions',
        success: false,
        output: '',
        error: `Failed to extract actions: ${
          error instanceof Error ? error.message : String(error)
        }`,
        durationMs: Date.now() - start,
      };
    }
  },
};

export const tools: Tool[] = [
  zoomJoinMeetingTool,
  zoomRecordTool,
  zoomTranscribeTool,
  zoomGenerateSummaryTool,
  zoomExtractActionsTool,
];
