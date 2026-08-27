// Progi trudności i dostępność decyzji po rzucie mieszkają razem, bo liczy je
// dwóch klientów: silnik przy zatrzymaniu na rzucie i walidacja zapisu, która
// odtwarza pending z danych. Rozjazd między nimi kasowałby poprawne zapisy.

export function requiredThreshold(target, difficulty = "regular") {
  if (difficulty === "hard") return Math.floor(target / 2);
  if (difficulty === "extreme") return Math.floor(target / 5);
  return target;
}

// Przy sukcesie zostaje samo przyjęcie wyniku i cheat — forsować i dopłacać
// nie ma czego. Przy porażce koszt Szczęścia liczymy od progu wymaganego
// przez difficulty, nie od pełnej umiejętności: przy Hard/Extreme pełna
// wartość dałaby koszt zaniżony albo ujemny. Forsowanego rzutu Szczęściem się
// nie ratuje — zasady 7e dają graczowi jedną deskę ratunku na test, nie dwie.
export function decisionFor(state, check, context) {
  if (check.success) return { canPush: false, canLuck: false, luckCost: 0, canCheat: true };

  const threshold = requiredThreshold(check.target, check.difficulty ?? "regular");
  const luckCost = check.result - threshold;
  const skillRoll = context.kind === "skill";
  const canLuck = skillRoll
    && !context.pushed
    && context.skill !== "Sanity"
    && context.skill !== "Luck"
    && luckCost > 0
    && state.luck >= luckCost;

  return {
    canPush: skillRoll && Boolean(context.pushable) && !context.pushed,
    canLuck,
    luckCost,
    canCheat: true,
  };
}
