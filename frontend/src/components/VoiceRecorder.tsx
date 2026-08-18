import { useCallback, useEffect, useRef, useState } from "react";
import { isApiClientError, transcribeSpeech } from "../api";

type RecorderStatus = "idle" | "requesting" | "recording" | "transcribing" | "error";

interface VoiceRecorderProps {
  disabled: boolean;
  onTranscript: (transcript: string) => boolean;
}

const MAX_RECORDING_SECONDS = 30;

const formatTimer = (seconds: number) => `0:${String(seconds).padStart(2, "0")}`;

const recordingMimeType = () => [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
].find((type) => MediaRecorder.isTypeSupported(type));

const transcriptionErrorMessage = (error: unknown) => {
  if (!isApiClientError(error)) return "The recording could not be transcribed. Please try again.";
  const messages: Record<string, string> = {
    EMPTY_SPEECH: "No speech was detected. Please record again and speak clearly.",
    UNSUPPORTED_AUDIO_TYPE: "This browser produced an unsupported audio format.",
    PAYLOAD_TOO_LARGE: "The recording is too large to transcribe.",
    TRANSCRIPTION_TIMEOUT: "Transcription took too long. Please try a shorter recording.",
    TRANSCRIPTION_RATE_LIMITED: "Speech transcription is busy. Please wait briefly and try again.",
    TRANSCRIPTION_UNAVAILABLE: "Speech transcription is not configured on the server.",
    TRANSCRIPTION_FAILED: "Sarvam could not transcribe this recording. Please try again.",
    NETWORK_ERROR: "The transcription service could not be reached.",
  };
  return messages[error.code] ?? "The recording could not be transcribed. Please try again.";
};

