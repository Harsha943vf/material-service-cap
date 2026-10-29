import cds from '@sap/cds';

export default cds.service.impl(function () {
    const { Shipments } = cds.entities('shipment.practice');
    const { SELECT, UPDATE } = cds.ql;

    // ---------------------------------------------------------
    // ASSIGN CARRIER
    // ---------------------------------------------------------
    this.on('assignCarrier', async req => {
        const { shipmentID, carrierID } = req.data;

        if (
            !Number.isInteger(shipmentID) ||
            !Number.isInteger(carrierID)
        ) {
            return req.reject(
                400,
                'Shipment ID and Carrier ID must be integers'
            );
        }

        const shipment = await cds.db.run(
            SELECT.one
                .from(Shipments)
                .where({ ID: shipmentID })
        );

        if (!shipment) {
            return req.reject(404, 'Shipment not found');
        }

        // Region authorization
        const userRegion = req.user.attr?.region;

        if (!userRegion || shipment.region !== userRegion) {
            return req.reject(
                403,
                'You are not authorized to modify this shipment'
            );
        }

        if (shipment.status === 'Closed') {
            return req.reject(
                409,
                'Closed shipments cannot be modified'
            );
        }

        const carrierAPI = await cds.connect.to('CarrierAPI');

        const carrier = await carrierAPI.run(
            SELECT.one
                .from('Carriers')
                .where({ ID: carrierID })
        );

        if (!carrier) {
            return req.reject(404, 'Carrier not found');
        }

        if (!carrier.active) {
            return req.reject(
                409,
                'Carrier is inactive'
            );
        }

        const affectedRows = await cds.db.run(
            UPDATE(Shipments)
                .set({ carrier_ID: carrierID })
                .where({
                    ID: shipmentID,
                    status: shipment.status
                })
        );

        if (affectedRows === 0) {
            return req.reject(
                409,
                'Shipment changed before the Carrier could be assigned'
            );
        }

        return `Carrier ${carrier.name} assigned to shipment ${shipment.reference}`;
    });

    // ---------------------------------------------------------
    // REPORT EXCEPTION
    // ---------------------------------------------------------
    this.on('reportException', async req => {
        const { shipmentID, reason } = req.data;

        if (!Number.isInteger(shipmentID)) {
            return req.reject(
                400,
                'Shipment ID must be an integer'
            );
        }

        if (
            typeof reason !== 'string' ||
            reason.trim().length === 0 ||
            reason.trim().length > 500
        ) {
            return req.reject(
                400,
                'Provide an exception reason of 1 to 500 characters'
            );
        }

        const shipment = await cds.db.run(
            SELECT.one
                .from(Shipments)
                .where({ ID: shipmentID })
        );

        if (!shipment) {
            return req.reject(404, 'Shipment not found');
        }

        // Region authorization
        const userRegion = req.user.attr?.region;

        if (!userRegion || shipment.region !== userRegion) {
            return req.reject(
                403,
                'You are not authorized to modify this shipment'
            );
        }

        if (shipment.status === 'Closed') {
            return req.reject(
                409,
                'Closed shipments cannot be modified'
            );
        }

        const affectedRows = await cds.db.run(
            UPDATE(Shipments)
                .set({
                    status: 'Exception',
                    exceptionReason: reason.trim()
                })
                .where({
                    ID: shipmentID,
                    status: shipment.status
                })
        );

        if (affectedRows === 0) {
            return req.reject(
                409,
                'Shipment changed before the exception could be reported'
            );
        }

        return `Exception reported for shipment ${shipment.reference}`;
    });

    // ---------------------------------------------------------
    // CLOSE SHIPMENT
    // ---------------------------------------------------------
    this.on('closeShipment', async req => {
        const { shipmentID } = req.data;

        if (!Number.isInteger(shipmentID)) {
            return req.reject(
                400,
                'Shipment ID must be an integer'
            );
        }

        const shipment = await cds.db.run(
            SELECT.one
                .from(Shipments)
                .where({ ID: shipmentID })
        );

        if (!shipment) {
            return req.reject(404, 'Shipment not found');
        }

        // Region authorization
        const userRegion = req.user.attr?.region;

        if (!userRegion || shipment.region !== userRegion) {
            return req.reject(
                403,
                'You are not authorized to modify this shipment'
            );
        }

        if (shipment.status === 'Closed') {
            return req.reject(
                409,
                'Shipment is already closed'
            );
        }

        const affectedRows = await cds.db.run(
            UPDATE(Shipments)
                .set({ status: 'Closed' })
                .where({
                    ID: shipmentID,
                    status: shipment.status
                })
        );

        if (affectedRows === 0) {
            return req.reject(
                409,
                'Shipment changed before it could be closed'
            );
        }

        return `Shipment ${shipment.reference} closed successfully`;
    });
});