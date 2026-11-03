// Configuración pública por defecto. npm run build genera este archivo en dist/ desde .env.
// No pongas credenciales aquí: configura OPENAI_API_KEY en .env o GitHub Actions Secrets.
const PROTIME_AI_CONFIG = Object.freeze({
    apiKey: '',
    model: 'gpt-4.1-mini',
    timeoutMs: 45000
});
