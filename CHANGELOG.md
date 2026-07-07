# Changelog

## [3.1.0] — 2026-07-07

### ✨ Nuevas Funcionalidades

- **Versión en UI**: Número de versión visible junto al título y en la pestaña del navegador.
- **Demo OCR real**: El botón "Probar con el ejemplo" ahora genera una imagen sintética y la procesa con el mismo pipeline OCR, demostrando la lectura en tiempo real.

### 🔧 Mejoras

- **OCR Inteligente**: Nuevo pipeline con preprocesamiento de imagen (escala ≥1600px, escala de grises + contraste) para mejor precisión.
- **Detección posicional**: El OCR usa bounding boxes y confianza de Tesseract.js para ordenar líneas y descartar texto de baja calidad.
- **Precios más precisos**: Puntuación multicriterio (moneda, palabras clave, tamaño de texto, unidades) para elegir el precio correcto y evitar falsos positivos (códigos de barras, pesos).
- **Soporte francés**: Reconocimiento de etiquetas de precio francesas — formato `2€49`, palabras clave `TTC`, `TARIF`, `COÛT`, `EURO`, stopwords francesas, precio por unidad (`PRIX AU KILO`, `PRIX AU LITRE`) y unidades francesas.
- **Lector de unidades expandido**: Compatible con `pièce`, `sachet`, `barquette`, `bocal`, `flacon`, `lot`, `tranche`, `dose`, `poignée` y más.
- **Cache en memoria**: Los productos se cachean en RAM tras la primera lectura, eliminando re-consultas redundantes a IndexedDB en búsquedas, filtros y ordenaciones.
- **Rendimiento en listas**: Marcar/desmarcar productos en la lista de compra ahora actualiza el DOM en el sitio en vez de re-renderizar todo.
- **Mejora PWA**: Estrategia Network-First para navegación con fallback a página offline; Stale-While-Revalidate para assets estáticos. Actualización automática del Service Worker al detectar cambios.
- **Diálogo accesible**: `prompt()` reemplazado por `<dialog>` nativo con teclado y soporte de Escape.
- **Código**: Uso de `Number()` con radix explícito; XSS mitigado escapando nombres de producto/tienda en tarjetas de comparación.

### 🌐 UI / Diseño

- **Números tabulares**: `font-variant-numeric: tabular-nums` en precios y totales para evitar saltos de layout al cambiar dígitos.
- **Respeto de preferencias**: Nueva media query `prefers-reduced-motion` desactiva animaciones para usuarios que lo soliciten.
- **Acentos consolidados**: El nombre de tienda pasa a color secundario (`--text-muted`) para que el precio verde sea el único acento protagonista.
- **Estilos del diálogo**: Nueva lista de compra integrada visualmente con el tema oscuro.

### 🐛 Correcciones

- **XSS en tarjetas de comparación**: `productName` y `storeName` se escapaban antes de inyectarse en el DOM.

---

## [3.0.0] — 2026-06

### ✨ Nuevas Funcionalidades

- **Escaneo Inteligente de Precios (OCR)**: Sube una foto de la tarjeta de precio y la app rellena el formulario automáticamente con Tesseract.js (español + francés).
- **Listas de Compra**: Crea listas, añade productos, obtén sugerencias inteligentes del mejor precio disponible.
- **Comparación entre tiendas**: Agrupa productos por nombre y muestra todas las tiendas lado a lado con el ahorro potencial.
- **Precio por Unidad (PPU)**: Cálculo automático de €/kg, €/L para comparar formatos.
- **Historial de precios**: Gráficos sparkline que muestran la evolución del precio en el tiempo.

### 🔧 Mejoras

- **Rediseño completo**: Tema oscuro profundo con gradientes, animaciones fluidas y tarjetas mejoradas.
- **Búsqueda en tiempo real**: Filtrado instantáneo por nombre de producto o tienda.
- **Ordenación**: Por mejor precio por unidad, precio total o fecha más reciente.
- **Filtro por tienda**: Enfócate en una sola tienda.
- **Modo denso**: Visualización compacta para ver más productos a la vez.
- **Importación/Exportación**: Copias de seguridad en JSON con fusión inteligente.
- **Normalización de nombres**: Ignora tildes, mayúsculas y variantes ortográficas para evitar duplicados.
- **PWA** (v3): App instalable con Service Worker y almacenamiento offline.

### 🛠️ Técnico

- IndexedDB con migraciones automáticas.
- Autocompletado de productos y tiendas basado en datos guardados.
- Sugerencias inteligentes para la lista de compra (mejor tienda/precio).
- Exportación/importación con merge de precios actualizados.

---

## [2.0.0] — 2026-05

- Ordenación avanzada y filtrado por tienda.
- Modo denso.
- Normalización de nombres en búsqueda.
- Precio por unidad e historial de precios.

## [1.0.0] — 2026-04

- Versión inicial.
- Registro de productos, precios y tiendas.
- Búsqueda básica.
