import type { QuestType } from "@/types/database";

// Shared copy for the "how does this mission type work" (!) popovers —
// one canonical explanation per type, reused everywhere a mission of that
// type is shown to players.
export const MISSION_TYPE_INFO: Record<QuestType, { title: string; description: string }> = {
  individual: {
    title: "Cómo funcionan: Misiones Individuales",
    description:
      "Activá la misión durante un evento en vivo, jugala, y entregala cuando termines. " +
      "Un Asistente del Gremio confirma tu entrega antes de que recibas la recompensa. " +
      "Solo se puede lograr una vez — si tu entrega es rechazada, podés activarla de nuevo e intentarlo otra vez.",
  },
  group: {
    title: "Cómo funcionan: Misiones de Grupo",
    description:
      "Formá un grupo con otros jugadores, o unite a uno que ya se está formando, durante un evento en vivo. " +
      "Apenas haya al menos 2 integrantes, cualquiera puede iniciar la misión — no hace falta llenar el cupo. " +
      "Al terminar, cualquier integrante puede entregarla en nombre de todo el grupo. Un Asistente del Gremio confirma la entrega " +
      "y todos los integrantes reciben la recompensa juntos. Si el grupo es rechazado, se disuelve y todos pueden formar o unirse a uno nuevo.",
  },
  event: {
    title: "Cómo funcionan: Misiones de Evento",
    description:
      "Es la misión compartida de todo el evento — no hace falta activarla, ya estás asignado por estar presente. " +
      "Cualquiera puede entregarla en cualquier momento mientras el evento esté en vivo. Un Asistente del Gremio aprueba cada entrega, " +
      "y en cuanto se junten suficientes entregas aprobadas, la misión se logra y todos los que entregaron reciben la recompensa juntos. " +
      "Si el evento termina antes de juntar esa cantidad, nadie recibe nada.",
  },
  guild: {
    title: "Cómo funcionan: Misiones de Gremio",
    description:
      "Viven en la página de inicio durante su propia ventana de fechas, sin estar atadas a ningún evento. " +
      "Cualquiera puede entregarla en cualquier momento dentro de esa ventana. Un Asistente del Gremio aprueba cada entrega — " +
      "y a diferencia de las demás misiones, podés volver a entregarla las veces que quieras mientras siga activa, " +
      "ganando la recompensa cada vez que te la aprueben.",
  },
};
