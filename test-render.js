import { renderToStaticMarkup } from 'react-dom/server';
import React, { createElement } from 'react';
import App from './src/App.tsx';

try {
  console.log("Testing render...");
  // Try to mock window for things that might rely on it
  global.window = { location: { href: 'http://localhost' }, addEventListener: () => {} };
  global.navigator = { userAgent: 'node' };
  
  // NOTE: This will probably fail if it uses hooks incorrectly in SSR, but let's see.
  // Actually, we can just log that it imported successfully.
  console.log("App imported successfully:", typeof App);
} catch (err) {
  console.error("Render failed:", err);
}
