# PriceTracker v3.1

Aplicación web progresiva (PWA) moderna para comparar precios de productos entre distintas tiendas, escanear etiquetas de precio con IA y crear listas de compra inteligentes.

## ✨ Funcionalidades

### 📸 Escaneo Inteligente de Precios (OCR)
- **Sube o escanea** una tarjeta de precio y el formulario se rellena automáticamente.
- **Preprocesamiento de imagen** (escala ≥1600px, contraste optimizado) para mayor precisión.
- **Detección inteligente**: precios, unidades, cantidades y nombre del producto con puntuación multicriterio.
- **Soporte multilingüe**: etiquetas en español y francés (formatos `2,99€`, `2€49`, `PRIX AU KILO`, `TTC`).
- **Demo interactiva**: Prueba el OCR con una imagen generada sin necesidad de cámara.

### 🔍 Comparación y Análisis
- **Precio por Unidad (PPU)**: Cálculo automático de €/kg, €/L, €/unidad para comparar formatos.
- **Agrupación inteligente**: Misma vista para todos los precios de un producto ordenados por mejor opción.
- **Ahorro potencial**: Muestra cuánto puedes ahorrar comprando en la tienda más barata.
- **Historial gráfico**: Mini sparklines que muestran la evolución del precio en el tiempo.
- **Filtros y ordenación**: Por tienda, precio, PPU o fecha.

### 🛒 Listas de Compra
- Crea listas y añade productos con autocompletado.
- **Sugerencias inteligentes**: Para cada producto, la app encuentra la mejor tienda y precio registrados.
- **Ver mejores opciones**: Tabla comparativa con la mejor tienda para cada producto y total estimado.
- Marca productos como comprados sin recargar la página.

### 🔧 Características Técnicas
- **PWA (Progressive Web App)**: Instalable en móvil y escritorio. Funciona offline.
- **Caché en memoria**: Las búsquedas y filtros son instantáneos tras la primera carga.
- **Service Worker avanzado**: Network-First para navegación con fallback offline. Actualización automática de la app.
- **Importación / Exportación**: Copias de seguridad en JSON con fusión inteligente de precios.
- **Normalización**: Ignora tildes, mayúsculas y variantes de nombre para evitar duplicados.
- **Modo denso**: Visualización compacta para más productos en pantalla.
- **Accesibilidad**: `<dialog>` nativo, `prefers-reduced-motion`, roles ARIA.

## 🛠️ Tecnologías

| Tecnología | Uso |
|------------|-----|
| JavaScript ES6+ | Lógica principal |
| IndexedDB | Almacenamiento local persistente |
| Tesseract.js v5 | OCR (español + francés) con bounding boxes y confianza |
| Canvas API | Preprocesamiento de imagen y gráficos sparkline |
| Cache API + Service Workers | Estrategias offline (Network-First, Stale-While-Revalidate) |
| Web App Manifest | Instalación PWA |
| CSS3 | CSS Variables, Grid, Flexbox, gradientes, animaciones |
| HTML5 `<dialog>` | Modales accesibles sin dependencias |

## 🚀 Cómo Empezar

1. **Abre** `index.html` en tu navegador o súbelo a cualquier servidor estático.
2. Pulsa el botón **+** para añadir tu primer precio.
3. Escanea una tarjeta de precio con la cámara o escribe los datos manualmente.
4. Crea **listas de compra** y descubre dónde comprar más barato.

> También puedes probar el OCR sin cámara pulsando **"Probar con el ejemplo"** en el modal de escaneo.

## 📁 Estructura del Proyecto

```
PriceTracker/
├── index.html          # Punto de entrada
├── manifest.json       # Configuración PWA
├── service-worker.js   # Service Worker (caching offline)
├── offline.html        # Página de respaldo sin conexión
├── css/
│   └── style.css       # Estilos (tema oscuro, responsive)
├── js/
│   ├── app.js          # UI, OCR pipeline, eventos
│   └── db.js           # IndexedDB, constantes, helpers
├── assets/
│   └── icons/          # Iconos SVG (add, edit, delete)
└── examples/           # Scripts Python de ejemplo
```

## 📦 Versionado

La versión se define en `js/db.js` como `APP_VERSION` y se muestra junto al título de la página.

## 📄 Licencia

Uso personal / educativo.
