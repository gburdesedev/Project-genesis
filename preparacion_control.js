/* Project Genesis / PlayCanvas · Preparación de hierro.
   Las intervenciones regulan el calor; el avance de 0 a 100 ocurre
   CONTINUAMENTE mientras la temperatura permanece en rangos válidos.
   No hay tiempo límite ni resultados de fabricación ligados a este avance.
   Temperaturas normalizadas y equivalencia 1:1: DEMO provisional. */
(() => {
  'use strict';

  const RAW = 'Mineral de hierro';
  const PREPARED = 'Lingote de hierro';
  // Perfil térmico por material. Solo el hierro tiene cifras DEMO: aún no
  // existen umbrales canónicos aprobados para cobre, estaño o bronce.
  // Los perfiles futuros podrán variar objetivo, tolerancia, enfriamiento,
  // respuesta al fuelle y velocidad de proceso SIN reescribir el minijuego.
  const MATERIAL_PROFILES = Object.freeze({
    [PREPARED]: Object.freeze({
      target: 72, baseTolerance: 11, initialGap: 17,
      coolingPerSecond: 0.45, heatResponse: 1, processingSpeed: 1
    })
  });
  const BASE_PROGRESS_PER_SECOND = 3; // Velocidad demostrativa; NO es un cronómetro límite.
  const MASS_COOLING_ADJUSTMENT = 0.02; // Diferencia suave entre tamaños dentro de un mismo tramo de dificultad.
  const THERMAL_TICK_MS = 125;
  const BELLOWS = Object.freeze([
    { label: 'BAJO', gain: 3.8, key: '1', description: 'Corrección fina' },
    { label: 'MODERADO', gain: 8.5, key: '2', description: 'Aporte equilibrado' },
    { label: 'ALTO', gain: 14.5, key: '3', description: 'Recuperación intensa' }
  ]);
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const countOf = (inventory, name) => Math.max(0, Number(inventory?.[name]) || 0);
  const whole = value => Number.isSafeInteger(value) && value > 0;

  function batchProfile(count, material = PREPARED) {
    if (!whole(count)) throw new Error('Cantidad inválida');
    const materialRule = typeof material === 'string' ? MATERIAL_PROFILES[material] : material;
    if (!materialRule || !Number.isFinite(materialRule.target) || materialRule.target < 0 || materialRule.target > 100 ||
        !Number.isFinite(materialRule.baseTolerance) || materialRule.baseTolerance <= 0 ||
        !Number.isFinite(materialRule.coolingPerSecond) || materialRule.coolingPerSecond < 0 ||
        !Number.isFinite(materialRule.heatResponse) || materialRule.heatResponse <= 0 ||
        !Number.isFinite(materialRule.processingSpeed) || materialRule.processingSpeed <= 0 ||
        !Number.isFinite(materialRule.initialGap) || materialRule.initialGap < 0) {
      throw new Error('Perfil térmico del material inválido');
    }
    const extra = Math.max(0, count - 10);
    // Porcentajes aprobados: 100%, 140%, 170%; desde 11, sumar CINCO
    // puntos porcentuales por cada unidad adicional (11=175%, 12=180%).
    // Sin incrementos ocultos del 2,5% por unidad ni porcentajes compuestos.
    const effortMultiplier = count === 1 ? 1 : count <= 5 ? 1.4 : count <= 10 ? 1.7 : 1.7 + 0.05 * extra;
    const difficultyMultiplier = effortMultiplier;
    // Los porcentajes de dificultad estrechan la precisión requerida.
    // El perfil de cada material controla independientemente el comportamiento.
    const thermalLoad = Math.sqrt(difficultyMultiplier);
    const tolerance = Math.max(4, materialRule.baseTolerance / difficultyMultiplier);
    const thermalInertia = thermalLoad;
    const coolingPerSecond = materialRule.coolingPerSecond * difficultyMultiplier + MASS_COOLING_ADJUSTMENT * Math.log2(count);
    return {
      count, effortMultiplier, difficultyMultiplier, tolerance, thermalInertia,
      target: materialRule.target, initialGap: materialRule.initialGap,
      coolingPerSecond, heatResponse: materialRule.heatResponse,
      processingSpeed: materialRule.processingSpeed
    };
  }

  function rawStock(required) {
    const inventory = { ...(required || {}) };
    const iron = countOf(inventory, PREPARED);
    if (iron) {
      delete inventory[PREPARED];
      inventory[RAW] = countOf(inventory, RAW) + iron;
    }
    return inventory;
  }

  function shortages(formula, inventory) {
    const requested = {};
    for (const row of formula?.materials || []) requested[row.material] = (requested[row.material] || 0) + row.qty;
    return Object.entries(requested).map(([material, needed]) => ({ material, needed, available: countOf(inventory, material), missing: Math.max(0, needed - countOf(inventory, material)) }));
  }

  function ready(formula, inventory) {
    const rows = shortages(formula, inventory);
    return rows.length > 0 && rows.every(row => row.missing === 0);
  }

  function convert(inventory, count) {
    if (!whole(count) || countOf(inventory, RAW) < count) return false;
    inventory[RAW] -= count;
    inventory[PREPARED] = countOf(inventory, PREPARED) + count;
    return true;
  }

  function actionEffect(temperature, target, profile, action) {
    const power = BELLOWS.find(b => b.key === String(action));
    if (!power) throw new Error('Intervención desconocida');
    const nextTemperature = Math.max(0, Math.min(100, temperature + power.gain * profile.heatResponse / profile.thermalInertia));
    // SOLO 3 intensidades de fuelle. Sin pulsar, la fragua reposa y se enfría.
    // Una intervención cambia la temperatura pero no entrega puntos.
    return { temperature: nextTemperature };
  }

  function progressRate(temperature, target, tolerance) {
    // Curva continua con pico EXCLUSIVO en el centro verde:
    // amarillo (±1 tolerancia) = 20 % del ritmo ideal;
    // extremos azul/naranja (±1,55 tolerancias) = 0.
    const displacement = Math.abs(temperature - target) / tolerance;
    if (displacement >= 1.55) return 0;
    if (displacement <= 1) return 1 - 0.8 * displacement;
    return 0.2 * (1.55 - displacement) / 0.55;
  }

  function temperatureStatus(temperature, target, tolerance) {
    const rate = progressRate(temperature, target, tolerance);
    if (temperature <= target - tolerance * 1.55) return { tone: 'cold', message: 'Demasiado fría: la barra está detenida. Activá el fuelle.' };
    if (temperature >= target + tolerance * 1.55) return { tone: 'hot', message: 'Demasiado caliente: soltá los controles y dejá enfriar.' };
    if (rate >= 0.85) return { tone: 'good', message: 'Muy cerca del punto ideal: avance alto.' };
    if (temperature < target) return { tone: 'near', message: 'Por debajo del punto ideal: cuanto más te acerques, más rápido avanzará.' };
    return { tone: 'near', message: 'Por encima del punto ideal: esperá sin pulsar para recuperar eficiencia.' };
  }

  function heatBands(target, tolerance) {
    const bound = value => Math.max(0, Math.min(100, value));
    const coldEnd = bound(target - tolerance * 1.55);
    const idealStart = bound(target - tolerance);
    const idealEnd = bound(target + tolerance);
    const hotStart = bound(target + tolerance * 1.55);
    return [
      { tone: 'cold', label: 'Frío', from: 0, to: coldEnd },
      { tone: 'near', label: 'Aproximación', from: coldEnd, to: idealStart },
      { tone: 'good', label: 'Trabajo ideal', from: idealStart, to: idealEnd },
      { tone: 'near', label: 'Aproximación', from: idealEnd, to: hotStart },
      { tone: 'hot', label: 'Exceso', from: hotStart, to: 100 }
    ];
  }

  function heatGradient(target, tolerance) {
    const bands = heatBands(target, tolerance);
    const point = value => Math.max(0, Math.min(100, value)).toFixed(2) + '%';
    const blueEdge = bands[0].to;
    const coldYellow = bands[1].to;
    const hotYellow = bands[3].from;
    const orangeEdge = bands[3].to;
    return `linear-gradient(90deg, #21558d 0%, #4784bd ${point(blueEdge)}, #e9c24b ${point(coldYellow)}, #24bf62 ${point(target)}, #e9c24b ${point(hotYellow)}, #f29a42 ${point(orangeEdge)}, #d9652e 100%)`;
  }

  function passiveCooling(temperature, elapsedSeconds, profile) {
    const elapsed = Math.max(0, elapsedSeconds);
    return Math.max(0, temperature - elapsed * profile.coolingPerSecond);
  }

  function progressGain(temperature, target, profile, elapsedSeconds) {
    const elapsed = Math.max(0, elapsedSeconds);
    // La barra avanza según cercanía CONTINUA al punto ideal.
    // Al alejarse disminuye progresivamente, hasta detenerse en los extremos.
    return elapsed * BASE_PROGRESS_PER_SECOND * profile.processingSpeed *
      progressRate(temperature, target, profile.tolerance) / profile.effortMultiplier;
  }

  function advanceWork(work, elapsedSeconds) {
    const elapsed = Math.max(0, elapsedSeconds);
    // Muestra intermedia del calor para que el avance sea estable entre ticks
    // aunque se crucen levemente los bordes de una franja.
    const midTemperature = passiveCooling(work.temperature, elapsed / 2, work.batch);
    work.progress = Math.min(100, work.progress + progressGain(midTemperature, work.target, work.batch, elapsed));
    work.temperature = passiveCooling(work.temperature, elapsed, work.batch);
  }

  let session = null;
  let thermalTimer = null;

  function halt() {
    if (thermalTimer !== null) clearInterval(thermalTimer);
    thermalTimer = null;
  }

  function passiveStep() {
    const ctx = session, work = ctx?.work;
    if (!ctx || ctx.mode !== 'running' || !work || work.done) { halt(); return; }
    const now = performance.now();
    const elapsed = Math.max(0, Math.min((now - work.lastThermalAt) / 1000, 0.5));
    work.lastThermalAt = now;
    // Las pestañas en segundo plano no deben castigar ni agotar tandas.
    if (document.hidden) return;
    advanceWork(work, elapsed);
    if (work.progress >= 100 - 0.000001) {
      work.progress = 100;
      finish();
    } else {
      drawThermal();
    }
  }

  function bind(id, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  }

  function close() {
    if (!session) return;
    const ctx = session;
    halt();
    session = null;
    document.removeEventListener('keydown', onKeyDown, true);
    ctx.closeModal();
  }

  function display(content, compact = false) {
    const ctx = session;
    if (!ctx) return;
    ctx.modal(`<div class="prepRoot" id="prepRoot">
      <header class="prepMasthead"><div class="prepMark">✥</div><div><small>EL EQUILIBRIO TAMBIÉN CREA</small><h2>PROJECT GENESIS</h2><span>TALLER DEL ${escape(ctx.profession.toUpperCase())} · PREPARACIÓN</span></div><button class="prepClose" id="prepClose" aria-label="Cerrar menú">✕</button></header>
      ${content}<footer class="prepFoot"><span>PERFIL DE DEMOSTRACIÓN · SIN XP, PÉRDIDA DE MATERIALES NI MODIFICACIÓN DE RAREZA</span><span>ESC para cerrar · 1/2/3 fuelle · sin pulsar: enfriar</span></footer>
    </div>`, compact ? 'preparationModal preparationCompact' : 'preparationModal');
    bind('prepClose', close);
  }

  function renderMenu() {
    const ctx = session;
    if (!ctx) return;
    halt();
    ctx.mode = 'menu';
    const raw = countOf(ctx.inventory, RAW), iron = countOf(ctx.inventory, PREPARED), max = countOf(ctx.requiredStock, PREPARED);
    ctx.count = raw ? Math.min(Math.max(ctx.count || 1, 1), raw) : 0;
    const shortage = shortages(ctx.formula, ctx.inventory), canCraft = ready(ctx.formula, ctx.inventory);
    const currentNeeds = shortage.map(row => `<div class="prepNeed ${row.missing ? 'short' : 'met'}"><span>${escape(row.material)}</span><strong>${row.available} / ${row.needed}</strong></div>`).join('');
    const batch = raw ? batchProfile(ctx.count) : null;
    const materialPanel = ctx.profession === 'Herrero' ? `<div class="prepMaterials"><button class="prepMaterial selected" id="prepSelectIron" ${raw ? '' : 'disabled'}><span class="prepMaterialIcon">◆</span><span><b>${PREPARED}</b><small>Desde ${RAW} · fundición</small></span><span class="prepMaterialCount"><strong>${raw}</strong> en bruto<br><em>${iron} preparado${iron !== 1 ? 's' : ''}</em></span></button></div>`
      : `<div class="prepNotice">El proceso térmico de lingotes corresponde al Herrero. Esta ruta conserva sus materiales de sesión; no se inventó un minijuego de fuelle para Curtidor.</div>`;
    const preview = raw && ctx.profession === 'Herrero' ? `<div class="prepSelectedSymbol">◆</div><p class="prepEy">MINERAL → LINGOTE</p><h3>Fundición de hierro</h3><p class="prepSub">Regulá el calor con tres intensidades de fuelle; soltá para enfriar. La barra avanza según la cercanía al punto ideal, no al pulsar.</p><div class="prepBalance"><span>En bruto<b>${raw}</b></span><span>Preparados<b>${iron}</b></span><span>Total de sesión<b>${max}</b></span></div><div class="prepQuantity"><span>Cantidad de la tanda</span><div><button id="prepLess" aria-label="Reducir cantidad" ${ctx.count <= 1 ? 'disabled' : ''}>−</button><strong>${ctx.count}</strong><button id="prepMore" aria-label="Aumentar cantidad" ${ctx.count >= raw ? 'disabled' : ''}>+</button></div></div><p class="prepBatchInfo">Dificultad relativa: <strong>${Math.round(batch.difficultyMultiplier * 100)} %</strong> · Tolerancia térmica ${batch.tolerance.toFixed(1)} puntos.</p><button class="prepPrimary" id="prepStart">INICIAR TANDA DE ${ctx.count} LINGOTE${ctx.count === 1 ? '' : 'S'}</button>`
      : `<div class="prepSelectedSymbol">✓</div><h3>${ctx.profession === 'Herrero' ? 'No quedan minerales por preparar' : 'Ruta de fabricación disponible'}</h3><p class="prepSub">${ctx.profession === 'Herrero' ? 'Todos los lingotes de esta sesión ya se procesaron.' : 'El sistema térmico del Herrero se encuentra separado de esta profesión.'}</p>`;
    display(`<nav class="prepTabs" aria-label="Menú de trabajo"><span class="prepTab active">PREPARACIÓN</span><button id="prepFabricateTab" class="prepTab ${canCraft ? 'available' : ''}" ${canCraft ? '' : 'disabled'}>FABRICACIÓN ${canCraft ? '↗' : '🔒'}</button><button class="prepTab locked" disabled>REFINAMIENTO 🔒</button><button class="prepTab locked" disabled>FUSIONES 🔒</button></nav>
      <div class="prepColumns"><section class="prepPanel prepList"><h3>MATERIALES</h3><p>El inventario distingue materia prima y material preparado. Las fórmulas permanecen intactas.</p>${materialPanel}</section><section class="prepPanel prepScene"><div class="prepSceneTop"><span>FRAGUA · CONTROL TÉRMICO</span><span>VISTA DE DEMO</span></div>${preview}</section><section class="prepPanel prepRequirement"><h3>${escape(ctx.recipeName)}</h3><p>Materiales requeridos para la próxima fabricación.</p><div class="prepChecklist">${currentNeeds}</div><div class="prepStatus ${canCraft ? 'ready' : ''}">${canCraft ? '✓ FÓRMULA COMPLETA' : '◌ PREPARAR MATERIALES'}</div><button class="prepPrimary" id="prepFabricate" ${canCraft ? '' : 'disabled'}>FABRICAR</button><p class="prepNotice">Ni la cantidad de la tanda ni la habilidad térmica modifican el cierre procedural del objeto.</p></section></div>`);
    bind('prepLess', () => { ctx.count = Math.max(1, ctx.count - 1); renderMenu(); });
    bind('prepMore', () => { ctx.count = Math.min(raw, ctx.count + 1); renderMenu(); });
    bind('prepStart', start);
    bind('prepFabricate', craft);
    bind('prepFabricateTab', craft);
  }

  function craft() {
    const ctx = session;
    if (!ctx || !ready(ctx.formula, ctx.inventory)) return;
    halt();
    session = null;
    document.removeEventListener('keydown', onKeyDown, true);
    ctx.onCraft();
  }

  function start() {
    const ctx = session;
    if (!ctx || ctx.profession !== 'Herrero' || !whole(ctx.count) || ctx.count > countOf(ctx.inventory, RAW)) return;
    const batch = batchProfile(ctx.count, PREPARED), target = batch.target;
    ctx.mode = 'running';
    ctx.work = { count: ctx.count, batch, target, temperature: Math.max(0, target - batch.initialGap), progress: 0, clicks: 0, done: false };
    renderThermal();
  }

  function intervene(action) {
    const ctx = session, work = ctx?.work;
    if (!ctx || ctx.mode !== 'running' || !work || work.done) return false;
    passiveStep(); // Primero liquidar el avance térmico acumulado, sin premios por clic.
    if (work.done || ctx.mode !== 'running') return false;
    const result = actionEffect(work.temperature, work.target, work.batch, action);
    work.temperature = result.temperature;
    work.clicks++;
    drawThermal();
    return true;
  }

  function drawThermal() {
    const ctx = session, work = ctx?.work;
    if (!ctx || !work || ctx.mode !== 'running') return;
    const temperature = Math.max(0, Math.min(100, work.temperature));
    const status = temperatureStatus(temperature, work.target, work.batch.tolerance);
    const needle = document.getElementById('prepHeatNeedle');
    const gauge = document.getElementById('prepHeatGauge');
    const number = document.getElementById('prepHeatNumber');
    const message = document.getElementById('prepHeatMessage');
    const progress = document.getElementById('prepCraftProgress');
    const progressText = document.getElementById('prepCraftNumber');
    const clicksText = document.getElementById('prepActions');
    const pointsText = document.getElementById('prepActionPoints');
    if (needle) { needle.style.left = `${temperature}%`; needle.dataset.tone = status.tone; }
    if (gauge) { gauge.setAttribute('aria-valuenow', String(Math.round(temperature))); gauge.setAttribute('aria-valuetext', status.message); }
    if (number) number.textContent = `${Math.round(temperature)} / 100`;
    if (message) { message.textContent = status.message; message.dataset.tone = status.tone; }
    if (progress) { progress.style.width = `${Math.min(100, work.progress)}%`; progress.setAttribute('aria-valuenow', work.progress.toFixed(2)); }
    if (progressText) progressText.textContent = `${work.progress.toFixed(1)} / 100`;
    if (clicksText) clicksText.textContent = String(work.clicks);
    if (pointsText) {
      const effectiveness = progressRate(temperature, work.target, work.batch.tolerance);
      pointsText.textContent = effectiveness === 0
        ? '● AVANCE DETENIDO · demasiado frío o caliente.'
        : `● EFICIENCIA TÉRMICA ${(effectiveness * 100).toFixed(1)} % · el avance crece cuanto más cerca del centro verde.`;
      pointsText.dataset.tone = status.tone;
    }
  }

  function renderThermal() {
    const ctx = session, work = ctx?.work;
    if (!ctx || !work) return;
    halt();
    work.lastThermalAt = performance.now();
    const gradient = heatGradient(work.target, work.batch.tolerance);
    display(`<div class="prepThermal"><div class="prepThermalHeading"><div><p class="prepEy">MINIJUEGO · PREPARACIÓN DE MATERIALES</p><h3>Control de la fragua</h3><p>${work.count}× ${PREPARED} · mantené el calor en la franja de trabajo para completar la barra.</p></div><div class="prepThermalBatch">TANDA: ${work.count} · DIFICULTAD ${Math.round(work.batch.difficultyMultiplier * 100)}%</div></div>
      <section class="prepThermalStage"><div class="prepFireVisual"><div class="prepFireIcon" aria-hidden="true">♨</div><span>FRAGUA · DEMOSTRACIÓN</span></div><div class="prepThermalReadouts"><div class="prepReadout"><span>TEMPERATURA ACTUAL</span><strong id="prepHeatNumber">${Math.round(work.temperature)} / 100</strong></div><div class="prepReadout"><span>PUNTO IDEAL DEL MATERIAL</span><strong>${Math.round(work.target)} / 100</strong></div><div class="prepReadout"><span>INTERVENCIONES</span><strong id="prepActions">0</strong></div></div><div class="prepHeatGauge" id="prepHeatGauge" role="meter" aria-label="Temperatura de la fragua" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(work.temperature)}" style="background:${gradient}"><span class="prepHeatTarget" style="left:${work.target}%" aria-hidden="true"></span><span class="prepHeatNeedle" id="prepHeatNeedle" aria-hidden="true"></span></div><div class="prepHeatLegend" aria-label="Significado de los colores"><span><i class="cold"></i>AZUL · FRÍO</span><span><i class="near"></i>AMARILLO · AJUSTE</span><span><i class="good"></i>VERDE · IDEAL</span><span><i class="hot"></i>NARANJA · EXCESO</span></div><div class="prepHeatMessage" id="prepHeatMessage" aria-live="polite">Acercá la línea blanca al centro verde.</div><p>El degradado muestra cómo cambia la eficiencia. La línea blanca es el calor actual; la marca fija señala el objetivo del material. Al no pulsar nada la fragua se enfría sola.</p></section>
      <section class="prepThermalControls"><h4>INTERVENÍ SOBRE LA FRAGUA</h4><p>Tres intensidades de fuelle para subir el calor. Soltá los controles para dejarlo bajar. El avance es máximo en el centro verde, disminuye gradualmente hacia amarillo y se detiene en azul o naranja. Cada material tendrá su propio comportamiento térmico.</p><div class="prepBellowButtons">${BELLOWS.map((power, index) => `<button id="prepBellow${index}" class="prepBellow"><b>${power.label}</b><small>${power.description}</small><span>TECLA ${power.key}</span></button>`).join('')}</div></section>
      <section class="prepThermalProgress"><div class="prepThermalProgressTitle"><strong>AVANCE DE PREPARACIÓN</strong><b id="prepCraftNumber">0.0 / 100</b></div><div class="prepProgressBar"><span id="prepCraftProgress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Avance de preparación"></span></div><p id="prepActionPoints">La barra avanzará cuando la fragua entre en el rango de trabajo.</p><p>El avance nunca retrocede. Llegar a 100 completa la preparación; las intervenciones no otorgan puntos por sí mismas ni modifican el futuro objeto.</p></section><div class="prepGameActions"><button id="prepAbandon" class="secondary">Cancelar tanda sin consumir mineral</button></div></div>`, false);
    BELLOWS.forEach((power, index) => bind(`prepBellow${index}`, () => intervene(power.key)));
     bind('prepAbandon', renderMenu);
    drawThermal();
    thermalTimer = setInterval(passiveStep, THERMAL_TICK_MS);
  }

  function finish() {
    const ctx = session, work = ctx?.work;
    if (!ctx || !work || work.done) return;
    work.done = true;
    halt();
    const success = convert(ctx.inventory, work.count);
    if (success) ctx.onInventoryChanged?.();
    ctx.mode = 'result';
    display(`<div class="prepResult"><div class="prepResultSymbol">${success ? '✓' : '!'}</div><p class="prepEy">${success ? 'PREPARACIÓN COMPLETADA' : 'LOTE NO APLICADO'}</p><h3>${work.count}× ${PREPARED}</h3><p>${success ? 'Los lingotes se incorporaron al inventario. La fórmula procedural y sus futuros resultados permanecen intactos.' : 'El inventario cambió durante el proceso. No se descontó material.'}</p><div class="prepBalance"><span>Mineral restante<b>${countOf(ctx.inventory, RAW)}</b></span><span>Lingotes listos<b>${countOf(ctx.inventory, PREPARED)}</b></span><span>Intervenciones<b>${work.clicks}</b></span></div><div class="prepGameActions"><button id="prepResultClose" class="secondary">Cerrar</button><button id="prepResultBack" class="prepPrimary">Volver al menú del taller</button></div></div>`, false);
    bind('prepResultClose', close);
    bind('prepResultBack', renderMenu);
  }

  function onKeyDown(event) {
    const ctx = session;
    if (!ctx) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (ctx.mode === 'running') renderMenu();
      else close();
      return;
    }
    if (ctx.mode === 'running' && /^[123]$/.test(event.key)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      intervene(event.key);
    }
  }

  function open(options) {
    if (!options || typeof options.modal !== 'function' || typeof options.closeModal !== 'function' || typeof options.onCraft !== 'function' || !options.inventory || !options.formula || !options.requiredStock) throw new Error('Preparación: faltan datos del taller');
    if (session) close();
    session = { ...options, mode: 'menu', count: 1, work: null };
    document.addEventListener('keydown', onKeyDown, true);
    renderMenu();
  }

  window.GenesisPreparation = Object.freeze({ rawStock, shortages, ready, batchProfile, actionEffect, progressRate, progressGain, temperatureStatus, heatBands, heatGradient, passiveCooling, convert, open });
})();
