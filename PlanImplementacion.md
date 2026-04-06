Aquí tenés el plan de implementación paso a paso usando los prompts y agentes que acabamos de crear:

---

## Plan de Implementación — 5 Features Pendientes

### Feature 1: DGR Dropdowns (marcas/modelos en el formulario)

**Complejidad**: Alta — **Usar**: Agente `@dgr-specialist`

```
@dgr-specialist Conectar los catálogos de DGR con el TransactionForm. Necesito:
1. Que al cargar el formulario se traigan las marcas de vehículos desde /api/dgr/catalogs
2. Que al seleccionar una marca, se carguen los modelos de esa marca (cascading)
3. Que tipo de vehículo y combustible también vengan de DGR
4. Si DGR no está disponible, permitir escribir manualmente como texto libre
5. Guardar tanto el texto como el ID de DGR para futura minuta
```

**Verificar**: Abrir `/compraventa/nueva`, ver que los dropdowns cargan datos, seleccionar marca → ver modelos, desconectar DGR → ver que el fallback a texto funciona.

---

### Feature 2: Editar y Eliminar Compraventas

**Usar**: `/nueva-feature`

```
/nueva-feature Implementar edición y eliminación de compraventas:

EDITAR:
- Crear página /compraventa/[id]/editar que cargue la transacción existente
- Pre-llenar todos los campos del TransactionForm con los datos de clients + vehicle + transaction
- Cambiar la lógica de guardado para hacer UPDATE en vez de INSERT
- Agregar botón "Editar" en CompraventasList que lleve a esta página

ELIMINAR:
- El botón de eliminar en CompraventasList ya existe pero no tiene handler
- Implementar eliminación con diálogo de confirmación
- Eliminar transaction + clients + vehicle asociados (si no están referenciados por otra transacción)
```

**Verificar**: Crear una compraventa → volver a la lista → click "Editar" → ver datos pre-cargados → modificar algo → guardar → verificar que se actualizó. Eliminar una compraventa → confirmar → verificar que desapareció de la lista.

---

### Feature 3: Template Word (.docx)

**Usar**: `/nueva-feature`

```
/nueva-feature Crear el template Word para compraventas en app/templates/compraventa.docx.

El template debe:
1. Seguir la estructura legal uruguaya de un título de compraventa de vehículo
2. Usar variables Docxtemplater ({variable_name}) para todos los datos dinámicos
3. Incluir secciones condicionales para: representante, co-vendedor, co-comprador, empresa
4. Las 70+ variables están definidas en /api/generate-word/route.ts

Consultá las instrucciones en .github/instructions/word-generation.instructions.md y 
el archivo NotasDeComoFuncionaraLaApp.txt para la estructura del documento legal.
```

**Verificar**: Crear una compraventa completa → desde la lista click "Descargar Word" → abrir el .docx → verificar que todos los campos se llenaron correctamente.

---

### Feature 4: Extracción IA — UI en FileManager

**Usar**: `/nueva-feature`

```
/nueva-feature Agregar interfaz de extracción de datos con IA en FileManager:

1. Después de subir un archivo (imagen), mostrar un botón "Extraer datos" junto al archivo
2. Al clickear, llamar a POST /api/extract con el archivo y tipo (cedula/libreta)
3. Mostrar los datos extraídos en un panel de preview
4. Botón "Usar en formulario" que copie los datos al clipboard o los guarde para pre-llenar
5. El badge "Procesado" ya existe para archivos con extracted_data

Consultá .github/instructions/extraction-ai.instructions.md para los detalles de la API.
```

**Verificar**: Subir foto de cédula → click "Extraer datos" → ver datos extraídos → verificar que se muestra el badge "Procesado".

---

### Feature 5: Validación del Formulario (Zod)

**Usar**: `/nueva-feature`

```
/nueva-feature Agregar validación con Zod al TransactionForm:

Campos obligatorios:
- Vendedor: nombre completo + CI (si persona) o nombre empresa + RUT (si empresa)
- Comprador: igual que vendedor
- Vehículo: marca, modelo, matrícula, padrón
- Precio: monto + moneda

Implementar:
1. Schema Zod en un nuevo archivo app/src/lib/validation.ts
2. Validar al intentar guardar (tanto borrador como completado)
3. Mostrar errores inline en rojo debajo de cada campo
4. Bloquear el guardado si hay errores
5. Scroll al primer error
```

**Verificar**: Intentar guardar formulario vacío → ver errores en rojo → llenar campos obligatorios → errores desaparecen → guardar exitoso.

---

## Orden Recomendado

| # | Feature | Razón del orden |
|---|---|---|
| 1 | **Editar/Eliminar** | Fundacional — necesitás CRUD completo antes de pulir |
| 2 | **Validación Zod** | Protege los datos que se guardan en editar/crear |
| 3 | **DGR Dropdowns** | Mejora la UX del formulario ya validado |
| 4 | **Template Word** | Con datos limpios (validados) el Word sale bien |
| 5 | **Extracción IA** | Feature de productividad, no bloquea nada |

## Workflow por Feature

```
1. Invocar el prompt/agente con la descripción de arriba
2. Revisar los cambios propuestos
3. Probar manualmente en localhost (npm run dev)
4. Cuando esté OK → usar /deploy para:
   - Lint → Build → Commit → Push → Verificar en producción
```

---

Podés copiar cada bloque de texto directo al chat de Copilot cuando estés listo para empezar. ¿Arrancamos con la Feature 1 (Editar/Eliminar)?