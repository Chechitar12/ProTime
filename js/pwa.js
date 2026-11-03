// Installation support is independent of the application's business logic.
if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(error => {
            console.warn('ProTime: no se pudo registrar el service worker.', error);
        });
    });
}
