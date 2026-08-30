# Directrices — ReinoV1 (El Reino)

## 1. Qué es esto
Aplicación central y dashboard de hábitos diarios, enfoque, vademécum, métricas y control de El Reino (`https://el-reino-354ca.web.app/`).

## 2. Cómo se hace
1. **Desarrollo:** Código en React + TypeScript + Tailwind CSS / Lucide Icons (`App.tsx`, `components/`, `hooks/`).
2. **Compilación:** `npm run build` genera la distribución en `dist/`.
3. **Control de versiones:** `git commit` y `git push origin main`.
4. **Despliegue:** `npx firebase-tools deploy --only hosting:el-reino-354ca` (o `npx firebase-tools deploy --only hosting`).

## 3. Qué NO se hace
* No romper las integraciones con Firestore multi-instancia (`(default)`, `sir-salud`, etc.).
* No dejar elementos residuales de audio/voz si se decide simplificar la interfaz.
* No desplegar sin probar previamente la compilación con `npm run build`.

## 4. Cómo se llaman las cosas
* Componentes en `components/`.
* Tipos de datos en `types.ts`.
* Configuración de Firebase en `firebase.ts`.

## 5. Un ejemplo de referencia
* `App.tsx` y `components/` como estándar de diseño oscuro, minimalista y funcional de El Reino.

## 6. Una checklist
- [ ] Compilación TypeScript y Vite sin errores (`npm run build`).
- [ ] Verificación de la UI y barras de navegación.
- [ ] Commit y push a GitHub.
- [ ] Despliegue en Firebase Hosting (`el-reino-354ca`).
- [ ] ¿Falló o costó algo durante el proceso? ➡️ Incorporarlo a las directrices.
