// Contenido de diseño de la semana 01. Texto de oro: [[palabra]] (máximo uno por slide).

const sig = '@socialjustoystephy.marketing';

const strike = (items) =>
  `<ul class="strike">${items.map((t) => `<li>${t}</li>`).join('')}</ul>`;
const boxes = (items) => items.map((t) => `<div class="box">${t}</div>`).join('');
const xlist = (items) =>
  `<ul class="xlist">${items.map((t) => `<li><span class="x">✕</span>${t}</li>`).join('')}</ul>`;
const lines = (n) => `<div class="lines">${'<div></div>'.repeat(n)}</div>`;
const bullets = (items) =>
  `<ul class="bullets">${items.map((t) => `<li>${t}</li>`).join('')}</ul>`;

const profile = (label, bio, dim) => `
  <div class="profile ${dim ? 'dim' : ''}">
    <div class="plabel">${label}</div>
    <div class="phead"><div class="avatar"></div><div class="pname">restaurante.ejemplo</div></div>
    <div class="pbio">${bio}</div>
  </div>`;

const wave = `<div class="wave">${[30, 60, 42, 90, 55, 110, 70, 40, 85, 50, 95, 35, 65, 45, 80, 30]
  .map((h) => `<i style="height:${h}px"></i>`)
  .join('')}<span class="arrow">→</span><div class="doc"><b></b><b></b><b></b></div></div>`;

const calendar = `<div class="cal">${Array.from({ length: 28 }, (_, i) =>
  `<i class="${[1, 3, 6, 8, 10, 13, 15, 17, 20, 22, 24, 27].includes(i) ? 'on' : ''}"></i>`
).join('')}</div>`;

const bubble = `<div class="bubble"><p>Hola, ¿tienen mesa para 4 mañana a las 8?</p><span>11:04&nbsp;p.&nbsp;m.</span></div>`;

const stars = `<div class="stars">★★★★★</div>`;

const sticky = `<div class="sticky">Mi semilla mínima:<br><span>______________________</span></div>`;

