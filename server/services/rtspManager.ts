import { spawn, ChildProcess } from "child_process";
import * as path from "path";

class RTSPManager {
  private pythonProcess: ChildProcess | null = null;
  private isRunning = false;
  private pythonPort = 8082;
  private baseUrl: string;

  constructor() {
    this.baseUrl = `http://localhost:${this.pythonPort}`;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("RTSP service already running");
      return;
    }

    console.log("Starting Python RTSP service...");

    const pythonPath = path.join(__dirname, "../python");

    this.pythonProcess = spawn("python", ["rtsp_server.py"], {
      cwd: pythonPath,
      env: { ...process.env, RTSP_PORT: this.pythonPort.toString() },
    });

    this.pythonProcess.stdout?.on("data", (data) => {
      console.log(`[RTSP] ${data.toString().trim()}`);
    });

    this.pythonProcess.stderr?.on("data", (data) => {
      console.error(`[RTSP] ${data.toString().trim()}`);
    });

    this.pythonProcess.on("close", (code) => {
      console.log(`RTSP service exited with code ${code}`);
      this.isRunning = false;
      this.pythonProcess = null;
    });

    await this.waitForReady(30000);

    this.isRunning = true;
    console.log(`RTSP service ready on port ${this.pythonPort}`);
  }

  private async waitForReady(timeout = 30000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`${this.baseUrl}/health`, {
          signal: AbortSignal.timeout(1000),
        });
        const data = await response.json();
        if (data.status === "ok") {
          return true;
        }
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    throw new Error("RTSP service failed to start within timeout");
  }

  async stop(): Promise<void> {
    if (!this.pythonProcess) {
      return;
    }

    console.log("Stopping RTSP service...");

    this.pythonProcess.kill("SIGTERM");

    setTimeout(() => {
      if (this.pythonProcess) {
        this.pythonProcess.kill("SIGKILL");
      }
    }, 5000);

    this.isRunning = false;
    this.pythonProcess = null;
  }

  async connectCamera(
    cameraId: string,
    ip: string,
    username: string,
    password: string,
    streamPath = "/1"
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/cameras/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cameraId, ip, username, password, streamPath }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to connect camera");
    }

    return response.json();
  }

  async disconnectCamera(cameraId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/cameras/disconnect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cameraId }),
    });
    return response.json();
  }

  async getCameraStatus(cameraId: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/api/cameras/${cameraId}/status`
    );
    if (!response.ok) return null;
    return response.json();
  }

  async getFrame(cameraId: string): Promise<Buffer | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/cameras/${cameraId}/frame`
      );
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch {
      return null;
    }
  }

  getStatus() {
    return {
      running: this.isRunning,
      port: this.pythonPort,
      baseUrl: this.baseUrl,
    };
  }
}

export const rtspManager = new RTSPManager();
