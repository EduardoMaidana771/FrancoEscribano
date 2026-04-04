# Templates

Colocar aquí el archivo `compraventa.docx` que será usado como plantilla para generar documentos.

## Variables disponibles en la plantilla

Las variables se usan con la sintaxis `{variable_nombre}` de docxtemplater.
Para condicionales: `{#condicion}...{/condicion}`

### Datos del escribano
- `{escribano_nombre}`, `{escribano_iniciales}`, `{ciudad}`

### Vendedor
- `{vendedor_nombre}`, `{vendedor_ci}`, `{vendedor_nacionalidad}`
- `{vendedor_nacimiento}`, `{vendedor_lugar_nacimiento}`
- `{vendedor_estado_civil}`, `{vendedor_conyuge}`
- `{vendedor_domicilio}`, `{vendedor_departamento}`
- Empresa: `{#vendedor_es_empresa}...{/vendedor_es_empresa}`
  - `{vendedor_razon_social}`, `{vendedor_tipo_empresa}`, `{vendedor_rut}`

### Vendedor 2 (cónyuge)
- `{#hay_vendedor2}...{/hay_vendedor2}`
- `{vendedor2_nombre}`, `{vendedor2_ci}`, etc.

### Apoderado
- `{#tiene_apoderado}...{/tiene_apoderado}`
- `{apoderado_nombre}`, `{apoderado_ci}`, `{apoderado_domicilio}`

### Comprador
- Misma estructura que vendedor con prefijo `comprador_`

### Vehículo
- `{vehiculo_marca}`, `{vehiculo_modelo}`, `{vehiculo_anio}`, `{vehiculo_tipo}`
- `{vehiculo_combustible}`, `{vehiculo_cilindrada}`, `{vehiculo_motor}`, `{vehiculo_chasis}`
- `{vehiculo_matricula}`, `{vehiculo_padron}`, `{vehiculo_padron_depto}`
- `{vehiculo_codigo_nacional}`, `{vehiculo_afectacion}`
- `{vehiculo_titular}`, `{vehiculo_titular_ci}`

### Precio
- `{precio_monto}`, `{precio_moneda}`, `{precio_letras}`
- `{#pago_contado}...{/pago_contado}`, `{#pago_financiado}...{/pago_financiado}`
- `{pago_detalle}`

### Declaraciones tributarias
- `{#es_contribuyente_bps}...{/es_contribuyente_bps}` / `{#no_contribuyente_bps}...{/no_contribuyente_bps}`
- Idem para IRAE e IMEBA

### Título anterior
- `{anterior_propietario}`, `{anterior_fecha}`, `{anterior_escribano}`
- `{anterior_registro}`, `{anterior_numero}`, `{anterior_fecha_registro}`

### Seguro
- `{seguro_poliza}`, `{seguro_compania}`, `{seguro_vigencia}`

### Protocolización
- `{matriz_numero}`, `{folio_inicio}`, `{folio_fin}`
- `{papel_serie_proto}`, `{papel_numero_proto}`
- `{papel_serie_testimonio}`, `{papel_numeros_testimonio}`
