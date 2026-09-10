import { Page, CDPSession } from '@playwright/test';

/**
 * Helper to communicate with Chrome DevTools Protocol (CDP) directly via Playwright.
 * Works with Chromium-based browsers to inspect low-level performance, accessibility trees,
 * network throttling, and memory metrics.
 */

export interface NetworkThrottlingPreset {
  offline: boolean;
  downloadThroughput: number; // bytes per second
  uploadThroughput: number;   // bytes per second
  latency: number;            // ms
}

export const NETWORK_PRESETS: Record<string, NetworkThrottlingPreset> = {
  slow3G: {
    offline: false,
    downloadThroughput: (500 * 1024) / 8, // 500 kbps
    uploadThroughput: (500 * 1024) / 8,
    latency: 400,
  },
  fast3G: {
    offline: false,
    downloadThroughput: (1.6 * 1024 * 1024) / 8, // 1.6 Mbps
    uploadThroughput: (750 * 1024) / 8,
    latency: 150,
  },
  regular4G: {
    offline: false,
    downloadThroughput: (4 * 1024 * 1024) / 8, // 4 Mbps
    uploadThroughput: (3 * 1024 * 1024) / 8,
    latency: 50,
  },
};

export class CDPController {
  private session: CDPSession | null = null;

  constructor(private page: Page) {}

  /**
   * Initializes CDP session on the current page.
   */
  async init(): Promise<CDPSession> {
    this.session = await this.page.context().newCDPSession(this.page);
    return this.session;
  }

  /**
   * Ensures the session is initialized before use.
   */
  private getSession(): CDPSession {
    if (!this.session) {
      throw new Error('CDPController is not initialized. Call await cdp.init() first.');
    }
    return this.session;
  }

  /**
   * Retrieves the full Accessibility Tree from Chrome engine.
   */
  async getAccessibilityTree(): Promise<unknown[]> {
    const session = this.getSession();
    await session.send('Accessibility.enable');
    const response = (await session.send('Accessibility.getFullAXTree')) as {
      nodes: unknown[];
    };
    return response.nodes;
  }

  /**
   * Applies CPU Throttling rate (e.g. 4x or 6x slowdown for testing low-end devices).
   */
  async setCPUThrottling(rate: number): Promise<void> {
    const session = this.getSession();
    await session.send('Emulation.setCPUThrottlingRate', { rate });
  }

  /**
   * Emulates network throttling (e.g. Slow 3G / Fast 3G).
   */
  async setNetworkThrottling(preset: NetworkThrottlingPreset): Promise<void> {
    const session = this.getSession();
    await session.send('Network.enable');
    await session.send('Network.emulateNetworkConditions', {
      offline: preset.offline,
      latency: preset.latency,
      downloadThroughput: preset.downloadThroughput,
      uploadThroughput: preset.uploadThroughput,
    });
  }

  /**
   * Reads real-time performance and memory metrics (JS Heap, Nodes, Layout Count).
   */
  async getPerformanceMetrics(): Promise<Record<string, number>> {
    const session = this.getSession();
    await session.send('Performance.enable');
    const response = await session.send('Performance.getMetrics');
    const metrics: Record<string, number> = {};
    for (const item of response.metrics) {
      metrics[item.name] = item.value;
    }
    return metrics;
  }

  /**
   * Captures runtime console exceptions and errors.
   */
  async listenConsoleErrors(onError: (msg: string) => void): Promise<void> {
    const session = this.getSession();
    await session.send('Runtime.enable');
    session.on('Runtime.exceptionThrown', (event: { exceptionDetails?: { text?: string } }) => {
      onError(event.exceptionDetails?.text || 'Runtime exception caught by CDP');
    });
  }

  /**
   * Detaches CDP session when complete.
   */
  async detach(): Promise<void> {
    if (this.session) {
      await this.session.detach();
      this.session = null;
    }
  }
}
