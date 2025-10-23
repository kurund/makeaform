import { mount } from 'svelte';
import App from './App.svelte';

// Mount the app to the #form-builder-root element
const target = document.getElementById('form-builder-root');

if (!target) {
  throw new Error('Could not find #form-builder-root element');
}

const app = mount(App, {
  target
});

export default app;
