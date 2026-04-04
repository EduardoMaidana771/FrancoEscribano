# DGR - prueba local de modelos por marca

Este repo tiene un script para replicar la llamada que hace la pagina de DGR cuando cambias la marca.

## 1) Preparar entorno

1. Tener Python 3.10+.
2. Copiar `.env.example` a `.env`.
3. Completar en `.env`:
   - `DGR_COOKIE`
   - `DGR_DYNFORMKEY`
   - `DGR_CONTEXT`
   - `DGR_471_1`

## 2) Ejecutar

```bash
python dgr_models_client.py --brand-id 5
```

Opcional, si quieres setear tambien descripcion de marca:

```bash
python dgr_models_client.py --brand-id 5 --brand-label ARO
```

## 3) Salida esperada

Lista de modelos que devuelve el endpoint, por ejemplo:

```text
OK: 11 modelos
- 38: AM02ROCSTA
- 39: AM102
- ...
```

## Notas importantes

- Si da 401/403 o vacio, la sesion expiro: renueva cookies y vuelve a probar.
- El campo `DGR_471_1` puede cambiar entre sesiones/pantallas.
- No commitear `.env`.
