# Sugerencias de planes con IA · piloto

La clave se configura con la variable de entorno `OPENAI_API_KEY`. `OPENAI_MODEL` permite cambiar el modelo (por defecto `gpt-4.1-mini`). Un build con Node 22+ genera la configuración en `dist/js/ai-config.js`; no requiere dependencias npm ni backend. La llamada sigue saliendo directamente del navegador a Responses de OpenAI, con salida JSON estructurada y `store: false`.

**Al ser un frontend, la clave quedará visible en el JavaScript publicado y en las peticiones del navegador.** Las variables evitan guardarla en el repositorio, no la hacen privada para los visitantes. Esta modalidad es para el piloto solicitado. Usar la clave del piloto y revocarla al finalizar.

## Ejecutar localmente

El archivo `.env` está excluido de Git. Si no existe, copiar `.env.example` a `.env` y completar:

```dotenv
OPENAI_API_KEY=tu_token
OPENAI_MODEL=gpt-4.1-mini
```

Luego, desde la carpeta del proyecto:

```powershell
npm run build
python -m http.server 8000 --bind 127.0.0.1 --directory dist
```

Abrir http://localhost:8000. Cada vez que cambie el código o `.env`, volver a ejecutar `npm run build`. Las variables ya definidas en el entorno del proceso tienen prioridad sobre `.env`. El código fuente conserva una configuración vacía: servir directamente la raíz no activa la IA.

## Publicar en GitHub Pages

1. En el repositorio, ir a **Settings → Secrets and variables → Actions → Secrets → New repository secret**. Nombre: `OPENAI_API_KEY`. Valor: la clave de OpenAI.
2. Opcionalmente, en la pestaña **Variables**, crear `OPENAI_MODEL` (por defecto se usa `gpt-4.1-mini`).
3. En **Settings → Pages → Build and deployment → Source**, seleccionar **GitHub Actions**.
4. Al publicar los cambios en `main`, se ejecuta `.github/workflows/pages.yml`. También puede iniciarse desde **Actions → Publicar ProTime en GitHub Pages → Run workflow**. Se genera y publica únicamente `dist/`.
5. Si cambia el secreto, volver a ejecutar el workflow. Guardar un secreto por sí solo no vuelve a publicar el sitio.

La clave se pasa como variable al build, sin imprimirla ni guardarla en commits. El artefacto publicado sí la contiene como parte del frontend. No se publican `.env`, documentos, tests, scripts del build ni la carpeta `.git`. El build calcula una versión del caché de la PWA a partir de los archivos y la configuración; al cambiar código, clave o modelo, el worker se actualiza. Cerrar todas las ventanas/pestañas abiertas de ProTime y volver a abrir para activar la nueva versión.

Documentación: [workflows de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Flujo

1. Abrir **Validación de Incidencias Web**, luego **Asignar plan de acción**, **Registrar solución aplicada** o **Marcar solucionado**, según el estado de la incidencia.
2. Pulsar **Sugerir plan con IA**. Se envían el tipo, descripción, área, horas hombre y el plan actual. Si hay incidencias similares ya solucionadas en el mismo navegador, se incluyen hasta tres planes/soluciones confirmados como referencia. No se incluyen campos de nombres de personas, audios, fotos ni ubicación; el texto libre se envía tal como fue registrado. El token viaja únicamente en el encabezado de autenticación, no en el prompt.
3. Revisar la acción inmediata, prevención y explicación. **Editar plan** permite modificar el borrador. **Escuchar** reproduce su importancia con la voz española disponible en el dispositivo. Se intenta leer automáticamente al recibir la propuesta; algunos navegadores exigen pulsar Escuchar. La voz es síntesis del dispositivo, no una grabación de OpenAI.
4. **Usar propuesta** copia el texto al formulario original; todavía no guarda ni cambia estados. El usuario puede seguir editando y elige las fechas.
5. Solo **Guardar e iniciar ejecución** cambia el estado a En proceso. En el flujo de solución, confirmar únicamente acciones ya realizadas: **Guardar solución aplicada** cambia el estado a Solucionado. Las validaciones, datos locales e historial siguen usando el flujo existente.

Cancelar una solicitud conserva el formulario. Cerrar el diálogo cancela la solicitud pendiente y detiene la lectura. Un fallo de red, token o límite de uso muestra un mensaje y permite completar todo manualmente; no se muestran respuestas simuladas como si fueran de la IA.

La interfaz funciona sin conexión, pero generar propuestas requiere internet y una clave con acceso y saldo de API. Una cuenta o suscripción de ChatGPT por sí sola no sustituye la API key.

Documentación usada: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini).

## Verificación

Con Node 22+ y Edge/Chrome/Chromium instalado, ejecutar `node --test tests/ai-plan.test.cjs`. Si el navegador está en otra ruta, definir `PROTIME_TEST_BROWSER`. La prueba abre un perfil temporal y un servidor local aislados, simula la API y la voz sin gastar saldo, y comprueba edición, confirmación, estados, errores, cancelación y tamaños responsivos. No sustituye la prueba final con un token real ni la escucha en un móvil.
