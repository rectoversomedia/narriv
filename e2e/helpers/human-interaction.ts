import { Page, Locator } from '@playwright/test';

/**
 * Human-like interaction helper utilities for macOS testing.
 * Simulates physical user behavior (curved mouse movement, typing cadence, smooth scrolling).
 */

export interface HumanTypeOptions {
  delayMin?: number;
  delayMax?: number;
}

/**
 * Smoothly moves the mouse cursor from current location to target coordinate.
 */
export async function smoothMouseMove(
  page: Page,
  targetX: number,
  targetY: number,
  steps = 25
): Promise<void> {
  await page.mouse.move(targetX, targetY, { steps });
}

/**
 * Moves mouse naturally to an element and hovers with a realistic movement path.
 */
export async function humanHover(page: Page, locator: Locator, steps = 20): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error('Element bounding box not found for hover action');
  }

  // Target slightly randomized position inside the element (avoiding artificial dead-center clicks)
  const targetX = box.x + box.width * (0.35 + Math.random() * 0.3);
  const targetY = box.y + box.height * (0.35 + Math.random() * 0.3);

  await page.mouse.move(targetX, targetY, { steps });
}

/**
 * Types text sequentially with random human-like jitter delay between keystrokes.
 */
export async function humanType(
  locator: Locator,
  text: string,
  options: HumanTypeOptions = { delayMin: 40, delayMax: 110 }
): Promise<void> {
  const { delayMin = 40, delayMax = 110 } = options;

  for (const char of text) {
    const randomDelay = Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;
    await locator.pressSequentially(char, { delay: randomDelay });
  }
}

/**
 * Performs realistic smooth wheel scrolling with increments.
 */
export async function smoothScroll(
  page: Page,
  deltaY: number,
  increments = 10,
  intervalMs = 30
): Promise<void> {
  const step = deltaY / increments;
  for (let i = 0; i < increments; i++) {
    await page.mouse.wheel(0, step);
    await page.waitForTimeout(intervalMs);
  }
}

/**
 * Natural click that hovers first, pauses briefly, and then clicks.
 */
export async function humanClick(page: Page, locator: Locator): Promise<void> {
  await humanHover(page, locator);
  await page.waitForTimeout(50 + Math.random() * 60);
  await locator.click();
}
