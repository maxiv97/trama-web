// Contenido del centro de ayuda (handoff design_handoff_trama_ayuda).
// Generado a partir de content/*.json del handoff: editar el contenido acá y mantener los JSON
// del handoff como borrador de referencia. Lo marcado `validar: true` o con "[Definir: …]" no se
// publica (ver `isPublishable`) hasta que el equipo confirme la regla de negocio.
import { GarmentStatus } from '../../../core/models/garment.model';

export type HelpRole = 'comun' | 'cedente' | 'comercio';
export type HelpAudience = Exclude<HelpRole, 'comun'>;
/** Filtro del selector de rol: `todos` muestra común + ambos roles. */
export type HelpRoleFilter = 'todos' | HelpAudience;

export type HelpMotivo =
  | 'cuenta'
  | 'recepcion'
  | 'plazos'
  | 'precios'
  | 'liquidaciones'
  | 'no-vendidas'
  | 'discrepancias'
  | 'ubicacion'
  | 'problema'
  | 'otro';

export interface HelpTopic {
  id: string;
  titulo: string;
}

export interface Faq {
  id: string;
  tema: string;
  rol: HelpRole;
  motivo: HelpMotivo;
  pregunta: string;
  respuesta: string;
  guia?: string;
  validar?: boolean;
}

export interface Guide {
  slug: string;
  rol: HelpAudience;
  titulo: string;
  pantalla: string;
  minutos: number;
  /** Motivo de contacto que se precarga si la guía no sirvió. */
  motivo: HelpMotivo;
  pasos: string[];
  consejo?: string;
  validar?: boolean;
}

export interface Stage {
  id: string;
  titulo: string;
  estados: GarmentStatus[];
  cedente: string;
  comercio: string;
  guias: string[];
}

export const MOTIVOS: readonly { value: HelpMotivo; label: string }[] = [
  { value: 'cuenta', label: 'Registro y cuenta' },
  { value: 'recepcion', label: 'Recepción de prendas' },
  { value: 'plazos', label: 'Plazos y período de gracia' },
  { value: 'precios', label: 'Precios y comisión' },
  { value: 'liquidaciones', label: 'Liquidaciones y pagos' },
  { value: 'no-vendidas', label: 'Prendas no vendidas y devolución' },
  { value: 'discrepancias', label: 'Discrepancias en la recepción' },
  { value: 'ubicacion', label: 'Ubicación y comercios cercanos' },
  { value: 'problema', label: 'Algo no funciona' },
  { value: 'otro', label: 'Otro' },
];

export const ROLE_LABEL: Record<HelpAudience, string> = {
  cedente: 'Cedente',
  comercio: 'Comercio',
};

export const RECORRIDO = {
  titulo: "Cómo funciona Trama",
  bajada: "El recorrido de una prenda, de la propuesta a la liquidación. En cada etapa, qué hace el cedente y qué hace el comercio.",
};

export const ALL_STAGES: readonly Stage[] = [
  {
    "id": "propuesta",
    "titulo": "Propuesta",
    "estados": [
      "submitted",
      "under_review"
    ],
    "cedente": "Cargás la prenda con fotos, descripción, estado y el precio que querés recibir. Elegís a qué comercio proponerla.",
    "comercio": "Recibís la propuesta en Propuestas. Ves las fotos, el precio pedido y el precio de venta calculado con tu comisión.",
    "guias": [
      "cargar-prenda",
      "revisar-propuesta"
    ]
  },
  {
    "id": "acuerdo",
    "titulo": "Acuerdo",
    "estados": [
      "counteroffer",
      "agreed",
      "no_agreement"
    ],
    "cedente": "Si el comercio envía una contraoferta, la aceptás o la rechazás. Si no hay acuerdo, la prenda queda cerrada.",
    "comercio": "Aceptás, enviás una contraoferta o rechazás. Con el acuerdo, los precios quedan congelados y empieza a correr el plazo de venta.",
    "guias": [
      "responder-contraoferta",
      "revisar-propuesta"
    ]
  },
  {
    "id": "recepcion",
    "titulo": "Recepción",
    "estados": [
      "agreed",
      "in_stock",
      "with_remarks",
      "rejected"
    ],
    "cedente": "Llevás la prenda al punto de venta en los días y el horario de recepción, siguiendo sus instrucciones.",
    "comercio": "Revisás la prenda contra lo publicado y registrás la recepción: conforme, con observaciones o rechazada.",
    "guias": [
      "llevar-prenda",
      "recepcion-observada",
      "registrar-recepcion"
    ]
  },
  {
    "id": "venta",
    "titulo": "En venta",
    "estados": [
      "in_stock",
      "with_remarks",
      "sold"
    ],
    "cedente": "Seguís el estado de la prenda desde tu panel. Te llega una notificación cuando se vende.",
    "comercio": "La prenda está en tu inventario. Cuando se vende, registrás la venta con el precio final.",
    "guias": [
      "registrar-venta"
    ]
  },
  {
    "id": "liquidacion",
    "titulo": "Liquidación",
    "estados": [
      "sold",
      "paid_out"
    ],
    "cedente": "Las ventas del mes se agrupan en una liquidación. La ves como pendiente, vencida o pagada en Liquidaciones.",
    "comercio": "Pagás la liquidación de cada cedente antes del día de pago y la registrás con medio y comprobante.",
    "guias": [
      "consultar-liquidaciones",
      "registrar-pago"
    ]
  }
];

