export default function (test) {
    const { GET, POST, expect } = test;

    const manager = { username: 'manager', password: 'manager123' };
    const base = '/odata/v4/shipment';
    const call = (id, name, body, user) =>
        POST(`${base}/Shipments(${id})/ShipmentService.${name}`, body, { auth: user });

    describe('Shipment version concurrency (E4)', () => {

        beforeEach(test.data.reset);

        it('action without expectedModifiedAt still works (backward compatible)', async () => {
            const res = await call(101, 'closeShipment', {}, manager);
            expect(res.status).to.equal(200);
        });

        it('action with correct expectedModifiedAt succeeds', async () => {
            const { data } = await GET(`${base}/Shipments(101)`, { auth: manager });

            const res = await call(101, 'closeShipment',
                { expectedModifiedAt: data.modifiedAt }, manager);

            expect(res.status).to.equal(200);
        });

        it('action with stale expectedModifiedAt fails with 412', async () => {
            const { data } = await GET(`${base}/Shipments(101)`, { auth: manager });
            const staleVersion = data.modifiedAt;

            // Change the shipment first, so modifiedAt moves forward
            await call(101, 'reportException', { reason: 'Delay' }, manager);

            try {
                await call(101, 'closeShipment',
                    { expectedModifiedAt: staleVersion }, manager);
                throw new Error('Expected request to fail');
            } catch (error) {
                if (!error.response) throw error;
                expect(error.response.status).to.equal(412);
            }
        });
    });
}
