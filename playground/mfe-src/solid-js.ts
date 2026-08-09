// Solid itself, for the same reason React is here: two copies mean two owner graphs, and a
// component created under one would be disposed by neither.
export { createSignal } from 'solid-js';
