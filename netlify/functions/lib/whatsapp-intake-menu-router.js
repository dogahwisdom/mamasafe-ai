import {
  formatHubWelcome,
  parseMainMenuChoice,
  staticReplyScheduling,
  staticReplyPayments,
  staticReplyHumanHandoff,
  hubMenuInvalidHint,
} from "./whatsapp-hub-menu.js";

/**
 * Routes active `flow_type === "intake"` sessions: professional hub menu or legacy choose_profile.
 * @param {{
 *  session: Record<string, unknown>;
 *  sanitized: string;
 *  first: string;
 *  facilityName?: string;
 *  isRegisteredPatient: boolean;
 *  parseIntakeChoice: (t: string) => number | null;
 *  transitionIntakeToBranch: (option: number, prior: unknown) => unknown;
 *  preserveHubSession: (prior: unknown) => unknown;
 * }} p
 */
export function routeActiveIntakeMenu(p) {
  const {
    session,
    sanitized,
    first,
    facilityName,
    isRegisteredPatient,
    parseIntakeChoice,
    transitionIntakeToBranch,
    preserveHubSession,
  } = p;

  const step = session.step_key || session.stepKey || "hub_menu";

  if (step === "hub_menu") {
    const pick = parseMainMenuChoice(sanitized);
    if (pick >= 1 && pick <= 3) {
      return transitionIntakeToBranch(pick, session);
    }
    if (pick >= 4 && pick <= 6) {
      const body =
        pick === 4
          ? staticReplyScheduling(facilityName)
          : pick === 5
            ? staticReplyPayments(facilityName)
            : staticReplyHumanHandoff(facilityName);
      return {
        kind: "info",
        responseText: body,
        nextSession: preserveHubSession(session),
      };
    }
    return {
      kind: "invalid",
      responseText:
        hubMenuInvalidHint() +
        formatHubWelcome({
          firstName: first,
          facilityLabel: facilityName,
          isRegistered: isRegisteredPatient,
        }),
      nextSession: session,
    };
  }

  if (step === "choose_profile") {
    const legacy = parseIntakeChoice(sanitized);
    if (!legacy) {
      return {
        kind: "invalid",
        responseText:
          hubMenuInvalidHint() +
          formatHubWelcome({
            firstName: first,
            facilityLabel: facilityName,
            isRegistered: isRegisteredPatient,
          }),
        nextSession: session,
      };
    }
    return transitionIntakeToBranch(legacy, session);
  }

  return {
    kind: "invalid",
    responseText:
      hubMenuInvalidHint() +
      formatHubWelcome({
        firstName: first,
        facilityLabel: facilityName,
        isRegistered: isRegisteredPatient,
      }),
    nextSession: {
      ...session,
      step_key: "hub_menu",
      stepKey: "hub_menu",
    },
  };
}