export const VoiceRecorder = ({ disabled, onTranscript }: VoiceRecorderProps) => {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maximumTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptionControllerRef = useRef<AbortController | null>(null);
  const cancelRequestedRef = useRef(false);

  const clearCaptureResources = useCallback(() => {
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (maximumTimerRef.current) clearTimeout(maximumTimerRef.current);
    maximumTimerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioContextRef.current) void audioContextRef.current.close();
    audioContextRef.current = null;
    recorderRef.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
  }, []);

  useEffect(() => () => {
    cancelRequestedRef.current = true;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    transcriptionControllerRef.current?.abort();
    clearCaptureResources();
  }, [clearCaptureResources]);

  const drawWaveform = useCallback((analyser: AnalyserNode) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const samples = new Uint8Array(analyser.frequencyBinCount);
    let displayedEnergy = 0;
    const draw = () => {
      analyser.getByteTimeDomainData(samples);
      const width = Math.max(240, canvas.clientWidth * window.devicePixelRatio);
      const height = Math.max(46, canvas.clientHeight * window.devicePixelRatio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.clearRect(0, 0, width, height);
      context.strokeStyle = "#2563eb";
      context.lineWidth = 2 * window.devicePixelRatio;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.beginPath();
      const rootMeanSquare = Math.sqrt(samples.reduce((total, sample) => {
        const normalized = (sample - 128) / 128;
        return total + normalized * normalized;
      }, 0) / samples.length);
      const targetEnergy = Math.min(1, rootMeanSquare * 14);
      displayedEnergy = (displayedEnergy * 0.76) + (targetEnergy * 0.24);
      const amplitude = height * (0.07 + displayedEnergy * 0.39);
      const cycles = Math.max(10, width / (38 * window.devicePixelRatio));
      const phase = performance.now() / 145;
      const step = Math.max(1, 1.5 * window.devicePixelRatio);
      for (let x = 0; x <= width; x += step) {
        const progress = x / width;
        const envelope = 0.82 + (0.18 * Math.sin(progress * Math.PI));
        const voiceTexture = 1 + (displayedEnergy * 0.12 * Math.sin((progress * cycles * Math.PI * 4) - phase * 0.7));
        const y = (height / 2) + Math.sin((progress * cycles * Math.PI * 2) - phase) * amplitude * envelope * voiceTexture;
        if (x === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
      animationFrameRef.current = requestAnimationFrame(draw);
    };
    draw();
  }, []);

  const startRecording = async () => {
    setErrorMessage(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined" || typeof AudioContext === "undefined") {
      setStatus("error");
      setErrorMessage("Voice recording is not supported by this browser.");
      return;
    }
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (stream.getAudioTracks().length === 0) {
        stream.getTracks().forEach((track) => track.stop());
        setStatus("error");
        setErrorMessage("No microphone was detected. Connect a microphone and try again.");
        return;
      }
      streamRef.current = stream;
      cancelRequestedRef.current = false;
      const chunks: BlobPart[] = [];
      const preferredMimeType = recordingMimeType();
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => {
        cancelRequestedRef.current = true;
        clearCaptureResources();
        setStatus("error");
        setErrorMessage("Recording failed. Check the microphone and try again.");
      };
      recorder.onstop = async () => {
        const cancelled = cancelRequestedRef.current;
        const mimeType = recorder.mimeType || preferredMimeType || "audio/webm";
        const audio = new Blob(chunks, { type: mimeType });
        clearCaptureResources();
        setElapsedSeconds(0);
        if (cancelled) {
          setStatus("idle");
          return;
        }
        if (audio.size === 0) {
          setStatus("error");
          setErrorMessage("No audio was captured. Check the microphone and try again.");
          return;
        }
        setStatus("transcribing");
        const controller = new AbortController();
        transcriptionControllerRef.current = controller;
        try {
          const result = await transcribeSpeech(audio, controller.signal);
          if (!onTranscript(result.data.transcript)) {
            setStatus("error");
            setErrorMessage("The transcript is too long to add to the requirement.");
            return;
          }
          setStatus("idle");
        } catch (error) {
          if (controller.signal.aborted) return;
          setStatus("error");
          setErrorMessage(transcriptionErrorMessage(error));
        } finally {
          if (transcriptionControllerRef.current === controller) transcriptionControllerRef.current = null;
        }
      };

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1_024;
      analyser.smoothingTimeConstant = 0.82;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      if (audioContext.state === "suspended") await audioContext.resume();

      recorder.start(250);
      setElapsedSeconds(0);
      setStatus("recording");
      const startedAt = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.min(MAX_RECORDING_SECONDS, Math.floor((Date.now() - startedAt) / 1_000)));
      }, 250);
      maximumTimerRef.current = setTimeout(stopRecording, MAX_RECORDING_SECONDS * 1_000);
      requestAnimationFrame(() => drawWaveform(analyser));
    } catch (error) {
      clearCaptureResources();
      setStatus("error");
      if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError")) {
        setErrorMessage("Microphone access was denied. Allow access in your browser settings and try again.");
      } else if (error instanceof DOMException && (error.name === "NotFoundError" || error.name === "OverconstrainedError")) {
        setErrorMessage("No microphone was detected. Connect a microphone and try again.");
      } else if (error instanceof DOMException && error.name === "NotReadableError") {
        setErrorMessage("The microphone is unavailable or being used by another application.");
      } else {
        setErrorMessage("The microphone could not be started. Please try again.");
      }
    }
  };

  const cancelRecording = () => {
    cancelRequestedRef.current = true;
    stopRecording();
  };

  if (status === "recording") {
    return (
      <div className="voice-recorder voice-recorder--active" role="status" aria-label="Voice recording in progress">
        <span className="voice-recorder__live"><i aria-hidden="true" /> Recording</span>
        <canvas ref={canvasRef} className="voice-recorder__waveform" aria-label="Live audio waveform" />
        <time dateTime={`PT${elapsedSeconds}S`}>{formatTimer(elapsedSeconds)}</time>
        <button type="button" className="voice-recorder__cancel" onClick={cancelRecording}>Cancel</button>
        <button type="button" className="voice-recorder__stop" onClick={stopRecording}><i aria-hidden="true" /> Stop</button>
      </div>
    );
  }

  return (
    <div className={`voice-recorder voice-recorder--${status}`}>
      <button
        type="button"
        className="voice-recorder__trigger"
        onClick={() => void startRecording()}
        disabled={disabled || status === "requesting" || status === "transcribing"}
        aria-label={status === "transcribing" ? "Transcribing voice recording" : "Start voice recording"}
        title="Record requirement using microphone (maximum 30 seconds)"
      >
        {status === "requesting" || status === "transcribing" ? (
          <span className="spinner spinner--small" aria-hidden="true" />
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
          </svg>
        )}
      </button>
      {status === "requesting" ? <span className="voice-recorder__message" role="status">Requesting microphone access…</span> : null}
      {status === "transcribing" ? <span className="voice-recorder__message" role="status">Transcribing audio…</span> : null}
      {status === "error" && errorMessage ? (
        <span className="voice-recorder__error" role="alert">
          {errorMessage}
          <button type="button" onClick={() => { setErrorMessage(null); setStatus("idle"); }} aria-label="Dismiss voice recording error">×</button>
        </span>
      ) : null}
    </div>
  );
};
