import cds from '@sap/cds';

export default cds.service.impl(function () {
    const { Shipments } = cds.entities('shipment.practice');
    const { SELECT, UPDATE } = cds.ql;

    // ---------------------------------------------------------
    // HELPERS
    // ---------------------------------------------------------

    // Reads the bound shipment key from the URL: Shipments(101)/...
    function getShipmentID(req) {
        const param = req.params?.[0];
        return typeof param === 'object' ? param?.ID : param;
    }

    // Loads the shipment and applies the shared checks:
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

    // ---------------------------------------------------------
    // ASSIGN CARRIER  (bound to Shipments)
    // ---------------------------------------------------------
    this.on('assignCarrier', 'Shipments', async req => {
        const { carrierID } = req.data;

        if (!Number.isInteger(carrierID)) {
            return req.reject(400, 'Carrier ID must be an integer');
        }

        const shipment = await loadShipment(req);
        if (!shipment) return;

        if (shipment.status === 'Closed') {
            return req.reject(409, 'Closed shipments cannot be modified');
        }

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

        const affectedRows = await cds.db.run(
            UPDATE(Shipments)
                .set({ carrier_ID: carrierID })
                .where({ ID: shipment.ID, status: shipment.status })
        );

        if (affectedRows === 0) {
            return req.reject(409, 'Shipment changed before the Carrier could be assigned');
        }

        return `Carrier ${carrier.name} assigned to shipment ${shipment.reference}`;
    });

    // ---------------------------------------------------------
    // REPORT EXCEPTION  (bound to Shipments)
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

        if (shipment.status === 'Closed') {
            return req.reject(409, 'Closed shipments cannot be modified');
        }

        const affectedRows = await cds.db.run(
            UPDATE(Shipments)
                .set({ status: 'Exception', exceptionReason: reason.trim() })
                .where({ ID: shipment.ID, status: shipment.status })
        );

        if (affectedRows === 0) {
            return req.reject(409, 'Shipment changed before the exception could be reported');
        }

        return `Exception reported for shipment ${shipment.reference}`;
    });

    // ---------------------------------------------------------
    // CLOSE SHIPMENT  (bound to Shipments)
    // ---------------------------------------------------------
    this.on('closeShipment', 'Shipments', async req => {
        const shipment = await loadShipment(req);
        if (!shipment) return;

        if (shipment.status === 'Closed') {
            return req.reject(409, 'Shipment is already closed');
        }

        const affectedRows = await cds.db.run(
            UPDATE(Shipments)
                .set({ status: 'Closed' })
                .where({ ID: shipment.ID, status: shipment.status })
        );

        if (affectedRows === 0) {
            return req.reject(409, 'Shipment changed before it could be closed');
        }

        return `Shipment ${shipment.reference} closed successfully`;
    });
});