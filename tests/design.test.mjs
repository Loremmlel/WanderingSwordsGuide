import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8')
const design = readFileSync(new URL('../DESIGN.md', import.meta.url), 'utf8')
test('documented palette matches canonical runtime tokens', () => {
  for (const match of design.matchAll(/^  ([\w-]+): '(#[0-9a-f]{6})'/gm))
    assert(css.includes(`--${match[1]}: ${match[2]}`), match[1])
})
test('scrollbars, reduced motion, forced colors and focus are global', () => {
  for (const token of [
    'scrollbar-color',
    '::-webkit-scrollbar',
    ':focus-visible',
    'prefers-reduced-motion',
    'forced-colors',
    'resize: none',
  ])
    assert(css.includes(token))
})
