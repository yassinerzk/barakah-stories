import { forwardRef, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { File, Paths } from 'expo-file-system';
import { MEDIA_BASE } from './catalog';

/**
 * Video export without a native encoder (Expo Go, iOS): a hidden WebView runs
 * the encoder page from the app's site, which uses the browser's own hardware
 * encoder (WebCodecs). Everything stays on the phone; the MP4 comes back in
 * base64 pieces and is written to the cache for sharing.
 */
const ENCODER_URL = MEDIA_BASE.replace(/media\/$/, '') + 'encoder.html';

export interface WebComposeInput {
  backgroundUrl: string;
  soundUrl: string | null;
  /** The text layer as a data:image/png;base64 URI. */
  overlay: string;
  durationSec: number;
}

export interface WebEncoderHandle {
  compose: (input: WebComposeInput, onProgress: (p: number) => void) => Promise<{ uri: string; silent: boolean }>;
}

interface Pending {
  id: string;
  chunks: string[];
  onProgress: (p: number) => void;
  resolve: (v: { uri: string; silent: boolean }) => void;
  reject: (e: Error) => void;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const WebEncoder = forwardRef<WebEncoderHandle>(function WebEncoder(_props, ref) {
  const web = useRef<WebView>(null);
  const ready = useRef<Promise<void> | null>(null);
  const markReady = useRef<() => void>(() => undefined);
  const pending = useRef<Pending | null>(null);

  if (!ready.current) {
    ready.current = new Promise((resolve) => {
      markReady.current = resolve;
    });
  }

  useImperativeHandle(ref, () => ({
    compose: async (input, onProgress) => {
      await Promise.race([
        ready.current,
        new Promise((_, reject) => setTimeout(() => reject(new Error('The video encoder did not load')), 20_000)),
      ]);
      return new Promise((resolve, reject) => {
        const id = `${Date.now()}`;
        pending.current = { id, chunks: [], onProgress, resolve, reject };
        web.current?.postMessage(JSON.stringify({ type: 'compose', id, ...input }));
      });
    },
  }));

  const onMessage = (e: WebViewMessageEvent) => {
    let msg: { type: string; id?: string; p?: number; i?: number; data?: string; total?: number; silent?: boolean; message?: string };
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'ready') {
      markReady.current();
      return;
    }
    const job = pending.current;
    if (!job || msg.id !== job.id) return;
    if (msg.type === 'progress' && typeof msg.p === 'number') job.onProgress(msg.p);
    else if (msg.type === 'chunk' && typeof msg.i === 'number' && msg.data) job.chunks[msg.i] = msg.data;
    else if (msg.type === 'error') {
      pending.current = null;
      job.reject(new Error(msg.message || 'Video export failed'));
    } else if (msg.type === 'done') {
      pending.current = null;
      try {
        const parts = job.chunks.slice(0, msg.total ?? job.chunks.length).map(base64ToBytes);
        const size = parts.reduce((n, p) => n + p.length, 0);
        const bytes = new Uint8Array(size);
        let off = 0;
        for (const p of parts) {
          bytes.set(p, off);
          off += p.length;
        }
        const file = new File(Paths.cache, `story-web-${job.id}.mp4`);
        file.write(bytes);
        job.resolve({ uri: file.uri, silent: !!msg.silent });
      } catch (err) {
        job.reject(err instanceof Error ? err : new Error('Could not save the video'));
      }
    }
  };

  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: 2, height: 2, opacity: 0.01, left: 0, top: 0 }}>
      <WebView
        ref={web}
        source={{ uri: ENCODER_URL }}
        onMessage={onMessage}
        javaScriptEnabled
        originWhitelist={['https://*']}
        mediaPlaybackRequiresUserAction={false}
        style={{ width: 2, height: 2, backgroundColor: 'transparent' }}
      />
    </View>
  );
});
