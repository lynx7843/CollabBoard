/*
 * Loaded before every test file (vite.config.js -> test.setupFiles).
 *
 * jest-dom adds the assertions the component tests read with — toBeInTheDocument
 * and friends — and the cleanup keeps one test's rendered DOM out of the next
 * one's queries.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
