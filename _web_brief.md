# Web Brief — claudio.art
> Documento de referencia para el desarrollo de la web. Se usa como contexto en cada conversación de desarrollo.
> Última actualización: 2026-04-09

---

## El proyecto en dos líneas

Claudio recoge madera de la calle, la pinta con retratos y la firma, y la deja en la calle gratis. Lo graba todo para Instagram (@cl4u8io). También vende cuadros ("claudios") en drops limitados. La web es el punto de venta y el archivo de su obra.

**Artista:** Claudio Portalo Bueno  
**Gestor:** Pako Portalo Bueno  
**Plataforma:** Shopify (claudio-171993.myshopify.com → claudio.art)  
**Lanzamiento:** 1 mayo 2026 (drop de prueba, 8 claudios)  
**Expo:** 14 mayo 2026 (drop especial, 15-20 claudios)

---

## Para qué sirve esta web

1. **Vender claudios** — lo primero, lo más importante
2. **Mostrar la obra** — galería viva que Claudio actualiza él mismo
3. **Dar credibilidad** — alguien que llega desde Instagram y va a pagar 150€ necesita sentir que esto es serio
4. **Capturar tráfico callejero** — las pegatinas en los claudios de la calle llevan a claudio.art

**Lo que NO tiene que hacer:**
- Contar toda la historia (eso lo hace Instagram)
- Ser un portfolio de artista clásico
- Parecer una galería de arte online
- Parecer una marca de lujo o aspiracional

---

## Arquitectura de páginas

La web es una **landing híbrida** — una sola página larga con secciones/módulos, más páginas internas accesibles desde esas secciones. No es navegación de múltiples páginas independientes.

### Estructura de la home (una sola página, scroll)

```
claudio.art (/)
│
├── [MÓDULO 1] Hero
│   ├── Video de fondo (Claudio en la calle, pintando)
│   ├── Logo / firma "claudio" — elemento interactivo
│   └── Sin texto de marketing. La imagen habla.
│
├── [MÓDULO 2] Drop — dos estados según si hay drop activo
│   │
│   ├── ESTADO A — Drop activo:
│   │   ├── "Drop — X claudios. Corre, quedan X."
│   │   ├── Fotos de los claudios disponibles
│   │   └── Botón de compra directo
│   │
│   └── ESTADO B — Sin drop activo:
│       ├── "Todos los claudios vendidos."
│       ├── Camiseta disponible + botón comprar (siempre en stock)
│       └── Captura de email: "¿Quieres saber cuándo es el próximo drop? Te avisamos."
│
├── [MÓDULO 3] Obra
│   ├── Últimas 1-2 entradas del blog de Claudio (imagen + texto corto)
│   └── CTA: "Ver más" → /obra (página completa del blog)
│
├── [MÓDULO 4] Sobre
│   ├── Vídeo de Claudio (proceso, calle, quién es)
│   ├── Texto editorial — en voz de Claudio, tono honesto
│   └── Estética: editorial de moda / artístico, no corporativo
│
├── [MÓDULO 5] Newsletter / Contacto
│   └── "No te pierdas las últimas novedades." + captura de email
│
└── [FOOTER]
    └── Links legales, Instagram, email de contacto
```

### Páginas internas

```
/obra          — Blog completo. CMS: Claudio lo gestiona desde el admin de Shopify.
/politica-de-envios-y-devoluciones — Texto legal.
(No hay /sobre ni /contacto como páginas separadas — están en la home como módulos)
```

---

## El problema de "pocos productos" — y cómo lo resolvemos

La tienda no es una tienda convencional. El modelo es drop: hay un evento de venta periódico con 8-20 piezas que se agotan en minutos. La mayor parte del tiempo la tienda está vacía. Eso no es un problema — es la propuesta.

**La página `/tienda` tiene dos estados:**

**Estado activo (durante el drop):**
- Fotos grandes de los claudios disponibles
- Precio y botón de compra claro
- Stock visible en tiempo real ("quedan 3")

**Estado inactivo (entre drops):**
- Mensaje directo: "No hay ninguno disponible ahora mismo."
- CTA a Instagram: "Sigue @cl4u8io para enterarte del próximo drop"
- Opcionalmente: foto del último drop con "sold out" — comunica que hay demanda real

**La escasez es el producto.** Una tienda "vacía" que dice "sold out" comunica más valor que una tienda llena con poca venta.

**Lo que llena la web de vida entre drops:**
- `/obra` — Claudio puede subir contenido aquí cuando quiera, sin presión comercial
- El home puede mostrar siempre la última entrada de /obra
- La narrativa general de la web (el /sobre) da contexto que convierte visitantes fríos

---

## Sección /obra — cómo funciona el CMS

Shopify tiene un sistema de blog nativo que funciona exactamente como un CMS ligero. No hace falta ninguna herramienta externa.

