# Boletería Solé — GetBack Duitama, 24 de octubre

Web de boletas con pago por Bre-B, QR de entrada y panel del equipo.

| Ruta | Para quién | Qué hace |
| --- | --- | --- |
| `/` | Compradores (link del Linktree) | Elige etapa y cantidad, aparta las boletas |
| `/r/<código>?k=…` | Comprador | Datos de pago Bre-B, subir comprobante y, cuando se aprueba, su QR |
| `/equipo` | Natalia y la banda (contraseña) | Aprobar pagos, ver boletas, vender en persona, resumen, ajustes y topes |
| `/puerta` | Quien esté en la entrada (contraseña) | Escanear QR con la cámara o escribir el código |

## Cómo funciona una compra

1. El comprador aparta sus boletas. Ocupan cupo durante el tiempo de reserva (120 min por defecto).
2. Paga por Bre-B a la llave configurada, con la descripción `SOLE <código>`, y sube el pantallazo.
3. En `/equipo → Por revisar`, alguien confirma que la plata llegó y aprueba.
4. El QR aparece en el enlace del comprador. En la puerta se escanea y queda marcado: cada QR entra una sola vez.

Si no sube el comprobante a tiempo, la reserva vence y el cupo se libera solo.

## Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | La crea sola la integración de Neon (Storage → Create Database → Neon) |
| `ADMIN_PASSWORD` | La contraseña del equipo para `/equipo` y `/puerta` |
| `SESSION_SECRET` | Opcional: un texto largo al azar |

Las tablas se crean solas la primera vez que se usa la web.

## Ajustes desde el panel

En `/equipo → Ajustes`: llave Bre-B y titular, WhatsApp de ayuda, minutos para pagar, abrir o cerrar la venta, y para cada etapa: precio, tope, texto, si está activa y si se vende en la web.

## Desarrollo local

```bash
npm install
DATABASE_URL=postgres://… ADMIN_PASSWORD=… npm run dev
```
