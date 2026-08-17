# Retención de datos — logs de consentimiento Rastro

## Qué guardamos
- `site_key`, timestamp, decisión (aceptar/rechazar/custom), versión del banner
- IP truncada (IPv4 /24 o IPv6 /48) y luego hasheada (SHA-256 truncado)
- User-Agent (recortado)

## Qué no guardamos
- Nombre, email ni documento del visitante del sitio del cliente
- IP completa en claro

## Retención
- Por defecto: **365 días** (`CONSENT_RETENTION_DAYS`), configurable por política.
- Objetivo: evidencia operativa razonable, no vigilancia indefinida.

## Exportación
- CSV desde el panel (Fase 2) para auditoría del comercio.

Rastro no es asesoría legal, no garantiza cumplimiento y no cita montos de multa.
