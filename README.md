# PriceTracker - Version 3.0 💰

## Descripción
PriceTracker es una aplicación web progresiva (PWA) moderna diseñada para ayudarte a comparar precios de productos entre diferentes tiendas y realizar un seguimiento de su evolución histórica.

## ✨ Novedades en la Versión 3.0

### 📸 Escaneo Inteligente de Precios (OCR)
- **Nueva Función**: Ahora puedes escanear o subir una imagen de la tarjeta de precio de un producto.
- **Detección Automática**: La IA (Tesseract.js) detecta automáticamente el nombre, el precio, la cantidad y la unidad del producto.
- **Ahorro de Tiempo**: Evita escribir manualmente los datos en la tienda.

### 🎨 Diseño Modernizado
- **Nueva Interfaz**: Rediseño completo con un tema oscuro profundo, gradientes dinámicos y estética moderna.
- **Animaciones Fluidas**: Transiciones suaves al cargar productos y abrir el formulario.
- **Tarjetas Mejoradas**: Visualización más clara del precio y ahorro potencial.

---

## 🚀 Funcionalidades Principales

### 🔍 Comparación y Análisis
- **Precio por Unidad (PPU)**: Cálculo automático de €/kg, €/L, etc., para saber qué formato es realmente más barato.
- **Ordenación Inteligente**: Ordena por mejor precio por unidad, precio total o fecha.
- **Historial y Gráficas**: Visualiza la evolución del precio mediante mini-gráficos (sparklines) en cada tarjeta.

### 🏪 Gestión de Tiendas y Productos
- **Autocompletado**: Sugerencias automáticas basadas en tus productos y tiendas guardados.
- **Normalización**: Ignora tildes y mayúsculas para evitar duplicados accidentales.
- **Filtros por Tienda**: Enfócate en una sola tienda para comparar su catálogo.

### 🔧 Características Técnicas
- **PWA (Progressive Web App)**: Instalable en móvil y escritorio.
- **Offline First**: Funciona sin conexión gracias a IndexedDB y Service Workers.
- **Importación/Exportación**: Haz copias de seguridad de tus datos en formato JSON.

## 🛠️ Tecnologías Utilizadas
- **JavaScript ES6+**: Lógica principal.
- **IndexedDB**: Almacenamiento local persistente.
- **Tesseract.js**: Inteligencia artificial para OCR.
- **CSS3 Moderno**: Grid, Flexbox, CSS Variables y Gradientes.
- **Canvas API**: Para las gráficas de historial.

## 📝 Cómo Empezar
1. Abre `index.html` en tu navegador.
2. Pulsa el botón **+** y selecciona **"Escanear"** para capturar tu primer precio.
3. ¡Empieza a ahorrar comparando dónde comprar mejor!

---
*Versión 3.0 - Ahora con Inteligencia Artificial para el escaneo de precios.*