export const ALL_TOPICS: readonly HelpTopic[] = [
  {
    "id": "cuenta",
    "titulo": "Registro y cuenta"
  },
  {
    "id": "recepcion",
    "titulo": "Recepción de prendas"
  },
  {
    "id": "plazos",
    "titulo": "Plazos y período de gracia"
  },
  {
    "id": "precios",
    "titulo": "Precios y comisión"
  },
  {
    "id": "liquidaciones",
    "titulo": "Liquidaciones y pagos"
  },
  {
    "id": "no-vendidas",
    "titulo": "Prendas no vendidas y devolución"
  },
  {
    "id": "discrepancias",
    "titulo": "Discrepancias en la recepción"
  },
  {
    "id": "ubicacion",
    "titulo": "Ubicación y comercios cercanos"
  }
];

export const ALL_FAQS: readonly Faq[] = [
  {
    "id": "que-es-trama",
    "tema": "cuenta",
    "rol": "comun",
    "motivo": "cuenta",
    "pregunta": "¿Qué es Trama?",
    "respuesta": "Una plataforma que conecta a personas con ropa en desuso (cedentes) con comercios que la venden en consignación. Trama registra la propuesta, el acuerdo, la recepción, la venta y la liquidación de cada prenda."
  },
  {
    "id": "dos-roles",
    "tema": "cuenta",
    "rol": "comun",
    "motivo": "cuenta",
    "pregunta": "¿Puedo ser cedente y comercio con el mismo email?",
    "respuesta": "No. Cada email corresponde a una cuenta y cada cuenta a un rol. Si necesitás los dos, registrate con dos emails distintos."
  },
  {
    "id": "codigo-verificacion",
    "tema": "cuenta",
    "rol": "comun",
    "motivo": "cuenta",
    "pregunta": "No me llegó el código de verificación",
    "respuesta": "Revisá spam y promociones. El código tiene 6 dígitos y podés pedir otro cuando termina el contador de reenvío. Si sigue sin llegar, revisá que el email esté bien escrito."
  },
  {
    "id": "datos-cedente",
    "tema": "cuenta",
    "rol": "cedente",
    "motivo": "cuenta",
    "pregunta": "¿Qué datos necesito para registrarme como cedente?",
    "respuesta": "Nombre, apellido, DNI, teléfono, email, tus datos bancarios para cobrar y tu ubicación en el mapa."
  },
  {
    "id": "datos-comercio",
    "tema": "cuenta",
    "rol": "comercio",
    "motivo": "cuenta",
    "pregunta": "¿Qué datos necesito para registrar mi comercio?",
    "respuesta": "Razón social, CUIT, logo, el primer punto de venta con su ubicación, días y horario de recepción, instrucciones para el cedente, la comisión y los plazos (ventana de venta, período de gracia y día de pago)."
  },
  {
    "id": "cambiar-datos-bancarios",
    "tema": "cuenta",
    "rol": "cedente",
    "motivo": "cuenta",
    "validar": true,
    "pregunta": "¿Cómo cambio mis datos bancarios?",
    "respuesta": "Desde tu perfil. Los cambios aplican a las liquidaciones que todavía no se pagaron."
  },
  {
    "id": "cuando-llevar",
    "tema": "recepcion",
    "rol": "cedente",
    "motivo": "recepcion",
    "pregunta": "¿Cuándo y dónde llevo la prenda?",
    "respuesta": "Después del acuerdo. En la prenda ves el punto de venta, los días y la franja horaria de recepción y las instrucciones del comercio.",
    "guia": "llevar-prenda"
  },
  {
    "id": "como-preparar",
    "tema": "recepcion",
    "rol": "cedente",
    "motivo": "recepcion",
    "pregunta": "¿Cómo tengo que llevar la prenda?",
    "respuesta": "Limpia, con etiquetas y accesorios si los tenía, y en el estado que declaraste en la propuesta."
  },
  {
    "id": "comprobante-recepcion",
    "tema": "recepcion",
    "rol": "comun",
    "motivo": "recepcion",
    "pregunta": "¿Queda constancia de la entrega?",
    "respuesta": "Sí. Cada recepción genera un número de comprobante, la fecha, el punto de venta y quién la registró. Lo ven ambas partes en el detalle de la prenda."
  },
  {
    "id": "recepcion-resultados",
    "tema": "recepcion",
    "rol": "comercio",
    "motivo": "recepcion",
    "pregunta": "¿Qué resultados puedo registrar al recibir una prenda?",
    "respuesta": "Conforme (pasa a stock), con observaciones (pasa a stock con las diferencias registradas) o rechazada (el cedente puede volver a entregarla).",
    "guia": "registrar-recepcion"
  },
  {
    "id": "ventana-venta",
    "tema": "plazos",
    "rol": "comun",
    "motivo": "plazos",
    "pregunta": "¿Cuánto tiempo está la prenda a la venta?",
    "respuesta": "Lo define cada comercio como ventana de venta, en meses. Empieza a correr con el acuerdo. La fecha límite figura en el detalle de la prenda."
  },
  {
    "id": "periodo-gracia",
    "tema": "plazos",
    "rol": "comun",
    "motivo": "plazos",
    "validar": true,
    "pregunta": "¿Qué es el período de gracia?",
    "respuesta": "Un plazo adicional, definido por el comercio, que corre después de la ventana de venta. Durante ese tiempo la prenda puede seguir a la venta o el cedente puede retirarla."
  },
  {
    "id": "aviso-vencimiento",
    "tema": "plazos",
    "rol": "comun",
    "motivo": "plazos",
    "validar": true,
    "pregunta": "¿Me avisan antes de que venza el plazo?",
    "respuesta": "Sí, con una notificación. El comercio además ve los plazos por vencer en su panel."
  },
  {
    "id": "cambio-plazos",
    "tema": "plazos",
    "rol": "comercio",
    "motivo": "plazos",
    "validar": true,
    "pregunta": "Si cambio mis plazos, ¿afecta a las prendas que ya tengo?",
    "respuesta": "No. Las prendas acordadas mantienen la fecha límite que tenían al momento del acuerdo.",
    "guia": "comision-y-plazos"
  },
  {
    "id": "como-precio",
    "tema": "precios",
    "rol": "comun",
    "motivo": "precios",
    "pregunta": "¿Cómo se calcula el precio de venta?",
    "respuesta": "El cedente indica cuánto quiere recibir. El precio de venta sale de dividir ese monto por el porcentaje del cedente que fijó el comercio. Ejemplo: si querés recibir $6.000 y tu porcentaje es 60%, la prenda se vende a $10.000.",
    "guia": "cargar-prenda"
  },
  {
    "id": "precio-congelado",
    "tema": "precios",
    "rol": "comun",
    "motivo": "precios",
    "pregunta": "¿El precio puede cambiar después del acuerdo?",
    "respuesta": "Los precios acordados quedan congelados. Si la prenda se vende a otro precio final, el cedente cobra su porcentaje sobre el precio real de venta."
  },
  {
    "id": "contraoferta",
    "tema": "precios",
    "rol": "comun",
    "motivo": "precios",
    "pregunta": "¿Qué es una contraoferta?",
    "respuesta": "Una propuesta de precio distinta que el comercio envía al revisar la prenda. El cedente la acepta (se cierra el acuerdo) o la rechaza (no hay acuerdo).",
    "guia": "responder-contraoferta"
  },
  {
    "id": "costo-uso",
    "tema": "precios",
    "rol": "comun",
    "motivo": "precios",
    "validar": true,
    "pregunta": "¿Usar Trama tiene costo?",
    "respuesta": "Para cedentes, no. Para comercios, hoy tampoco. Si eso cambia, se avisa con anticipación."
  },
  {
    "id": "cuando-cobro",
    "tema": "liquidaciones",
    "rol": "cedente",
    "motivo": "liquidaciones",
    "pregunta": "¿Cuándo cobro?",
    "respuesta": "Las ventas de cada mes se agrupan en una liquidación que el comercio paga el día de pago que definió. Ves la fecha en Liquidaciones.",
    "guia": "consultar-liquidaciones"
  },
  {
    "id": "como-cobro",
    "tema": "liquidaciones",
    "rol": "cedente",
    "motivo": "liquidaciones",
    "pregunta": "¿Cómo me pagan?",
    "respuesta": "El comercio te transfiere a los datos bancarios de tu cuenta y registra el pago en Trama con medio y número de comprobante."
  },
  {
    "id": "liquidacion-vencida",
    "tema": "liquidaciones",
    "rol": "cedente",
    "motivo": "liquidaciones",
    "pregunta": "Mi liquidación figura vencida, ¿qué hago?",
    "respuesta": "Vencida significa que pasó el día de pago sin que el comercio la registrara. Contactá al comercio. Si no se resuelve, abrí una consulta desde Contacto indicando el mes."
  },
  {
    "id": "pago-trama",
    "tema": "liquidaciones",
    "rol": "comercio",
    "motivo": "liquidaciones",
    "pregunta": "¿El pago pasa por Trama?",
    "respuesta": "No. Trama calcula cuánto le corresponde a cada cedente y registra el pago, pero la transferencia la hacés por fuera de la plataforma.",
    "guia": "registrar-pago"
  },
  {
    "id": "pago-parcial",
    "tema": "liquidaciones",
    "rol": "comercio",
    "motivo": "liquidaciones",
    "pregunta": "¿Puedo pagar una liquidación en partes?",
    "respuesta": "Sí. La liquidación muestra lo pagado y lo pendiente, prenda por prenda, hasta completarla."
  },
  {
    "id": "no-se-vende",
    "tema": "no-vendidas",
    "rol": "comun",
    "motivo": "no-vendidas",
    "validar": true,
    "pregunta": "¿Qué pasa si la prenda no se vende?",
    "respuesta": "Al terminar la ventana de venta y el período de gracia, el cedente retira la prenda en el punto de venta. [Definir: qué ocurre si no la retira.]"
  },
  {
    "id": "retirar-antes",
    "tema": "no-vendidas",
    "rol": "cedente",
    "motivo": "no-vendidas",
    "validar": true,
    "pregunta": "¿Puedo retirar la prenda antes de que venza el plazo?",
    "respuesta": "Coordinalo con el comercio. [Definir: hoy la plataforma no tiene un estado de retiro.]"
  },
  {
    "id": "cancelar",
    "tema": "no-vendidas",
    "rol": "cedente",
    "motivo": "no-vendidas",
    "pregunta": "¿Puedo cancelar una propuesta?",
    "respuesta": "Sí, mientras esté en revisión, en contraoferta o acordada y todavía no se haya recibido.",
    "guia": "editar-cancelar-prenda"
  },
  {
    "id": "que-es-observacion",
    "tema": "discrepancias",
    "rol": "comun",
    "motivo": "discrepancias",
    "pregunta": "¿Qué es una recepción con observaciones?",
    "respuesta": "El comercio recibió la prenda pero encontró diferencias con lo publicado: condición inferior, daños no declarados, no coincide con las fotos, medidas distintas, faltan accesorios o etiquetas, o sin higienizar. La prenda igual queda a la venta.",
    "guia": "recepcion-observada"
  },
  {
    "id": "evidencia",
    "tema": "discrepancias",
    "rol": "cedente",
    "motivo": "discrepancias",
    "pregunta": "¿Cómo sé qué observó el comercio?",
    "respuesta": "En el detalle de la prenda ves los motivos marcados, el comentario y las fotos de evidencia."
  },
  {
    "id": "rechazo",
    "tema": "discrepancias",
    "rol": "cedente",
    "motivo": "discrepancias",
    "pregunta": "Me rechazaron la prenda, ¿puedo volver a llevarla?",
    "respuesta": "Sí. Resolvé el motivo del rechazo y volvé a entregarla. La prenda vuelve a estado Acordada.",
    "guia": "recepcion-observada"
  },
  {
    "id": "no-acuerdo-observacion",
    "tema": "discrepancias",
    "rol": "cedente",
    "motivo": "discrepancias",
    "pregunta": "No estoy de acuerdo con la observación",
    "respuesta": "Hablalo primero con el comercio. Si no se resuelve, abrí una consulta desde Contacto con el código de la prenda."
  },
  {
    "id": "tasa-observaciones",
    "tema": "discrepancias",
    "rol": "comercio",
    "motivo": "discrepancias",
    "pregunta": "¿Dónde veo cuántas recepciones tuvieron observaciones?",
    "respuesta": "En Reportes, en la pregunta ¿Cuántas recepciones tuvieron observaciones?, con la tasa y el desglose por tipo."
  },
  {
    "id": "por-que-ubicacion",
    "tema": "ubicacion",
    "rol": "comun",
    "motivo": "ubicacion",
    "pregunta": "¿Por qué me piden la ubicación?",
    "respuesta": "Para sugerirle a cada cedente los comercios más cercanos. Por eso es obligatoria en los dos registros."
  },
  {
    "id": "quien-ve-ubicacion",
    "tema": "ubicacion",
    "rol": "cedente",
    "motivo": "ubicacion",
    "validar": true,
    "pregunta": "¿Quién ve mi ubicación?",
    "respuesta": "Nadie ve tu ubicación exacta. Se usa solo para calcular distancias a los comercios."
  },
  {
    "id": "no-aparezco",
    "tema": "ubicacion",
    "rol": "comercio",
    "motivo": "ubicacion",
    "pregunta": "¿Cómo aparezco como sugerencia para cedentes cercanos?",
    "respuesta": "Con la ubicación de tus puntos de venta bien marcada en el mapa. Revisala en Puntos de venta.",
    "guia": "puntos-de-venta"
  }
];

