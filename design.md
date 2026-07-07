# PriceTracker — Design System

## Dirección y Sensación

App de utilidad (comparador de precios) con estética oscura premium. Debe sentirse como un instrumento de ahorro: preciso, confiable, con un toque vibrante. El usuario está en una tienda con el móvil, comparando rápido — la interfaz debe ser **legible con luz solar**, **tactil**, **de un vistazo**.

- **Humano**: Persona en un supermercado comparando precios con el móvil. Necesita ver la información en 2 segundos. 5 minutos antes está comprando, 5 minutos después está en casa viendo totales.
- **Verbo**: Comparar precios entre tiendas. Encontrar la opción más barata. Registrar un precio rápido.
- **Sensación**: Oscuro como un dashboard nocturno, vibrante como un arcade. La información debe saltar a la vista.

## Paleta de Colores

```css
--bg:          #0b0d17  /* Fondo principal, azul noche profundo */
--surface:     #131627  /* Tarjetas, contenedores */
--surface-raised: #1a1e35  /* Elevado (inputs, selects) */
--surface-hover: #21264a  /* Hover de superficies */
--border:      #262c4a  /* Bordes sutiles */
--border-focus:#3a426a  /* Borde en foco */

--text:        #e8e8f0  /* Texto primario */
--text-muted:  #7c82a8  /* Secundario (labels, metadata) */
--text-dim:    #4a507a  /* Terciario (placeholders, fechas) */
```

### Acentos (~10% del uso total de color)

| Token | Color | Propósito |
|-------|-------|-----------|
| `--accent` | `#ff2e88` | Acción principal (botones, FAB, estados activos) |
| `--green` | `#00f2c9` | Semántico: precio / ahorro / mejor opción |
| `--blue` | `#5b8dff` | Semántico secundario: totales |
| `--purple` | `#a855f7` | Marca en gradientes (junto con accent) |
| `--orange` | `#f59e0b` | Warnings, información de unidades |

**Regla:** El gradiente `accent → purple → blue` se usa solo en el título principal. En el resto, `--accent` (pink) es el único acento interactivo. `--green` es el único acento de dato (precios). El nombre de tienda va en `--text-muted`, no en `--purple`.

## Espaciado y Densidad

- **Unidad base**: 4px (múltiplos para padding/margin/gap)
- **Densidad normal** (default):
  - Padding interior de tarjeta: 20px
  - Padding interior de tarjeta producto: 16px
  - Gap entre tarjetas: 14px
  - Gap entre grupos: 24px
- **Densidad reducida** (`.dense`):
  - Padding de tarjeta: 10px
  - Gap entre items: 6px
  - Oculta precio-por-unidad, sparklines y footer

## Tipografía

- **Font**: `'Inter', system-ui, -apple-system, sans-serif`
- **Escala**: ratio ~1.2 (minor third)
  - `h1` (título app): 2.2rem / 800 / letter-spacing: -0.04em
  - `h2` (título modal): 1.3rem / 700
  - `h3` (título grupo): 1.25rem / 700
  - `price` (precio tarjeta): 1.4rem / 800 / tabular-nums
  - `body` / inputs: 0.95rem
  - `controls`: 0.85rem
  - `date / meta`: 0.75-0.8rem
  - `version badge`: 0.7rem

**Jerarquía**: peso + tamaño + color. Un solo tamaño (14px) alberga tres niveles mediante weight y color.

## Profundidad (Depth)

Estrategia: **bordes + sombras sutiles**, sin sombras dramáticas.

- Tarjetas: `box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5)` + borde 1px `--border`
- Modales: `box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6)` + borde 1px
- Elevación en hover: `translateY(-3px)` + shadow más pronunciado
- Modales sobre fondo: `backdrop-filter: blur(10px)` + fondo `rgba(8, 10, 20, 0.85)`
- Inputs: fondo más oscuro (inset), no sombra

En dark mode no hay sombras dramáticas — se usan bordes para separación.

## Bordes

- `--border`: `rgba(38, 44, 74, 1)` — tono azul oscuro fijo
- `--border-focus`: `rgba(58, 66, 106, 1)` — sutilmente más claro
- Border-radius: 8px (sm) / 12px (radius) / 16px (lg)

**Pattern**: elementos anidados siguen radio concéntrico: `outerRadius = innerRadius + padding`.

## Radios

| Elemento | Radio |
|----------|-------|
| Inputs, botones pequeños | 8px |
| Tarjetas, selects, dropdowns | 12px |
| Modales, grupos de comparación, tabs | 16px |
| FAB (botón flotante) | 50% |

## Componentes Clave

### Tab Bar
```css
.tab-bar { background: var(--surface); border: 1px; border-radius: 16px; padding: 4px; gap: 4px; }
.tab-btn.active { background: linear-gradient(135deg, accent-15%, purple-15%); }
```

### Product Card
```css
.product-card { border-left: 4px solid var(--blue-dim); padding: 16px; }
.product-card.cheapest { border-left-color: var(--green); background: green-4% gradient; }
```

### Modal
```css
.modal { backdrop-filter: blur(10px); background: rgba(8,10,20,0.85); }
.modal-content { padding: 28px; max-width: 500px; border-radius: 16px; }
```

### FAB (Call to Action)
```css
.fab { width: 60px; height: 60px; border-radius: 50%; gradient accent→purple; bottom: 32px; right: 32px; }
```

### Buttons
- **Primary** (`btn-primary`): gradient accent→purple, white text, 14px/600, border-radius 12px, 10px-14px padding
- **Header** (`btn-header`): surface bg, border 1px, text-muted, 0.85rem/600, border-radius 12px, 10px-18px padding
- **Secondary** (`btn-secondary`): surface-raised, border 1px, text-muted, 0.8rem/500, 8px-16px padding

### Toast
Bottom-center, 3500ms default, 4 tipos: info (surface), success (green), error (accent→red), warning (orange).

## Animación y Movimiento

- **Duraciones**: < 300ms siempre.
  - Entrada de tarjeta: 450ms slideUp (cubic-bezier 0.16, 1, 0.3, 1)
  - Entrada de modal: 300ms scaleIn
  - Fade genérico: 300ms
  - Spinner: 800ms linear infinite
  - Botón active: sin animación extra
- **Easings**: `cubic-bezier(0.4, 0, 0.2, 1)` para transiciones genéricas.
- **Propiedades animadas**: solo `transform`, `opacity`, `box-shadow`, colores.
- **prefers-reduced-motion**: todas las animaciones se desactivan (duration 0.001ms).

## Responsive

| Breakpoint | Comportamiento |
|------------|---------------|
| ≤700px | Padding reducido (14px), h1→1.6rem, grid a 1 columna, form-row a 1 columna, tabs más pequeños |
| 701–1024px | Grid a 2-3 columnas (minmax 240px) |
| ≥1025px | Grid a 3+ columnas (minmax 280px) |

## Accesibilidad

- `.sr-only` para elementos solo para lectores de pantalla.
- Roles ARIA: `tablist`, `tab`, `dialog`, `alertdialog`, `region`, `aria-live`.
- `aria-pressed` en toggle dense.
- `aria-selected` en tabs.
- `<dialog>` nativo para modales con soporte de Escape y foco.
- Hit areas mínimas de 44x44px (pseudo-elemento si el control visible es menor).
- `prefers-reduced-motion` respetado.

## Tokens CSS

Todos los colores, radios, sombras y transiciones están definidos en `:root` en `style.css`. No deben usarse valores literales fuera de las variables. Las variables de control (inputs, selects) tienen tokens dedicados, no reutilizan surface tokens.
