/**
 * Static rulebook reference content — transcribed from Fabula_Ultima_Guide.pdf
 * so the sheet is usable without the rulebook open next to it.
 */

// "ACTIONS" (p.66-74) — one action per turn during a conflict, condensed.
export interface FUActionRef {
  name: string;
  description: string;
}

export const actions: FUActionRef[] = [
  {
    name: "Ataque",
    description: "Realizá un ataque cuerpo a cuerpo o a distancia con un arma equipada.",
  },
  {
    name: "Equipo",
    description: "Intercambiá cualquier cantidad de objetos equipados por otros de tu mochila (no aplica a armaduras).",
  },
  {
    name: "Guardia",
    description:
      "Una vez por turno: ganás Resistencia a todos los tipos de daño, +2 a Chequeos Opuestos, y podés " +
      "cubrir a otra criatura, evitando que la ataquen cuerpo a cuerpo hasta tu próximo turno.",
  },
  {
    name: "Obstaculizar",
    description: "Hacé un Chequeo (DL 10) contra un oponente; si tenés éxito, le infligís un estado alterado a elección.",
  },
  {
    name: "Inventario",
    description: "Gastá Puntos de Inventario para producir y usar de inmediato un objeto consumible.",
  },
  {
    name: "Hechizo",
    description: "Lanzá un hechizo aprendido de tu subsistema de magia.",
  },
  {
    name: "Objetivo",
    description:
      "Perseguí una meta del conflicto, normalmente con un Chequeo de Atributo o un Chequeo Opuesto; " +
      "los objetivos complejos suelen usar un Reloj.",
  },
  {
    name: "Estudiar",
    description: "Intentá obtener información sobre alguien o algo, generalmente con un Chequeo Abierto de 【INS + INS】.",
  },
  {
    name: "Habilidad",
    description: "Algunas Habilidades requieren gastar una acción para usarse.",
  },
];

// "FABULA POINTS" (p.96) — gaining and spending.
export const fabulaPointGains: string[] = [
  "Si no tenés Puntos de Fábula al inicio de una sesión, recibís 1 de inmediato.",
  "Cada vez que sacás una Pifia en un Chequeo, recibís 1 de inmediato.",
  "Cada vez que un Villano hace su entrada en una escena, todos los Personajes Jugadores reciben 1.",
  "Si caés a 0 Puntos de Vida y elegís Rendirte, recibís 2 de inmediato.",
  "(Regla opcional) Invocar un Vínculo o Rasgo para fallar automáticamente un Chequeo te da 1.",
];

export const fabulaPointUses: string[] = [
  "Alterar la historia — sumar la fuerza de un Vínculo a un Chequeo, o modificar/agregar un elemento de la narración.",
  "Invocar un Rasgo o Vínculo para volver a tirar uno o ambos dados de un Chequeo recién realizado.",
  "Algunas Habilidades poderosas requieren gastar Puntos de Fábula para activarse.",
];

export const fabulaPointsNote =
  "Cada personaje empieza con 3 Puntos de Fábula. No hay límite máximo, pero gastarlos (en vez de " +
  "acumularlos) es una de las formas principales en que tu grupo gana Puntos de Experiencia y sube de nivel.";

// "OPPORTUNITIES" (p.41) — the effect a Critical Success grants, chosen by
// whoever earned it (the attacker/caster on their own Check, or the
// opposition on a Fumble).
export const opportunities: { term: string; effect: string }[] = [
  { term: "Ventaja", effect: "El siguiente Chequeo tuyo o de un aliado recibe +4." },
  { term: "Aflicción", effect: "Una criatura sufre un estado alterado a elección (de los ligados a un Atributo)." },
  { term: "Vínculo", effect: "Creás un Vínculo con alguien, o le agregás una emoción a uno existente." },
  { term: "Metida de pata", effect: "Una criatura presente hace una declaración comprometedora." },
  { term: "Favor", effect: "Tus acciones ganan el apoyo o la admiración de alguien." },
  { term: "Información", effect: "Detectás una pista o un detalle útil." },
  { term: "Objeto perdido", effect: "Un objeto se destruye, pierde, roba o queda atrás." },
  { term: "Progreso", effect: "Podés rellenar o borrar hasta dos secciones de un Reloj." },
  { term: "Giro argumental", effect: "Alguien o algo aparece de repente en la escena." },
  { term: "Explorar", effect: "Descubrís una Vulnerabilidad o un Rasgo de una criatura visible." },
  { term: "Desenmascarar", effect: "Aprendés los objetivos y motivaciones de una criatura." },
];

export const criticalFumbleNote =
  "Éxito crítico: ambos dados muestran el mismo número, y ese número es 6 o más. Pifia: ambos dados muestran 1.";

// "SERVICES" (p.125) — settlement downtime costs.
export const villageServices: { service: string; cost: string }[] = [
  { service: "Recargar 1 Punto de Inventario", cost: "10z" },
  { service: "Descanso completo — aldea", cost: "5z" },
  { service: "Descanso completo — pueblo", cost: "10z" },
  { service: "Descanso completo — ciudad", cost: "20z" },
  { service: "Transporte terrestre (1 día)", cost: "10z" },
  { service: "Transporte acuático (1 día)", cost: "20z" },
  { service: "Transporte aéreo (1 día)", cost: "40z" },
];

export const villageServicesNote = "El descanso permite pasar la noche; el transporte cubre un día de viaje.";

// "XP AND LEVELING" (p.226-227).
export const xpNote =
  "Al final de cada sesión ganás 5 XP, más 1 XP por cada Punto de Última gastado por los Villanos, más " +
  "los Puntos de Fábula que gastó todo el grupo dividido por la cantidad de PJ que participaron " +
  "(redondeado hacia abajo). Con 10 o más XP, podés gastar 10 para subir 1 nivel — el excedente se acumula.";

// "INVENTORY POINTS" (p.28) — the canonical 5-item catalog now lives in the
// DB (shg_fu_inventory_item, see app/FU/data/loadReferenceData.ts); this
// type stays here since both the loader and its consumers need it.
export interface FUIpItem {
  /** Slug id (e.g. "remedy") — stable even if the display name is translated. */
  id: string;
  name: string;
  ipCost: number;
  effect: string;
}

// "GLOSSARY" — new-player-facing terms referenced constantly elsewhere on
// the sheet but never defined there (per character-sheet-logic-spec.md).
export const glossary: { term: string; definition: string }[] = [
  { term: "HR (High Roll)", definition: "En una Verificación tirás dos dados y sumás sus resultados — el HR es el más alto de los dos por sí solo, usado en muchas fórmulas de daño y efectos." },
  { term: "Crisis", definition: "Cuando tus Puntos de Vida caen a la mitad de tu máximo (redondeado hacia abajo) o menos, entrás en Crisis — algunos efectos y habilidades cambian su comportamiento mientras estás así." },
];