export const ALL_GUIDES: readonly Guide[] = [
  {
    "slug": "cargar-prenda",
    "rol": "cedente",
    "titulo": "Cargar una prenda",
    "pantalla": "/c/upload",
    "minutos": 3,
    "motivo": "precios",
    "pasos": [
      "Desde tu panel, tocá Cargar prenda.",
      "Subí fotos claras de frente, espalda, etiqueta y cualquier detalle o desgaste.",
      "Completá categoría, marca, talle, color, temporada y estado (Nuevo, Muy bueno, Bueno o Regular).",
      "Indicá el precio que querés recibir. Vas a ver el precio de venta estimado según la comisión del comercio.",
      "Elegí el comercio. Te sugerimos los más cercanos a tu ubicación.",
      "Enviá la propuesta. La prenda pasa a En revisión."
    ],
    "consejo": "Declarar cualquier detalle en las fotos y la descripción evita observaciones en la recepción."
  },
  {
    "slug": "responder-contraoferta",
    "rol": "cedente",
    "titulo": "Responder una contraoferta",
    "pantalla": "/c/garment/:id",
    "minutos": 1,
    "motivo": "precios",
    "pasos": [
      "Te llega una notificación cuando el comercio propone otro precio.",
      "Abrí la prenda. Vas a ver tu precio pedido y el que propone el comercio.",
      "Aceptá para cerrar el acuerdo o rechazá para terminar la propuesta."
    ]
  },
  {
    "slug": "llevar-prenda",
    "rol": "cedente",
    "titulo": "Llevar la prenda al comercio",
    "pantalla": "/c/garment/:id",
    "minutos": 2,
    "motivo": "recepcion",
    "pasos": [
      "Con el acuerdo cerrado, abrí la prenda y mirá los datos del punto de venta.",
      "Revisá días y franja horaria de recepción y las instrucciones del comercio.",
      "Llevá la prenda limpia, con sus etiquetas y accesorios.",
      "El comercio registra la recepción y te llega el resultado con su número de comprobante."
    ]
  },
  {
    "slug": "recepcion-observada",
    "rol": "cedente",
    "titulo": "Si la recepción tuvo observaciones o fue rechazada",
    "pantalla": "/c/garment/:id",
    "minutos": 2,
    "motivo": "discrepancias",
    "pasos": [
      "Abrí la prenda para ver el detalle: motivo, comentario y fotos de evidencia del comercio.",
      "Con observaciones: la prenda igual queda en venta con esas observaciones registradas.",
      "Rechazada: podés volver a entregarla una vez resuelto el motivo. La prenda vuelve a Acordada.",
      "Si no estás de acuerdo con el motivo, abrí una consulta desde Contacto."
    ]
  },
  {
    "slug": "consultar-liquidaciones",
    "rol": "cedente",
    "titulo": "Consultar tus liquidaciones",
    "pantalla": "/c/payouts",
    "minutos": 1,
    "motivo": "liquidaciones",
    "pasos": [
      "Entrá a Liquidaciones.",
      "Cada mes agrupa las prendas vendidas, con el monto que te corresponde por cada una.",
      "El estado indica si está pendiente, vencida o pagada. Cuando está pagada ves fecha, medio y comprobante."
    ]
  },
  {
    "slug": "editar-cancelar-prenda",
    "rol": "cedente",
    "titulo": "Editar o cancelar una prenda",
    "pantalla": "/c/garment/:id/edit",
    "minutos": 1,
    "motivo": "no-vendidas",
    "pasos": [
      "Abrí la prenda y tocá Editar para corregir datos o fotos.",
      "Podés cancelar mientras la propuesta está en revisión, en contraoferta o acordada y todavía no se recibió.",
      "Una vez recibida por el comercio, ya no se puede cancelar desde la plataforma."
    ],
    "validar": true
  },
  {
    "slug": "revisar-propuesta",
    "rol": "comercio",
    "titulo": "Revisar una propuesta",
    "pantalla": "/m/proposal/:id",
    "minutos": 2,
    "motivo": "precios",
    "pasos": [
      "En Propuestas, abrí la que quieras revisar.",
      "Mirá fotos, estado declarado, precio pedido por el cedente y precio de venta calculado.",
      "Aceptá, enviá una contraoferta con otro precio o rechazá.",
      "Al aceptar, los precios quedan congelados y empieza a correr tu ventana de venta."
    ]
  },
  {
    "slug": "registrar-recepcion",
    "rol": "comercio",
    "titulo": "Registrar la recepción de una prenda",
    "pantalla": "/m/garment/:id/reception",
    "minutos": 3,
    "motivo": "recepcion",
    "pasos": [
      "Cuando el cedente llega, buscá la prenda acordada y abrí Registrar recepción.",
      "Compará la prenda con las fotos y la descripción.",
      "Elegí el resultado: conforme, con observaciones o rechazada.",
      "Si hay diferencias, marcá el tipo (condición inferior, daños no declarados, no coincide con fotos, medidas distintas, faltan accesorios o etiquetas, sin higienizar), agregá un comentario y fotos.",
      "Confirmá. Se genera un número de comprobante y el cedente recibe el resultado."
    ]
  },
  {
    "slug": "registrar-venta",
    "rol": "comercio",
    "titulo": "Registrar una venta",
    "pantalla": "/m/garment/:id/sale",
    "minutos": 1,
    "motivo": "liquidaciones",
    "pasos": [
      "Abrí la prenda desde Inventario.",
      "Tocá Registrar venta e ingresá el precio final.",
      "El monto del cedente se calcula solo con el porcentaje acordado y se suma a su liquidación del mes."
    ]
  },
  {
    "slug": "registrar-pago",
    "rol": "comercio",
    "titulo": "Registrar el pago de una liquidación",
    "pantalla": "/m/payouts",
    "minutos": 2,
    "motivo": "liquidaciones",
    "pasos": [
      "En Liquidaciones, filtrá por pendientes o vencidas.",
      "Abrí la del cedente. Ves sus datos bancarios y el detalle de prendas.",
      "Hacé la transferencia por fuera de Trama.",
      "Tocá Registrar pago, indicá medio y número de comprobante. La liquidación pasa a Pagada."
    ]
  },
  {
    "slug": "puntos-de-venta",
    "rol": "comercio",
    "titulo": "Gestionar puntos de venta y horarios de recepción",
    "pantalla": "/m/sales-points",
    "minutos": 2,
    "motivo": "ubicacion",
    "pasos": [
      "En Puntos de venta, agregá o editá uno.",
      "Marcá la ubicación en el mapa: es lo que permite sugerirte a cedentes cercanos.",
      "Definí días, franja horaria e instrucciones de recepción. Los cedentes las ven al llevar la prenda."
    ]
  },
  {
    "slug": "comision-y-plazos",
    "rol": "comercio",
    "titulo": "Configurar comisión y plazos",
    "pantalla": "/m/settings",
    "minutos": 2,
    "motivo": "plazos",
    "pasos": [
      "En Configuración, definí el porcentaje para el cedente y para el comercio.",
      "Definí la ventana de venta, el período de gracia y el día de pago mensual.",
      "Los cambios aplican a acuerdos nuevos. Los acuerdos ya cerrados mantienen sus condiciones."
    ],
    "validar": true
  },
  {
    "slug": "leer-dashboard",
    "rol": "comercio",
    "titulo": "Leer tu panel y tus reportes",
    "pantalla": "/m",
    "minutos": 3,
    "motivo": "otro",
    "pasos": [
      "Arriba están las urgencias: liquidaciones vencidas, stock estancado y plazos por vencer. Cada fila tiene su acción.",
      "Para vigilar muestra lo que todavía no es urgente. Cada fila abre el reporte que lo explica, ya filtrado.",
      "En Reportes elegís una pregunta (por ejemplo, ¿Qué stock no rota?) y entrás hasta las prendas detrás del número.",
      "Los colores siguen un semáforo: rojo vencido, ámbar por vencer, verde al día, gris informativo."
    ]
  }
];

