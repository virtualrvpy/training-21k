# 21K Agosto 2026 — Training App

Plan de entrenamiento de 22 semanas con integración de Strava.

## 🚀 Publicar en GitHub Pages

### 1. Crear el repositorio

```bash
git init
git add .
git commit -m "Initial commit — training app 21K 2026"
```

Creá un repo en GitHub (ej: `training-21k`) y luego:

```bash
git remote add origin https://github.com/TU_USUARIO/training-21k.git
git branch -M main
git push -u origin main
```

### 2. Activar GitHub Pages

1. Ir a **Settings → Pages** en tu repositorio
2. En **Source**, seleccionar `main` branch y carpeta `/ (root)`
3. Guardar — en ~1 minuto la app estará en:

```
https://TU_USUARIO.github.io/training-21k/
```

### 3. Configurar Strava

1. Ir a [strava.com/settings/api](https://www.strava.com/settings/api)
2. Crear una aplicación con estos datos:
   - **Website**: `https://TU_USUARIO.github.io`
   - **Authorization Callback Domain**: `TU_USUARIO.github.io`
3. Copiar **Client ID** y **Client Secret**
4. En la app, ir a la pestaña **Strava** e ingresar las credenciales

## 📁 Estructura

```
├── index.html          # Entry point con tabs y panel de ritmos
├── css/
│   ├── base.css        # Design system, nav, settings panel
│   └── plan.css        # Plan + Strava estilos
├── js/
│   ├── paces.js        # Gestión de ritmos (localStorage)
│   ├── plan.js         # Plan 22 semanas con pace tokens
│   ├── strava.js       # OAuth + API + cache de actividades
│   └── app.js          # Controlador principal
└── README.md
```

## 🏃 Features

- **Plan completo 22 semanas** — Base → Desarrollo → Peak → Taper
- **Ritmos ajustables** — editá tus zonas y el plan se actualiza en tiempo real
- **Recalculo por VDOT** — ingresá tu VDOT y recalcula todas las zonas automáticamente
- **Strava integrado** — ve tus actividades agrupadas por semana del plan
- **Progreso por semana** — barra de km reales vs km planificados
- **Cache local** — las actividades se guardan 30 min para no re-fetchear

## Zonas de ritmo (VDOT 42–43)

| Zona | Pace |
|------|------|
| Fácil (E) | 6:35/km |
| Moderado (M) | 6:00/km |
| Tempo (T) | 5:15/km |
| Intervalos (I) | 4:50/km |
| Pace 21K | 5:40/km |
