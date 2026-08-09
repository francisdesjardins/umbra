// React itself. Not a library export — the host serves it so every React microfrontend gets
// *the* React the binding was built against; two copies mean two hook dispatchers.
export { createElement, useState } from 'react';
