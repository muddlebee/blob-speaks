"use client";

import { Conversation } from "@elevenlabs/client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  ConvaiBootstrapOk,
  ConvaiBootstrapResponse,
} from "@/lib/convai-bootstrap-types";
import { isBootstrapError } from "@/lib/convai-bootstrap-types";
import type { ConvaiPublicConfig } from "@/lib/convai-public-config";
import { ConvaiHint } from "@/components/ConvaiHint";

type LiveConversation = Awaited<ReturnType<typeof Conversation.startSession>>;

export type BlobPinkProps = {
  convai: ConvaiPublicConfig;
};

function bootstrapUrl(): string {
  if (
    typeof globalThis !== "undefined" &&
    typeof (globalThis as unknown as { CONVAI_BOOTSTRAP_URL?: string })
      .CONVAI_BOOTSTRAP_URL === "string"
  ) {
    return (globalThis as unknown as { CONVAI_BOOTSTRAP_URL: string })
      .CONVAI_BOOTSTRAP_URL;
  }
  if (typeof window !== "undefined" && /^https?:/.test(window.location.protocol)) {
    return `${window.location.origin}/api/convai/bootstrap`;
  }
  return "http://127.0.0.1:3000/api/convai/bootstrap";
}

export function BlobPink({ convai }: BlobPinkProps) {
  const mouthPhaseRef = useRef(0);
  const talkTRef = useRef(0);
  const lastTsRef = useRef(0);
  const mouthSmileRef = useRef<SVGPathElement>(null);
  const mouthTalkRef = useRef<SVGGElement>(null);
  const mouthOuterRef = useRef<SVGEllipseElement>(null);
  const mouthInnerRef = useRef<SVGEllipseElement>(null);

  const [status, setStatus] = useState("ready");
  const [sayText, setSayText] = useState(
    "Hello! I am a happy little blob."
  );
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [rate, setRate] = useState(1);
  const [repeatAfterMe, setRepeatAfterMe] = useState(false);
  const [repeatText, setRepeatText] = useState("");
  const [listenLabel, setListenLabel] = useState("Listen");
  const [convLog, setConvLog] = useState("");
  const [convEndDisabled, setConvEndDisabled] = useState(true);
  const [convStartBusy, setConvStartBusy] = useState(false);

  const liveConvRef = useRef<LiveConversation | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [speechRecognitionReady, setSpeechRecognitionReady] = useState(false);

  const setMouthIdle = useCallback(() => {
    mouthSmileRef.current?.setAttribute("visibility", "visible");
    mouthTalkRef.current?.setAttribute("visibility", "hidden");
  }, []);

  const setMouthTalkingLayout = useCallback(() => {
    mouthSmileRef.current?.setAttribute("visibility", "hidden");
    mouthTalkRef.current?.setAttribute("visibility", "visible");
  }, []);

  const enterSpeak = useCallback(() => {
    mouthPhaseRef.current = 1;
    talkTRef.current = 0;
    setMouthTalkingLayout();
  }, [setMouthTalkingLayout]);

  const exitSpeak = useCallback(() => {
    mouthPhaseRef.current = 0;
    setMouthIdle();
  }, [setMouthIdle]);

  useEffect(() => {
    let frame = 0;
    function mouthTick(ts: number) {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.05);
      lastTsRef.current = ts;

      if (mouthPhaseRef.current === 1) {
        talkTRef.current += dt;
        const openH = 5 + 9 * Math.abs(Math.sin(talkTRef.current * 9));
        const outer = mouthOuterRef.current;
        const inner = mouthInnerRef.current;
        if (outer && inner) {
          outer.setAttribute("rx", "13");
          outer.setAttribute("ry", String(openH));
          outer.setAttribute("cx", "0");
          outer.setAttribute("cy", String(4 + openH * 0.12));
          inner.setAttribute("rx", "9");
          inner.setAttribute("ry", String(Math.max(2, openH * 0.55)));
          inner.setAttribute("cx", "0");
          inner.setAttribute("cy", String(5 + openH * 0.32));
        }
      }
      frame = requestAnimationFrame(mouthTick);
    }
    setMouthIdle();
    frame = requestAnimationFrame(mouthTick);
    return () => cancelAnimationFrame(frame);
  }, [setMouthIdle]);

  useEffect(() => {
    const synth = window.speechSynthesis;
    function loadVoices() {
      const v = synth.getVoices();
      setVoices(v);
      const prefer = v.findIndex((x) => /en-US|en-GB/i.test(x.lang));
      if (prefer >= 0) setVoiceIndex(prefer);
    }
    loadVoices();
    synth.onvoiceschanged = loadVoices;
    return () => {
      synth.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    const SR =
      typeof window !== "undefined" &&
      (window.SpeechRecognition ||
        (
          window as unknown as {
            webkitSpeechRecognition?: new () => SpeechRecognition;
          }
        ).webkitSpeechRecognition);
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const heard = e.results[0][0].transcript;
      setRepeatText(heard);
      setStatus(`heard: "${heard}"`);
      void speakRef.current?.(heard);
    };
    recognition.onerror = () => {
      setStatus("mic error");
      setListenLabel("Listen");
    };
    recognition.onend = () => setListenLabel("Listen");
    recognitionRef.current = recognition;
    setSpeechRecognitionReady(true);
  }, []);

  const endElevenLabsSession = useCallback(async () => {
    const c = liveConvRef.current;
    liveConvRef.current = null;
    if (!c) return;
    try {
      await c.endSession();
    } catch {
      /* ignore */
    }
    exitSpeak();
    setConvEndDisabled(true);
    setConvStartBusy(false);
  }, [exitSpeak]);

  const speakRef = useRef<
    ((text: string) => void | Promise<void>) | undefined
  >(undefined);

  const speak = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t) return;
      await endElevenLabsSession();
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(t);
      utt.voice = voices[voiceIndex] ?? null;
      utt.rate = rate;
      utt.onstart = () => {
        enterSpeak();
        setStatus("speaking...");
      };
      utt.onend = () => {
        exitSpeak();
        setStatus("done");
      };
      utt.onerror = () => {
        exitSpeak();
        setStatus("error");
      };
      window.speechSynthesis.speak(utt);
    },
    [endElevenLabsSession, enterSpeak, exitSpeak, rate, voiceIndex, voices]
  );

  speakRef.current = speak;

  const appendConvLog = useCallback((line: string) => {
    setConvLog((prev) => {
      const next = prev + line + "\n";
      return next;
    });
  }, []);

  const startVoiceChat = useCallback(async () => {
    if (liveConvRef.current) await endElevenLabsSession();
    window.speechSynthesis.cancel();
    exitSpeak();

    let cfg: ConvaiBootstrapResponse;
    try {
      const br = await fetch(bootstrapUrl());
      cfg = (await br.json()) as ConvaiBootstrapResponse;
      if (!br.ok || isBootstrapError(cfg)) {
        throw new Error(
          isBootstrapError(cfg) ? cfg.error : `bootstrap HTTP ${br.status}`
        );
      }
    } catch (e) {
      setStatus(
        "bootstrap: " + (e instanceof Error ? e.message : String(e))
      );
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStatus("microphone access is required for voice chat");
      return;
    }

    setConvStartBusy(true);
    setStatus("connecting…");

    const ok = cfg as ConvaiBootstrapOk;
    const envOpts =
      "environment" in ok && ok.environment
        ? { environment: ok.environment }
        : {};

    const callbacks = {
      onConnect: (props: { conversationId: string }) => {
        setConvEndDisabled(false);
        setStatus("live · speak freely");
        const cid = props.conversationId || "";
        appendConvLog(
          "— connected" + (cid ? ` ${cid.slice(0, 12)}…` : "")
        );
      },
      onDisconnect: () => {
        liveConvRef.current = null;
        exitSpeak();
        setConvEndDisabled(true);
        setConvStartBusy(false);
        appendConvLog("— disconnected");
        setStatus("ready");
      },
      onError: (msg: string) => {
        setStatus("agent: " + String(msg));
        setConvStartBusy(false);
      },
      onStatusChange: (prop: { status: string }) => {
        if (prop.status === "connecting") setStatus("connecting…");
        if (prop.status === "connected") setStatus("live · speak freely");
      },
      onModeChange: (prop: { mode: string }) => {
        if (prop.mode === "speaking") enterSpeak();
        else exitSpeak();
      },
      onMessage: (props: {
        role?: string;
        source?: string;
        message?: string;
      }) => {
        let role = props.role;
        if (!role && props.source) {
          role = props.source === "user" ? "user" : "agent";
        }
        if (props.message) {
          appendConvLog(`${role || "?"}: ${props.message}`);
        }
      },
    };

    try {
      let session: Record<string, unknown>;
      if (ok.mode === "token") {
        session = {
          ...callbacks,
          ...envOpts,
          conversationToken: ok.token,
          connectionType: ok.connectionType || "webrtc",
        };
      } else if (ok.mode === "signedUrl") {
        session = {
          ...callbacks,
          ...envOpts,
          signedUrl: ok.signedUrl,
          connectionType: "websocket",
        };
      } else if (ok.mode === "public") {
        session = {
          ...callbacks,
          ...envOpts,
          agentId: ok.agentId,
          connectionType: ok.connectionType || "webrtc",
        };
      } else {
        throw new Error("Unknown bootstrap mode");
      }
      liveConvRef.current = await Conversation.startSession(
        session as Parameters<typeof Conversation.startSession>[0]
      );
    } catch (e) {
      setStatus("could not start session — check .env and HTTPS");
      setConvStartBusy(false);
      console.error(e);
    }
  }, [
    appendConvLog,
    endElevenLabsSession,
    enterSpeak,
    exitSpeak,
  ]);

  const onListen = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    setListenLabel("Listening…");
    setStatus("listening...");
    try {
      recognition.start();
    } catch {
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <div className="blob-root">
      <div className="blob-stage" aria-hidden>
        <div className="blob-wrap">
          <svg
            className="blob-svg"
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient
                id="blobGrad"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" style={{ stopColor: "var(--blob)" }} />
                <stop
                  offset="100%"
                  style={{ stopColor: "var(--blob-dark)" }}
                />
              </linearGradient>
            </defs>
            <path
              fill="url(#blobGrad)"
              d="M100 22 C 152 22 188 58 188 108 C 188 158 148 188 100 188 C 52 188 12 158 12 108 C 12 58 48 22 100 22 Z"
            />
            <g transform="translate(76, 98)">
              <ellipse cx="0" cy="0" rx="13" ry="17" fill="#2a2438" />
              <ellipse
                cx="3"
                cy="-5"
                rx="4"
                ry="5"
                fill="#fff"
                opacity={0.92}
              />
            </g>
            <g transform="translate(124, 98)">
              <ellipse cx="0" cy="0" rx="13" ry="17" fill="#2a2438" />
              <ellipse
                cx="3"
                cy="-5"
                rx="4"
                ry="5"
                fill="#fff"
                opacity={0.92}
              />
            </g>
            <g transform="translate(100, 132)">
              <path
                ref={mouthSmileRef}
                fill="none"
                stroke="#4a3d5c"
                strokeWidth={3}
                strokeLinecap="round"
                d="M-16 0 Q0 9 16 0"
                visibility="visible"
              />
              <g ref={mouthTalkRef} visibility="hidden">
                <ellipse
                  ref={mouthOuterRef}
                  cx="0"
                  cy="4"
                  rx="13"
                  ry="8"
                  fill="#4a3d5c"
                />
                <ellipse
                  ref={mouthInnerRef}
                  cx="0"
                  cy="6"
                  rx="9"
                  ry="4.5"
                  fill="#3a3048"
                />
              </g>
            </g>
          </svg>
        </div>
      </div>

      <div className="blob-status">{status}</div>

      <div className="blob-controls">
        <textarea
          value={sayText}
          onChange={(e) => setSayText(e.target.value)}
          placeholder="Type something for the blob to say..."
        />
        <div className="blob-row">
          <label htmlFor="voiceSel">Voice</label>
          <select
            id="voiceSel"
            value={voiceIndex}
            onChange={(e) => setVoiceIndex(Number(e.target.value))}
            aria-label="Voice"
          >
            {voices.map((v, i) => (
              <option key={`${v.name}-${v.lang}-${i}`} value={i}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>
        <div className="blob-row">
          <label htmlFor="rate">Speed</label>
          <input
            id="rate"
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
          />
          <span
            style={{
              fontSize: 13,
              minWidth: 30,
              color: "var(--muted)",
            }}
          >
            {rate.toFixed(1)}×
          </span>
        </div>
        <label className="blob-toggle">
          <input
            type="checkbox"
            checked={repeatAfterMe}
            onChange={(e) => setRepeatAfterMe(e.target.checked)}
          />
          <span>Repeat after me mode</span>
        </label>
        <div className={repeatAfterMe ? "" : "blob-hidden"}>
          <textarea
            value={repeatText}
            onChange={(e) => setRepeatText(e.target.value)}
            onBlur={() => {
              if (repeatAfterMe && repeatText.trim()) void speak(repeatText.trim());
            }}
            placeholder="Paste or type what you said..."
            style={{ height: 52, marginTop: 4 }}
          />
        </div>
        <div className="blob-btn-row">
          <button type="button" onClick={() => void speak(sayText)}>
            Speak
          </button>
          <button
            type="button"
            onClick={() => {
              void endElevenLabsSession();
              window.speechSynthesis.cancel();
              exitSpeak();
              setStatus("stopped");
            }}
          >
            Stop
          </button>
        </div>
        <div className={repeatAfterMe ? "" : "blob-hidden"}>
          <button
            type="button"
            className="blob-listen-btn"
            disabled={!speechRecognitionReady}
            onClick={onListen}
          >
            {listenLabel}
          </button>
        </div>

        <p className="blob-section-label">ElevenLabs · voice agent</p>
        <div className="blob-btn-row">
          <button
            type="button"
            disabled={convStartBusy}
            onClick={() => void startVoiceChat()}
          >
            Start voice chat
          </button>
          <button
            type="button"
            className="blob-conv-end"
            disabled={convEndDisabled}
            onClick={() => void endElevenLabsSession()}
          >
            End chat
          </button>
        </div>
        <textarea
          className="blob-conv-log"
          readOnly
          value={convLog}
          placeholder="Transcript…"
        />
        <ConvaiHint convai={convai} />
      </div>
    </div>
  );
}
