import cds from '@sap/cds';

export default cds.service.impl(function () {

    this.before(['CREATE', 'UPDATE'], 'Materials', req => {
        console.log('Quantity validation:', req.event, req.data);

        const { quantity } = req.data;

        if (req.event === 'UPDATE' && quantity === undefined) {
            return;
        }

        if (!Number.isInteger(quantity) || quantity <= 0) {
            return req.reject(
                400,
                'Quantity must be a positive integer'
            );
        }
    });

    this.after('CREATE', 'Materials', material => {
        console.log(
            `Material created: ${material.ID} - ${material.name}`
        );
    });

    this.on(
    ['getMaterialQuantity', 'readMaterialQuantity'],
    async req => {
        const { materialID } = req.data;

        if (materialID == null) {
            return req.reject(400, 'Material ID is required');
        }

        const { Materials } = cds.entities('material.service');
        const { SELECT } = cds.ql;

        const query = SELECT.one
            .from(Materials)
            .where({ ID: materialID });

        console.log('Generated CQN:');
        console.log(JSON.stringify(query, null, 2));

        const material = await cds.db.run(query);

        if (!material) {
            return req.reject(404, 'Material not found');
        }

        return material.quantity;
    });
    this.on('testRollback', async req => {
    const { materialID } = req.data;

    if (materialID == null) {
        return req.reject(400, 'Material ID is required');
    }

    const { Materials } = cds.entities('material.service');
    const { UPDATE } = cds.ql;

    const affectedRows = await cds.db.run(
        UPDATE(Materials)
            .set({ quantity: 999 })
            .where({ ID: materialID })
    );

    if (affectedRows === 0) {
        return req.reject(404, 'Material not found');
    }

    // Deliberately fail after the database update.
    return req.reject(400, 'Practice failure: update rolled back');
});
this.on('checkQuantity', req => {
    const { quantity } = req.data;

    if (!Number.isInteger(quantity) || quantity <= 0) {
        return req.reject(
            400,
            'Quantity must be a positive integer'
        );
    }

    return 'Quantity is valid';
});

this.on('setMaterialQuantity', async req => {
    const { materialID, quantity } = req.data;

    if (materialID == null) {
        return req.reject(400, 'Material ID is required');
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
        return req.reject(
            400,
            'Quantity must be a positive integer'
        );
    }

    const { Materials } = cds.entities('material.service');
    const { UPDATE } = cds.ql;

    const affectedRows = await cds.db.run(
        UPDATE(Materials)
            .set({ quantity })
            .where({ ID: materialID })
    );

    if (affectedRows === 0) {
        return req.reject(404, 'Material not found');
    }

    return `Material ${materialID} quantity updated to ${quantity}`;
});
});