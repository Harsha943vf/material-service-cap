import cds from '@sap/cds';
import { checkTransition } from './lib/shipment-state.js';

export default cds.service.impl(function () {
    const { Shipments, ShipmentExceptions, AuditLog } = cds.entities('shipment.practice');
    const { SELECT, UPDATE, INSERT } = cds.ql;

    // ---------------------------------------------------------
    // HELPERS
    // ---------------------------------------------------------

    // Reads the bound shipment key from the URL: Shipments(101)/...
    function getShipmentID(req) {
        const param = req.params?.[0];
        const value = typeof param === 'object' ? param?.ID : param;
        return Number(value);
    }

    // 400 invalid key, 404 not found, 403 wrong region
    async function loadShipment(req) {
        const shipmentID = getShipmentID(req);

        if (!Number.isInteger(shipmentID)) {
            req.reject(400, 'Shipment ID must be an integer');
            return null;
        }

        const shipment = await cds.db.run(
            SELECT.one.from(Shipments).where({ ID: shipmentID })
        );

        if (!shipment) {
            req.reject(404, 'Shipment not found');
            return null;
        }

        const userRegion = req.user.attr?.region;

        if (!userRegion || shipment.region !== userRegion) {
            req.reject(403, 'You are not authorized to modify this shipment');
            return null;
        }

        return shipment;
    }

    // 412 if the caller's expected version doesn't match the current one.
    // If the caller doesn't send expectedModifiedAt, the check is skipped
    // (keeps E1-E3 behavior and tests working unchanged).
    function guardVersion(req, shipment) {
        const expected = req.data.expectedModifiedAt;

        if (expected == null) return true;

        const current = new Date(shipment.modifiedAt).toISOString();
        const supplied = new Date(expected).toISOString();

        if (current !== supplied) {
            req.reject(412, 'Shipment was changed by someone else; reload and try again');
            return false;
        }

        return true;
    }

    // 409 if the state machine does not allow this action
    function guardTransition(req, action, shipment) {
        const result = checkTransition(action, shipment.status);

        if (!result.allowed) {
            req.reject(409, result.message);
            return null;
        }

        return result;
    }

    // Conditional update: only succeeds if status is still unchanged.
    // Writes go through cds.db directly, which bypasses the service-level
    // generic handlers that normally refresh managed fields. So we refresh
    // modifiedAt/modifiedBy ourselves here, making modifiedAt a real,
    // trustworthy version marker for guardVersion() to compare against.
    async function updateShipment(req, shipment, changes) {
        return cds.db.run(
            UPDATE(Shipments)
                .set({
                    ...changes,
                    modifiedAt: new Date().toISOString(),
                    modifiedBy: req.user.id
                })
                .where({ ID: shipment.ID, status: shipment.status })
        );
    }

    // Writes one row to the persisted audit trail for any emitted event
    async function writeAudit(eventType, data, details) {
        await cds.db.run(
            INSERT.into(AuditLog).entries({
                ID: cds.utils.uuid(),
                eventType,
                shipmentID: data.ID,
                reference: data.reference,
                details: JSON.stringify(details),
                occurredAt: new Date().toISOString(),
                performedBy: details.performedBy
            })
        );
    }

    // ---------------------------------------------------------
    // ASSIGN CARRIER
    // ---------------------------------------------------------
    this.on('assignCarrier', 'Shipments', async req => {
        const { carrierID } = req.data;

        if (!Number.isInteger(carrierID)) {
            return req.reject(400, 'Carrier ID must be an integer');
        }

        const shipment = await loadShipment(req);
        if (!shipment) return;

        if (!guardVersion(req, shipment)) return;

        const transition = guardTransition(req, 'assignCarrier', shipment);
        if (!transition) return;

        const carrierAPI = await cds.connect.to('CarrierAPI');

        const carrier = await carrierAPI.run(
            SELECT.one.from('Carriers').where({ ID: carrierID })
        );

        if (!carrier) {
            return req.reject(404, 'Carrier not found');
        }

        if (!carrier.active) {
            return req.reject(409, 'Carrier is inactive');
        }

        const affectedRows = await updateShipment(req, shipment, {
            carrier_ID: carrierID,
            status: transition.to
        });

        if (affectedRows === 0) {
            return req.reject(409, 'Shipment changed before the Carrier could be assigned');
        }

        this.emit('CarrierAssigned', {
            ID: shipment.ID,
            reference: shipment.reference,
            carrierID: carrierID,
            carrierName: carrier.name,
            assignedBy: req.user.id
        });

        return `Carrier ${carrier.name} assigned to shipment ${shipment.reference}`;
    });

    // ---------------------------------------------------------
    // REPORT EXCEPTION  (updates status + adds a history record)
    // ---------------------------------------------------------
    this.on('reportException', 'Shipments', async req => {
        const { reason } = req.data;

        if (
            typeof reason !== 'string' ||
            reason.trim().length === 0 ||
            reason.trim().length > 500
        ) {
            return req.reject(400, 'Provide an exception reason of 1 to 500 characters');
        }

        const shipment = await loadShipment(req);
        if (!shipment) return;

        if (!guardVersion(req, shipment)) return;

        const transition = guardTransition(req, 'reportException', shipment);
        if (!transition) return;

        const affectedRows = await updateShipment(req, shipment, {
            status: transition.to,
            exceptionReason: reason.trim()
        });

        if (affectedRows === 0) {
            return req.reject(409, 'Shipment changed before the exception could be reported');
        }

        // History: one record per reported exception
        await cds.db.run(
            INSERT.into(ShipmentExceptions).entries({
                ID: cds.utils.uuid(),
                shipment_ID: shipment.ID,
                reason: reason.trim()
            })
        );

        this.emit('ExceptionReported', {
            ID: shipment.ID,
            reference: shipment.reference,
            reason: reason.trim(),
            reportedBy: req.user.id
        });

        return `Exception reported for shipment ${shipment.reference}`;
    });

    // ---------------------------------------------------------
    // RESOLVE EXCEPTION  (Exception → Open, closes the open history record)
    // ---------------------------------------------------------
    this.on('resolveException', 'Shipments', async req => {
        const shipment = await loadShipment(req);
        if (!shipment) return;

        if (!guardVersion(req, shipment)) return;

        const transition = guardTransition(req, 'resolveException', shipment);
        if (!transition) return;

        const affectedRows = await updateShipment(req, shipment, {
            status: transition.to,
            exceptionReason: null
        });

        if (affectedRows === 0) {
            return req.reject(409, 'Shipment changed before the exception could be resolved');
        }

        // Close the most recent open history record, if any
        await cds.db.run(
            UPDATE(ShipmentExceptions)
                .set({
                    resolvedAt: new Date().toISOString(),
                    resolvedBy: req.user.id
                })
                .where({
                    shipment_ID: shipment.ID,
                    resolvedAt: null
                })
        );

        this.emit('ExceptionResolved', {
            ID: shipment.ID,
            reference: shipment.reference,
            resolvedBy: req.user.id
        });

        return `Exception resolved for shipment ${shipment.reference}`;
    });

    // ---------------------------------------------------------
    // CLOSE SHIPMENT
    // ---------------------------------------------------------
    this.on('closeShipment', 'Shipments', async req => {
        const shipment = await loadShipment(req);
        if (!shipment) return;

        if (!guardVersion(req, shipment)) return;

        const transition = guardTransition(req, 'closeShipment', shipment);
        if (!transition) return;

        const affectedRows = await updateShipment(req, shipment, {
            status: transition.to
        });

        if (affectedRows === 0) {
            return req.reject(409, 'Shipment changed before it could be closed');
        }

        this.emit('ShipmentClosed', {
            ID: shipment.ID,
            reference: shipment.reference,
            region: shipment.region,
            closedBy: req.user.id
        });

        return `Shipment ${shipment.reference} closed successfully`;
    });

    // ---------------------------------------------------------
    // EVENT LISTENERS (persisted audit trail)
    // ---------------------------------------------------------
    this.on('ShipmentClosed', async msg => {
        await writeAudit('ShipmentClosed', msg.data, {
            region: msg.data.region,
            performedBy: msg.data.closedBy
        });
    });

    this.on('ExceptionReported', async msg => {
        await writeAudit('ExceptionReported', msg.data, {
            reason: msg.data.reason,
            performedBy: msg.data.reportedBy
        });
    });

    this.on('ExceptionResolved', async msg => {
        await writeAudit('ExceptionResolved', msg.data, {
            performedBy: msg.data.resolvedBy
        });
    });

    this.on('CarrierAssigned', async msg => {
        await writeAudit('CarrierAssigned', msg.data, {
            carrierID: msg.data.carrierID,
            carrierName: msg.data.carrierName,
            performedBy: msg.data.assignedBy
        });
    });
});