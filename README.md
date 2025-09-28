# PriceTracker - Version 2.0

## Descripción
PriceTracker es una aplicación web PWA para comparar precios de productos en diferentes tiendas, con funcionalidades avanzadas para una mejor experiencia de usuario.

## Novedades en la Versión 2.0

### 🎨 Diseño Compacto y Modo Denso
- **Tarjetas ultra-compactas**: Reducido significativamente el espacio vertical de las tarjetas de productos
- **Modo denso**: Toggle para ocultar detalles secundarios (fecha, tienda, unidad) y mostrar solo información esencial
- **Layout responsive mejorado**: Aprovecha mejor el espacio en pantallas grandes
- **Grid responsive**: Adaptación automática del número de columnas según el tamaño de pantalla

### 🔍 Búsqueda y Normalización Inteligente
- **Normalización de nombres**: La búsqueda y agrupación ignora mayúsculas, minúsculas y tildes
  - "Pan", "pan" y "pán" se tratan como el mismo producto
- **Autocompletado**: Sugerencias automáticas para nombres de productos y tiendas existentes
- **Debounce en búsqueda**: Retraso de 200ms para optimizar el rendimiento al teclear

### 💰 Precio por Unidad (PPU)
- **Cálculo automático**: Se calcula y muestra el precio por unidad (€/kg, €/L, etc.)
- **Ordenación por PPU**: Los productos se ordenan por defecto por rentabilidad (precio por unidad)
- **Highlight del más rentable**: El producto más barato por unidad se resalta en verde

### 📊 Historial de Precios
- **Registro automático**: Cada actualización de precio se guarda en el historial
- **Mini-gráficos**: Sparkline en cada tarjeta que visualiza la evolución del precio
- **Solo se muestra**: Si hay más de un registro en el historial

### 🎛️ Controles Avanzados
- **Ordenación múltiple**:
  - Precio por unidad (por defecto)
  - Precio total
  - Fecha de agregado
- **Filtros dinámicos**:
  - Por tienda (se actualiza automáticamente)
- **Estados persistentes**: Modo denso y configuraciones guardadas en localStorage

### 🏪 Autocompletado Inteligente
- **Sugerencias en tiempo real**: Para nombres de productos y tiendas
- **Evita duplicados**: Facilita la consistencia en los nombres
- **Actualización automática**: Las sugerencias se refrescan cada vez que se abre el formulario

### 🔧 Mejoras Técnicas
- **Base de datos actualizada**: Nueva versión con campos adicionales para PPU e historial
- **Validación mejorada**: Formato de precios más robusto
- **Accesibilidad**: Atributos ARIA en botones de acción
- **Rendimiento**: Optimizaciones en renderizado y búsqueda

## Características Originales Mantenidas
- ✅ PWA (Progressive Web App) con service worker
- ✅ Exportación/Importación de datos en JSON
- ✅ Interfaz en español
- ✅ Tema Monokai
- ✅ Funcionalidad offline

## Instalación y Uso
1. Clona o descarga el proyecto
2. Abre `index.html` en un navegador moderno
3. Añade productos con nombre, tienda, precio y unidades opcionales
4. Usa los controles de ordenación y filtros para organizar la vista
5. Activa el "Modo denso" para ver más productos en pantalla

## Tecnologías Utilizadas
- HTML5
- CSS3 (Grid, Flexbox)
- JavaScript (ES6+)
- IndexedDB para almacenamiento local
- Canvas API para gráficos
- PWA con manifest y service worker

## Compatibilidad
- Navegadores modernos (Chrome, Firefox, Safari, Edge)
- Dispositivos móviles y tablets
- Funciona offline una vez cargada

---

*Versión 2.0 - Aplicación completamente rediseñada para máxima eficiencia y usabilidad*
