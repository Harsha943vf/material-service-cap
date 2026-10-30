// Central shipment state machine.
// All status rules live here instead of in the handlers.

export const Status = Object.freeze({
    Open: 'Open',
    Exception: 'Exception',
    Closed: 'Closed'
});

// action → allowed source states + target state (null = status unchanged)
const TRANSITIONS = {
    assignCarrier:    { from: [Status.Open, Status.Exception], to: null },
    reportException:  { from: [Status.Open, Status.Exception], to: Status.Exception },
    resolveException: { from: [Status.Exception],              to: Status.Open },
    closeShipment:    { from: [Status.Open, Status.Exception], to: Status.Closed }
};

// Error messages kept identical to E1 so existing tests still pass
function blockedMessage(action, current) {
    if (current === Status.Closed) {
        return action === 'closeShipment'
            ? 'Shipment is already closed'
            : 'Closed shipments cannot be modified';
    }
    if (action === 'resolveException') {
        return 'Only shipments in Exception status can be resolved';
    }
    return `Action ${action} is not allowed in status ${current}`;
}

// Returns { allowed, to, message }
export function checkTransition(action, current) {
    const rule = TRANSITIONS[action];

    if (!rule) {
        return { allowed: false, message: `Unknown action ${action}` };
    }

    if (!rule.from.includes(current)) {
        return { allowed: false, message: blockedMessage(action, current) };
    }

    return { allowed: true, to: rule.to ?? current };
}