module.exports = [
  {
    id: '25',
    series: 'CÓDIGO VIRAL',
    theme: 'dark',
    slides: [
      { hook: true, title: 'Tu bio tiene 150 caracteres. Estás desperdiciando [[140]].', sub: 'Y es lo primero que lee quien estaba a punto de reservar.' },
      { title: 'Casi todas las bios dicen [[lo mismo]].', visual: strike(['Pasión por la cocina.', 'Calidad y servicio.', 'Desde 2015.']), sub: 'Nadie decide ir a un lugar por eso.' },
      { title: 'Si no entiendo qué vendes, [[me voy]].', sub: 'Y no te escribo para preguntar. Simplemente no llego.' },
      { title: 'Tu bio no es para presentarte.', sub: 'Es para que alguien dé el [[siguiente paso]].', rule: true },
      { kicker: 'Línea 1', title: 'Qué haces y [[para quién]].', sub: 'No pongas “restaurante”. Pon esto:', visual: boxes(['Cocina caribeña para celebrar en el Centro.']) },
      { kicker: 'Líneas 2 y 3', title: 'Por qué tú. Y qué hacer [[ahora]].', visual: boxes(['Terraza frente a la muralla.', 'Reserva tu mesa por WhatsApp.']), note: 'El enlace va a un solo lugar: donde se compra.' },
      {
        title: 'Tres líneas. Otra bio.',
        visual: `<div class="compare">${profile('Antes', 'Comida con amor<br>Desde 2019<br>Cartagena', true)}${profile('[[Después]]', 'Cocina caribeña para celebrar en el Centro.<br>Terraza frente a la muralla.<br>Reserva tu mesa por WhatsApp.')}</div>`,
        note: 'Ejemplo ilustrativo.',
      },
      { code: 'Nadie compra lo que no entiende.' },
      { title: 'Abre tu perfil. Léelo como un extraño.', sub: '¿Sabrías qué vendes y cómo comprarte? Si quieres que lo miremos contigo, escribe [[DIAGNÓSTICO]] por DM. 30 minutos, gratis.', signature: true },
    ],
  },
  {
    id: '26',
    series: 'IA EN 60 SEGUNDOS',
    theme: 'dark',
    slides: [
      { hook: true, title: '[[5]] tareas que la IA ya puede hacer por ti.', sub: 'Y 3 que nunca debería. La #5 trabaja mientras duermes.' },
      { title: 'No necesitas más horas.', sub: 'Necesitas dejar de hacer [[a mano]] lo que ya no tiene que ser a mano.' },
      { num: '01', title: 'El primer borrador de tus respuestas a reseñas.', sub: 'Le das tu tono y tus reglas. Tú revisas cada una antes de publicar.', note: 'Límite: no publica sola.' },
      { num: '02', title: 'Convertir una nota de voz en un guion.', sub: 'Hablas 3 minutos caminando. La IA lo ordena en gancho, puntos y cierre.', visual: wave, note: 'Límite: las ideas tienen que ser tuyas.' },
      { num: '03', title: 'Resumir los mensajes de la semana.', sub: 'Pegas las preguntas que te hicieron. Te devuelve las 5 que más se repiten. Ahí están tus próximos temas.', note: 'Límite: no pegues datos personales de clientes.' },
      { num: '04', title: 'El borrador de tu calendario del mes.', sub: 'Le das tus fechas, tus productos y tus pilares. Te propone 30 días.', visual: calendar, note: 'Límite: tú decides qué se queda.' },
      { num: '05', title: 'Responder las preguntas de las 11&nbsp;p.&nbsp;m.', sub: 'Un agente por WhatsApp contesta horarios, ubicación y menú al instante. Y te pasa lo importante.', visual: bubble, note: 'Límite: lo delicado lo atiende una persona.' },
      { title: 'Lo que [[nunca]] debería hacer:', visual: xlist(['Contar tu historia.', 'Resolver a un cliente molesto.', 'Publicar sin que alguien revise.']) },
      { code: 'La IA te devuelve horas. No te devuelve tu historia.' },
      { title: '¿Cuál de las 5 te devolvería más horas esta semana?', sub: 'Si es la #5, escribe [[AGENTE]] por DM y te mostramos cómo respondería un agente con tus propios mensajes.', signature: true },
    ],
  },
  {
    id: '27',
    series: 'CÓDIGOS',
    theme: 'light',
    slides: [
      { hook: true, title: 'Fe es seguir [[sembrando]] cuando todavía no ves la cosecha.', sub: 'Para ti, que llevas meses haciendo lo correcto.' },
      { title: 'Hay meses en que haces todo.', sub: 'Publicas. Llamas. Mejoras.<br>Y [[nada]] se mueve.' },
      { title: 'Ahí es donde casi todos [[cambian]] de plan.', sub: 'Otra estrategia. Otro nombre. Otro negocio. Y la semilla se queda a medio crecer.' },
      { title: 'La cosecha no llega por intensidad.', sub: 'Llega por [[constancia]].', rule: true },
      { title: 'Esta semana, anota lo que [[sembraste]].', sub: 'No lo que cosechaste. Tres cosas que hiciste aunque nadie aplaudió.', visual: lines(3) },
      { title: 'Define tu semilla [[mínima]].', sub: 'Lo que haces aunque no tengas ganas. Todos los días.', visual: bullets(['Un post.', 'Una llamada.', 'Una reseña respondida.']) },
      { code: 'Lo que siembras con fe no se pierde. Se demora.' },
      { title: '¿Qué estás sembrando que todavía no ves?', sub: 'Escríbelo en comentarios. Y [[envíaselo]] a quien necesita leer esto hoy.', signature: true },
    ],
  },
  {
    id: '28',
    series: 'CÓDIGO VIRAL',
    theme: 'dark',
    slides: [
      { hook: true, kicker: '30 min', title: '3 cosas para hacer este lunes.', sub: 'Te toman [[30 minutos]]. Y cambian cómo te ve quien todavía no te compra.' },
      { title: 'Esta semana hablamos de muchas cosas.', sub: 'Saber no cambia nada. [[Hacer]], sí. Así que aquí está lo que se hace.' },
      { num: '01', title: 'Reescribe tu bio. 10 minutos.', sub: 'Qué haces y para quién. Por qué tú. Qué hacer ahora. El enlace, a donde se compra.' },
      { num: '02', title: 'Responde tus reseñas pendientes. 15 minutos.', sub: 'Con el prompt del miércoles. La IA escribe, tú revisas y publicas.', visual: stars },
      { num: '03', title: 'Define tu semilla mínima. 5 minutos.', sub: 'La única cosa que vas a hacer todos los días, con o sin ganas. Escríbela y pégala donde la veas.', visual: sticky },
      { title: 'Nada de esto cuesta plata.', sub: 'Cuesta decidirlo [[hoy]] y hacerlo mañana.', rule: true },
      { code: 'Una semana de consejos no vale un lunes de acción.' },
      { title: '¿Cuál de las 3 haces primero?', sub: 'Si quieres que revisemos las tres contigo, escribe [[DIAGNÓSTICO]] por DM. 30 minutos con Justo o Stephy, gratis.', signature: true },
    ],
  },
];

module.exports.covers = [
  { id: 'reel-justo-habla-01', series: 'JUSTO HABLA', theme: 'dark', title: 'No siempre tengo [[ganas]].' },
  { id: 'reel-ia-01', series: 'IA EN 60 SEGUNDOS', theme: 'dark', title: 'Responde tus reseñas con IA. Y con tu [[voz]].' },
  { id: 'reel-barco-01', series: 'DETRÁS DEL BARCO', theme: 'dark', title: 'Un miércoles de producción en [[SOCIAL]].' },
];

module.exports.sig = sig;
