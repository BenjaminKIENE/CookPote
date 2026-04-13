import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => {
    console.error(err);
    document.body.style.background = '#fff';
    document.body.innerHTML = `<pre style="color:red;padding:20px;font-size:12px;word-break:break-all">${err?.message ?? err}</pre>`;
  });