/** Preguntas destacadas en el bloque "¿Dudas?" de la landing. */
export const FEATURED_FAQ_IDS = ['que-es-trama', 'como-precio', 'cuando-cobro', 'que-es-observacion'];

/**
 * Criterio de aceptación 9: nada con `validar: true` ni "[Definir: …]" se publica sin revisión.
 * Al confirmar una regla, se corrige el texto y se quita `validar` del ítem.
 */
export function isPublishable(item: { validar?: boolean } & Record<string, unknown>): boolean {
  if (item.validar) return false;
  return !JSON.stringify(item).includes('[Definir');
}

export const GUIDES: readonly Guide[] = ALL_GUIDES.filter((g) => isPublishable({ ...g }));
const publishedSlugs = new Set(GUIDES.map((g) => g.slug));

export const FAQS: readonly Faq[] = ALL_FAQS.filter((f) => isPublishable({ ...f })).map((f) =>
  f.guia && !publishedSlugs.has(f.guia) ? { ...f, guia: undefined } : f,
);

export const STAGES: readonly Stage[] = ALL_STAGES.map((s) => ({
  ...s,
  guias: s.guias.filter((g) => publishedSlugs.has(g)),
}));

export const TOPICS: readonly HelpTopic[] = ALL_TOPICS;

export function matchesRole(rol: HelpRole, filter: HelpRoleFilter): boolean {
  return filter === 'todos' || rol === 'comun' || rol === filter;
}

export function findGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function findFaq(id: string): Faq | undefined {
  return FAQS.find((f) => f.id === id);
}

export function topicTitle(id: string): string {
  return TOPICS.find((t) => t.id === id)?.titulo ?? id;
}

export function motivoLabel(value: string): string {
  return MOTIVOS.find((m) => m.value === value)?.label ?? value;
}

export function isMotivo(value: string | null | undefined): value is HelpMotivo {
  return !!value && MOTIVOS.some((m) => m.value === value);
}
