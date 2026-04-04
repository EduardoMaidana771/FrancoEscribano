# Captura completa del paso 4 en Chrome

La forma mas simple y fiable para capturar todo mientras Franco navega es exportar un HAR desde Chrome DevTools.

## Opcion recomendada

1. Abrir Chrome en la pantalla de DGR.
2. Presionar F12.
3. Ir a la pestaña Network.
4. Activar Preserve log.
5. Activar Disable cache.
6. Filtrar por Fetch/XHR.
7. Borrar el log actual con el icono de limpiar.
8. Hacer que Franco inicie sesion y navegue hasta el paso 4.
9. Ejecutar las acciones importantes del paso 4, una por una:
   - entrar al paso 4
   - cambiar tipo de persona
   - buscar o seleccionar persona
   - agregar integrante o titular
   - avanzar o guardar
10. Cuando termine, en la grilla de Network hacer clic derecho y usar Save all as HAR with content.

## Que me pasas despues

Pasan el archivo HAR al workspace y yo extraigo:

- endpoints nuevos
- headers importantes
- cookies relevantes
- DynFormKey
- context
- payloads POST completos
- diferencias entre acciones del paso 4

## Script listo para procesarlo

Ejecutar:

```powershell
python .\analyze_dgr_har.py .\archivo.har --out .\dgr_har_analysis.json
```

Luego yo reviso el archivo de salida y te digo cuales son los endpoints reales y cuales conviene automatizar.

## Opcion todavia mas practica durante la llamada

Si quieren minimizar ruido:

1. Abran una ventana nueva de Chrome solo para DGR.
2. Empiecen a grabar en Network justo antes de entrar al paso 4.
3. No cambien de pestaña ni recarguen otras paginas.
4. Exporten el HAR apenas terminen ese paso.

Asi el HAR queda mucho mas limpio y el analisis sale casi directo.

## Limitacion importante

Yo no puedo capturar en vivo directamente desde tu Chrome si no me pegas el HAR o un Copy as cURL. No tengo acceso al browser del usuario en tiempo real desde este entorno.

Pero con HAR exportado si te puedo procesar todo de una sola vez, que en la practica es la forma correcta para este caso.