# Parcelas y mapa de incidencias

## Catálogo autorizado

El único catálogo está en `js/parcelas.js`:

| Parcela | Latitud | Longitud |
| --- | --- | --- |
| P61 | -8.520616 | -78.732651 |
| P62 | -8.550790804 | -78.65676825 |
| P64 · ubicación validada | -8.5456913 | -78.6505618 |

Se reconocen los códigos P61/P62/P64 y sus etiquetas Parcela 61/62/64. P64 utiliza exclusivamente la ubicación validada; cualquier otra variante queda fuera del catálogo hasta nueva instrucción. No hay geocodificación ni GPS que puedan sustituir estas coordenadas.

## Registro e integridad

- El formulario muestra la latitud y longitud de la parcela seleccionada y las actualiza al cambiar la selección.
- Se guarda una copia de las coordenadas en `ubicacion`, junto con `fuente`, `parcela` y `versionCatalogo`. `ubicacionEstado` indica `configurada` o `pendiente`.
- Una parcela desconocida se guarda con `ubicacion: null`, estado pendiente y un aviso visible; nunca usa las coordenadas de otra parcela.
- Solo los registros nuevos reciben coordenadas del catálogo. No hay migraciones, sustituciones ni llamadas GPS después de guardar. Cambiar el catálogo, abrir el mapa o editar un registro histórico no recalcula sus coordenadas. Los históricos sin coordenadas continúan pendientes.
- El mapa solo lee `ubicacion` del registro. Un registro histórico con GPS u otra coordenada válida se dibuja en esa posición original, incluso si difiere del catálogo nuevo.

Los marcadores conservan los umbrales existentes de horas-hombre: verde por debajo de 50 h, amarillo desde 50 hasta menos de 100 h y rojo desde 100 h. El detalle muestra número, parcela, tipo, descripción, estado y horas-hombre afectadas. La lista lateral permite elegir registros que comparten exactamente la misma posición; no se desplazan marcadores para simular ubicaciones diferentes.

## Mapa de calor

La vista inicial muestra una capa de calor difuminada, con áreas verdes, amarillas y rojas según las horas-hombre acumuladas en las ubicaciones próximas. Las incidencias que comparten coordenadas suman sus horas para esta capa; los registros y los colores individuales permanecen intactos. La escala utiliza 50 h y 100 h como referencias de impacto, sin normalizar el registro mayor a rojo automáticamente. Incluso una incidencia de 0.06 h muestra una zona verde visible. La difusión visual no representa los límites reales de las parcelas.

El selector **Mapa de calor / Marcadores** permite cambiar de vista. Los puntos pequeños del calor y la lista lateral abren el detalle individual; la vista de marcadores conserva los puntos de colores anteriores. El dibujo acompaña el desplazamiento y zoom tanto en Google Maps como en OpenStreetMap, funciona con los registros locales sin conexión y se elimina al salir de la pantalla.

La capa se dibuja en canvas con `OverlayView` sobre Google Maps. No depende de la antigua `HeatmapLayer` de Google, retirada en mayo de 2026: [documentación de Google](https://developers.google.com/maps/deprecations#heatmap-layer-js-deprecation).

## Google Maps mediante variables de entorno

En `.env` (archivo local excluido de Git), completar:

```dotenv
GOOGLE_MAPS_API_KEY=tu_clave_de_google_maps
GOOGLE_MAPS_MAP_ID=DEMO_MAP_ID
```

En GitHub, el dueño del repositorio debe crear el **repository secret** `GOOGLE_MAPS_API_KEY` en **Settings → Secrets and variables → Actions**. Opcionalmente, crear la **variable** `GOOGLE_MAPS_MAP_ID` con el ID de un mapa JavaScript propio; si no se define, se usa `DEMO_MAP_ID` para el piloto.

En Google Cloud se necesita habilitar **Maps JavaScript API** y la facturación para ese proyecto. Restringir la clave a Maps JavaScript API y a los sitios autorizados (restricciones de sitios web/HTTP referrers), por ejemplo `https://chechitar12.github.io/*` y, para desarrollo, `http://localhost:8000/*`. La clave de Maps JavaScript se usa en el navegador y es visible allí; las restricciones de dominio y API controlan su uso.

Después de cambiar `.env`, ejecutar `npm run build` y servir `dist/`. En GitHub, publicar los cambios y ejecutar el workflow **Publicar ProTime en GitHub Pages**. Guardar el secreto no dispara por sí solo un nuevo despliegue. El build incorpora la configuración y actualiza automáticamente la versión del caché de la PWA.

Con clave configurada se usa Google Maps y marcadores avanzados. Sin clave o si Google falla, se conserva el mapa de OpenStreetMap; sin internet, la cuadrícula permite seguir viendo los marcadores locales. Ningún proveedor cambia ni corrige las coordenadas guardadas. Los recursos de Google no se guardan en el caché offline de la PWA.

Documentación: [cargar Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/load-maps-js-api), [marcadores avanzados](https://developers.google.com/maps/documentation/javascript/advanced-markers/add-marker), [restricciones de claves](https://developers.google.com/maps/api-security-best-practices).
