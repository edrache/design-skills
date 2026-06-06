const MINI_CARD_AGENTS = [
  {
    id: "pulse",
    label: "Agent Impulsu",
    stageLabel: "Pierwsze pekniecie",
    summary: "Lapie moment, w ktorym decyzja zostawia pierwszy slad na ludziach przy stole.",
    emotionalCue: "Widzisz po twarzach, ze to nie byla drobnostka.",
  },
  {
    id: "spotlight",
    label: "Agent Stolu",
    stageLabel: "Spojrzenia przy stole",
    summary: "Patrzy, kto czuje ulge, kto wstyd, a kto zapamieta ten moment na dluzej.",
    emotionalCue: "Przy stole robi sie ciszej, bo kazdy czyta te decyzje inaczej.",
  },
  {
    id: "aftershock",
    label: "Agent Następstw",
    stageLabel: "To zostaje",
    summary: "Domyka to, co po decyzji zostaje w relacjach, rytmie i twojej glowie.",
    emotionalCue: "Najgorsze jest to, ze po scenie cos jeszcze z tego zostaje.",
  },
];

function rebalanceMiniEffects(effects) {
  const next = { ...effects };
  const samePositive = next.sanity > 0 && next.engagement > 0;
  const sameNegative = next.sanity < 0 && next.engagement < 0;

  if (samePositive) {
    if (Math.abs(next.sanity) <= Math.abs(next.engagement)) {
      next.sanity = -Math.max(1, Math.floor(Math.abs(next.sanity) / 2));
    } else {
      next.engagement = -Math.max(1, Math.floor(Math.abs(next.engagement) / 2));
    }
  }

  if (sameNegative) {
    if (Math.abs(next.sanity) <= Math.abs(next.engagement)) {
      next.sanity = Math.max(1, Math.floor(Math.abs(next.sanity) / 2));
    } else {
      next.engagement = Math.max(1, Math.floor(Math.abs(next.engagement) / 2));
    }
  }

  return next;
}

function scaleEffects(effects, factor) {
  return {
    sanity: effects.sanity * factor,
    engagement: effects.engagement * factor,
  };
}

function intensifyFeedback(text, stepIndex) {
  const suffixes = [
    " Czujesz, ze cos w stole lekko peklo.",
    " Niby gracie dalej, ale wszyscy juz cos z tego zapamietali.",
    " To nie konczy sprawy, tylko przenosi jej koszt dalej.",
  ];
  return `${text}${suffixes[stepIndex] || ""}`;
}

function normalizeMiniStep(parentCard, branchKey, stepData, stepIndex) {
  const agent = MINI_CARD_AGENTS[stepIndex];
  if (!agent) {
    throw new Error(`Brak agenta mini-karty dla kroku ${stepIndex + 1}.`);
  }

  if (!Array.isArray(stepData) || stepData.length !== 7) {
    throw new Error(`Mini-karta ${parentCard.id}/${branchKey}/${stepIndex + 1} ma niepoprawny format.`);
  }

  const [
    situation,
    leftLabel,
    rightLabel,
    leftFeedback,
    rightFeedback,
    leftEffects,
    rightEffects,
  ] = stepData;

  return {
    id: `${parentCard.id}-${branchKey}-mini-${stepIndex + 1}`,
    illustration: parentCard.illustration,
    situation,
    left_label: leftLabel,
    right_label: rightLabel,
    left_feedback: intensifyFeedback(leftFeedback, stepIndex),
    right_feedback: intensifyFeedback(rightFeedback, stepIndex),
    left_effects: scaleEffects(rebalanceMiniEffects(leftEffects), 2),
    right_effects: scaleEffects(rebalanceMiniEffects(rightEffects), 2),
    isMini: true,
    parentId: parentCard.id,
    parentSituation: parentCard.situation,
    branchKey,
    miniStep: stepIndex + 1,
    miniTotal: MINI_CARD_AGENTS.length,
    agentId: agent.id,
    agentLabel: agent.label,
    stageLabel: agent.stageLabel,
    agentSummary: agent.summary,
    emotionalCue: agent.emotionalCue,
  };
}

function buildMiniCardsForCard(parentCard, branchData) {
  const leftBranch = branchData?.left || [];
  const rightBranch = branchData?.right || [];

  if (leftBranch.length !== MINI_CARD_AGENTS.length || rightBranch.length !== MINI_CARD_AGENTS.length) {
    throw new Error(`Karta ${parentCard.id} musi miec dokladnie ${MINI_CARD_AGENTS.length} mini-karty na lewo i prawo.`);
  }

  return {
    left: leftBranch.map((stepData, index) => normalizeMiniStep(parentCard, "left", stepData, index)),
    right: rightBranch.map((stepData, index) => normalizeMiniStep(parentCard, "right", stepData, index)),
  };
}

window.MARSZ_MINI_CARD_SYSTEM = {
  agents: MINI_CARD_AGENTS,
  buildMiniCardsForCard,
};
