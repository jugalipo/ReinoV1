# Directrices — ReinoV1

> **Ubicación Local:** `/Users/julian/Apps_Antigravity_ElReino/ReinoV1/`  
> **Espejo en Disco:** `/Volumes/C/4_granero/documentos/directrices_apps/directrices_reinov1.md`  
> **Guía de Arquitectura Maestra:** [`ARQUITECTURA_APPS_EL_REINO.md`](file:///Volumes/C/4_granero/documentos/directrices_apps/ARQUITECTURA_APPS_EL_REINO.md)  
> **Última Actualización:** 2026-08-31  

---

## 1. Qué es esto
Hub central y dashboard de hábitos diarios (Hunos), Modo Telón, Trenes, Setas, Jumangiare y control de El Reino.

* **Stack Técnico:** `React / TypeScript / Vite / Tailwind CSS / Lucide`
* **Base de Datos:** `Firebase Firestore (instancia: (default) + puerto, cartelera, biblioteca, aspavientos)`
* **Hosting / Target:** `el-reino-354ca`
* **Detalles Funcionales:** Gestión de los 20 Hunos, firewall matinal, visual lock screen de energía y conexión central.

---

## 2. Cómo se hace
1. **Desarrollo:** Modificaciones en el código fuente dentro de `src/` respetando el diseño minimalista y modo oscuro nativo.
2. **Compilación:** Ejecutar `npm run build` y verificar que no haya errores de compilación ni de tipos.
3. **Control de Versiones:** Guardar cambios con `git add . && git commit -m "..." && git push origin main`.
4. **Despliegue:** Desplegar a Firebase Hosting con `npx firebase-tools deploy --only hosting:el-reino-354ca` (o hosting correspondiente).
5. **Regla del Doble Espejo:** Si se realiza un cambio estructural, técnico o de arquitectura en esta aplicación, debe actualizarse este archivo y su copia espejo en `/Volumes/C/4_granero/documentos/directrices_apps/directrices_reinov1.md`.

---

## 3. Qué NO se hace
* ❌ No sobrecargar la interfaz con textos explicativos largos; priorizar inputs limpios y placeholders claros.
* ❌ No modificar la configuración de Firebase sin verificar el soporte multi-instancia.
* ❌ No dar por finalizado un cambio sin compilar (`npm run build`), comitear y desplegar a producción.
* ❌ No desincronizar este archivo respecto a su espejo en el disco externo.

---

## 4. Cómo se llaman las cosas
* Componentes en `src/components/` en `PascalCase`.
* Hooks y utilidades en `src/hooks/` y `src/utils/`.
* Estilos globales en `src/index.css` / `src/App.css`.

---

## 5. Un ejemplo de referencia
* Consultar [`ARQUITECTURA_APPS_EL_REINO.md`](file:///Volumes/C/4_granero/documentos/directrices_apps/ARQUITECTURA_APPS_EL_REINO.md) para el estándar general de diseño, fuentes y autenticación.

---

## 6. Una checklist
- [ ] Compilación sin errores (`npm run build`).
- [ ] Verificación de la UI en modo oscuro y responsive.
- [ ] Commit y push a GitHub.
- [ ] Despliegue en Firebase Hosting.
- [ ] Actualización en espejo de las directrices en el disco externo.
