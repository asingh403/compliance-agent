import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, transcribeSpeech } from "./api";
import { VoiceRecorder } from "./components/VoiceRecorder";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return { ...actual, transcribeSpeech: vi.fn() };
});

const transcribeMock = vi.mocked(transcribeSpeech);
const stopTrack = vi.fn();

class FakeMediaRecorder {
  static isTypeSupported = () => true;
  state: RecordingState = "inactive";
  mimeType: string;
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(_stream: MediaStream, options?: MediaRecorderOptions) {
    this.mimeType = options?.mimeType ?? "audio/webm";
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["audio"], { type: this.mimeType }) } as BlobEvent);
    this.onstop?.();
  }
}

const installRecordingMocks = () => {
  const track = { stop: stopTrack } as unknown as MediaStreamTrack;
  const stream = {
    getAudioTracks: () => [track],
    getTracks: () => [track],
  } as unknown as MediaStream;
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
  });
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  vi.stubGlobal("AudioContext", class {
    state = "running";
    createAnalyser() {
      return {
        fftSize: 256,
        smoothingTimeConstant: 0,
        frequencyBinCount: 128,
        getByteTimeDomainData: (data: Uint8Array) => data.fill(128),
      };
    }
    createMediaStreamSource() { return { connect: vi.fn() }; }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
  });
  vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
};

beforeEach(() => {
  transcribeMock.mockReset();
  stopTrack.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
});

describe("VoiceRecorder", () => {
  it("explains when voice recording is unsupported", () => {
    render(<VoiceRecorder disabled={false} onTranscript={() => true} />);
    fireEvent.click(screen.getByRole("button", { name: "Start voice recording" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Voice recording is not supported by this browser.");
  });

  it("explains denied microphone permission", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockRejectedValue(new DOMException("Denied", "NotAllowedError")) },
    });
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    vi.stubGlobal("AudioContext", class {});
    render(<VoiceRecorder disabled={false} onTranscript={() => true} />);

    fireEvent.click(screen.getByRole("button", { name: "Start voice recording" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Microphone access was denied");
  });

  it("explains when no microphone is detected", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockRejectedValue(new DOMException("Missing", "NotFoundError")) },
    });
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    vi.stubGlobal("AudioContext", class {});
    render(<VoiceRecorder disabled={false} onTranscript={() => true} />);

    fireEvent.click(screen.getByRole("button", { name: "Start voice recording" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No microphone was detected");
  });

  it("records, shows controls, and inserts the Sarvam transcript only after Stop", async () => {
    installRecordingMocks();
    const onTranscript = vi.fn().mockReturnValue(true);
    transcribeMock.mockResolvedValue({
      status: 200,
      requestId: "speech-request",
      data: { transcript: "Users can request erasure.", languageCode: "en-IN", provider: "sarvam", model: "saaras:v3" },
    });
    render(<VoiceRecorder disabled={false} onTranscript={onTranscript} />);

    fireEvent.click(screen.getByRole("button", { name: "Start voice recording" }));
    expect(await screen.findByRole("status", { name: "Voice recording in progress" })).toBeInTheDocument();
    expect(screen.getByLabelText("Live audio waveform")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));

    await waitFor(() => expect(transcribeMock).toHaveBeenCalledOnce());
    await waitFor(() => expect(onTranscript).toHaveBeenCalledWith("Users can request erasure."));
    expect(screen.getByRole("button", { name: "Start voice recording" })).toBeInTheDocument();
  });

  it("shows an actionable empty-speech transcription error", async () => {
    installRecordingMocks();
    transcribeMock.mockRejectedValue(new ApiClientError({
      code: "EMPTY_SPEECH",
      message: "No speech detected",
      status: 422,
    }));
    render(<VoiceRecorder disabled={false} onTranscript={() => true} />);

    fireEvent.click(screen.getByRole("button", { name: "Start voice recording" }));
    await screen.findByRole("status", { name: "Voice recording in progress" });
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No speech was detected");
  });
});
