import { render } from 'preact';
import { App } from './app';
import './index.css';

// Wait for Telegram WebApp to be ready
if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
}

// Render app
render(<App />, document.getElementById('app')!);
