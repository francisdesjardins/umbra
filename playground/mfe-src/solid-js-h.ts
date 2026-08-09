// Solid's hyperscript, re-exported as the default the way `solid-js/h` itself does — the host
// page has no build step, and Solid's JSX *is* a build step, so the Solid microfrontend writes
// `h(...)` exactly as the React one writes `createElement`.
export { default } from 'solid-js/h';
