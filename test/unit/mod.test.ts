// deno-lint-ignore-file require-await
import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { tools } from '../../mod.ts';
import type { PluginContext } from 'cortex/plugins';

const mockContext: PluginContext = {
  pluginId: 'cortex-plugin-zoom-transcriber',
  pluginDir: '/tmp/plugins/cortex-plugin-zoom-transcriber',
  state: {
    get: async () => null,
    set: async () => {},
  },
  config: {},
};

function findTool(name: string) {
  return tools.find((t) => t.definition.name === name);
}

Deno.test('zoom_join_meeting - rejects missing meeting_id', async () => {
  const tool = findTool('zoom_join_meeting');
  if (!tool) throw new Error('zoom_join_meeting tool not found');

  const result = await tool.execute({}, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'meeting_id');
});

Deno.test('zoom_join_meeting - rejects missing API config', async () => {
  const tool = findTool('zoom_join_meeting');
  if (!tool) throw new Error('zoom_join_meeting tool not found');

  const result = await tool.execute({ meeting_id: '123456789' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'not configured');
});

Deno.test('zoom_join_meeting - accepts optional display_name', async () => {
  const tool = findTool('zoom_join_meeting');
  if (!tool) throw new Error('zoom_join_meeting tool not found');

  const result = await tool.execute({
    meeting_id: '123456789',
    display_name: 'Test Bot',
  }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'not configured');
});

Deno.test('zoom_record - rejects missing required params', async () => {
  const tool = findTool('zoom_record');
  if (!tool) throw new Error('zoom_record tool not found');

  const result = await tool.execute({}, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'required');
});

Deno.test('zoom_record - rejects invalid action', async () => {
  const tool = findTool('zoom_record');
  if (!tool) throw new Error('zoom_record tool not found');

  const result = await tool.execute({
    meeting_id: '123456789',
    action: 'pause',
  }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'must be');
});

Deno.test('zoom_record - rejects missing API config with valid action', async () => {
  const tool = findTool('zoom_record');
  if (!tool) throw new Error('zoom_record tool not found');

  const result = await tool.execute({
    meeting_id: '123456789',
    action: 'start',
  }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'not configured');
});

Deno.test('zoom_transcribe - rejects missing recording_file', async () => {
  const tool = findTool('zoom_transcribe');
  if (!tool) throw new Error('zoom_transcribe tool not found');

  const result = await tool.execute({}, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'recording_file');
});

Deno.test('zoom_transcribe - transcribes with default settings', async () => {
  const tool = findTool('zoom_transcribe');
  if (!tool) throw new Error('zoom_transcribe tool not found');

  const result = await tool.execute({ recording_file: '/tmp/meeting.mp4' }, mockContext);
  assertEquals(result.success, true);
  const output = JSON.parse(result.output);
  assertEquals(output.recording_file, '/tmp/meeting.mp4');
  assertEquals(output.language, 'en');
  assertEquals(output.output_format, 'text');
  assertEquals(output.output_file, '/tmp/meeting_transcript.txt');
});

Deno.test('zoom_transcribe - accepts custom language and output format', async () => {
  const tool = findTool('zoom_transcribe');
  if (!tool) throw new Error('zoom_transcribe tool not found');

  const result = await tool.execute({
    recording_file: '/tmp/meeting.mp4',
    language: 'es',
    output_format: 'srt',
  }, mockContext);
  assertEquals(result.success, true);
  const output = JSON.parse(result.output);
  assertEquals(output.language, 'es');
  assertEquals(output.output_format, 'srt');
  assertEquals(output.output_file, '/tmp/meeting_transcript.srt');
});

Deno.test('zoom_transcribe - rejects invalid output_format', async () => {
  const tool = findTool('zoom_transcribe');
  if (!tool) throw new Error('zoom_transcribe tool not found');

  const result = await tool.execute({
    recording_file: '/tmp/meeting.mp4',
    output_format: 'docx',
  }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'must be one of');
});

Deno.test('zoom_generate_summary - rejects missing transcript', async () => {
  const tool = findTool('zoom_generate_summary');
  if (!tool) throw new Error('zoom_generate_summary tool not found');

  const result = await tool.execute({}, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'transcript');
});

Deno.test('zoom_generate_summary - generates summary from transcript', async () => {
  const tool = findTool('zoom_generate_summary');
  if (!tool) throw new Error('zoom_generate_summary tool not found');

  const result = await tool.execute({
    transcript:
      "Alice: Let's discuss the API.\nBob: I'll handle the backend.\nAlice: Great, deadline is Friday.",
    meeting_title: 'API Planning',
  }, mockContext);
  assertEquals(result.success, true);
  const output = JSON.parse(result.output);
  assertEquals(output.meeting_title, 'API Planning');
  assertEquals(output.line_count, 3);
  assertEquals(output.word_count > 0, true);
  assertEquals(output.key_points.length, 3);
});

Deno.test('zoom_generate_summary - uses default meeting title', async () => {
  const tool = findTool('zoom_generate_summary');
  if (!tool) throw new Error('zoom_generate_summary tool not found');

  const result = await tool.execute({ transcript: 'Hello world' }, mockContext);
  assertEquals(result.success, true);
  const output = JSON.parse(result.output);
  assertEquals(output.meeting_title, 'Meeting');
});

Deno.test('zoom_extract_actions - rejects missing transcript', async () => {
  const tool = findTool('zoom_extract_actions');
  if (!tool) throw new Error('zoom_extract_actions tool not found');

  const result = await tool.execute({}, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, 'transcript');
});

Deno.test('zoom_extract_actions - extracts action items from transcript', async () => {
  const tool = findTool('zoom_extract_actions');
  if (!tool) throw new Error('zoom_extract_actions tool not found');

  const result = await tool.execute({
    transcript:
      "Let's discuss the project.\nAction item: Alice will update the docs.\nBob has a todo to fix the login bug.\nWe'll follow up next week.",
  }, mockContext);
  assertEquals(result.success, true);
  assertStringIncludes(result.output, 'action item');
});

Deno.test('zoom_extract_actions - returns no actions for empty transcript', async () => {
  const tool = findTool('zoom_extract_actions');
  if (!tool) throw new Error('zoom_extract_actions tool not found');

  const result = await tool.execute({
    transcript: 'Just a normal conversation without any tasks.',
  }, mockContext);
  assertEquals(result.success, true);
  assertStringIncludes(result.output, 'No explicit action items');
});

Deno.test('tools array exported', () => {
  assertEquals(tools.length, 5);
  assertEquals(tools[0].definition.name, 'zoom_join_meeting');
  assertEquals(tools[1].definition.name, 'zoom_record');
  assertEquals(tools[2].definition.name, 'zoom_transcribe');
  assertEquals(tools[3].definition.name, 'zoom_generate_summary');
  assertEquals(tools[4].definition.name, 'zoom_extract_actions');
});