**Cómo lo usará Claudio:**
1. Entra al panel de administración de Shopify (desde el móvil o el ordenador)
2. Va a "Contenido > Blog"
3. Crea una entrada: sube foto(s), escribe un texto breve (o no escribe nada), guarda
4. La entrada aparece en claudio.art/obra inmediatamente

**Formato de cada entrada:**
- Imagen principal (la obra, el proceso, lo que sea)
- Título opcional (puede ser una fecha o una frase corta)
- Texto corto opcional — Claudio decide si escribe o no
- Si la obra es vendible: link de contacto

No hay categorías, no hay tags, no hay complicación. Es un archivo visual y cronológico.

---

## Productos del catálogo

| Producto | Precio | Estado |
|---|---|---|
| Claudio estándar (naranja + negro) | 150€ | Core — lanzar en mayo |
| Claudio edición color (verde/azul/amarillo) | 200-250€ | Lanzar con tienda |
| Camisetas (firma "claudio") | 35-50€ | Diferido — 3-6 meses post-lanzamiento |

**Nota:** las camisetas no se lanzan en mayo. La tienda empieza solo con claudios.

---

## Diseño — principios

**Paleta de color:**
- Base: negro y blanco
- Acentos (los colores de la obra de Claudio):
  - Naranja: `#FF8C6C`
  - Rojo: `#EC6768`
  - Azul: `#417DE1`
  - Amarillo: `#EED004`
  - Verde: `#228761`
  - (Pueden ajustarse ligeramente — son los de referencia)
- Uso de color: puntual y con criterio — la base es B&N, el color aparece como acento en elementos clave

**Tono visual:**
- Crudo, honesto, artesanal — no pulido ni corporativo
- Fotografía y vídeo de obra como protagonistas — sin filtros, sin over-production
- Tipografía: sin serifa, limpia, sin pretensiones
- Referencias: editorial de moda (no galería de arte, no tienda de streetwear)

**Lo que NO queremos:**
- Aspecto de galería de arte online
- Aspecto de tienda de streetwear/hype
- Aspecto de marca de lujo
- Muchas animaciones o efectos innecesarios

**Referente de tono:** la cuenta de Instagram de @cl4u8io — eso es lo que tiene que transmitir la web

---

## Copy y voz

La voz es Claudio. Directa, sin marketing, sin palabras vacías. Primera persona cuando sea posible.

**Ejemplos de tono correcto:**
- "No queda ninguno. Sigue @cl4u8io en Instagram para el próximo."
- "Arte hecho de lo que Madrid tira. Devuelto a Madrid."
- "Somos dos hermanos intentando vivir de lo que nos gusta."

**Ejemplos de tono incorrecto:**
- "Descubre nuestra exclusiva colección de arte urbano"
- "Obras únicas de edición limitada para los más exigentes"
- Cualquier cosa que suene a newsletter corporativa

---

## Mecánica del drop — lo que afecta a la web

1. Claudio anuncia el drop en Instagram Stories con link directo al producto (no al home)
2. A la hora anunciada, el producto se activa en Shopify
3. La tienda muestra el stock en tiempo real
4. Cuando se agota: "Sold out" automático
5. Email automático al comprador con mensaje de Claudio: "Gracias por llevarte este claudio a casa. Pronto sale de camino."

**Regla de links:** el link del Story va siempre al producto específico del drop, no al home. Cada click extra es una conversión perdida.

---

## Páginas legales

- `/politica-de-envios-y-devoluciones` — texto completo en `web/specs/politica-envios-devoluciones.md`
  - Envío solo a España peninsular y Baleares
  - 1-2 días hábiles para preparar, 2-5 días de tránsito
  - Devoluciones: 14 días (pendiente de confirmar con Chema si aplica bien personal)
  - Daños en tránsito: reembolso completo con foto en 48h

---

## Estado actual

- [x] Tienda Shopify creada (claudio-171993.myshopify.com)
- [ ] Shopify CLI configurado
- [ ] Tema base seleccionado y descargado
- [ ] CLAUDE.md creado en claudio-theme
- [ ] Páginas creadas en Shopify
- [ ] Tema customizado
- [ ] Dominio claudio.art conectado
- [ ] Stripe conectado
- [ ] Drop de prueba programado (1 mayo)

---

## Decisiones pendientes (relevantes para la web)

- [ ] Confirmar dominio: ¿`claudio.art` o arrancamos con otro y migramos?
- [ ] Confirmar política de devoluciones: ¿opción A (14 días) u opción B (bien personalizado)?
- [ ] Email de contacto de la tienda — definir cuál
- [ ] Fotos de producto para el lanzamiento — ¿están listas?
- [ ] Texto de /sobre — en voz de Claudio, pendiente de redactar
