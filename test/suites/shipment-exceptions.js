export default function (test) {
    const { GET, POST, expect } = test;

    const users = {
        viewer:   { username: 'viewer',    password: 'viewer123' },
        usViewer: { username: 'us.viewer', password: 'us123' },
        operator: { username: 'operator',  password: 'operator123' },
        manager:  { username: 'manager',   password: 'manager123' }
    };

    const base = '/odata/v4/shipment';
    const call = (id, name, body, user) =>
        POST(`${base}/Shipments(${id})/ShipmentService.${name}`, body, { auth: user });

    describe('Shipment exception history (E3)', () => {

        beforeEach(test.data.reset);

        it('reporting an exception creates one history record', async () => {
            await call(101, 'reportException', { reason: 'Delayed at hub' }, users.operator);

            const { data } = await GET(`${base}/Shipments(101)?$expand=exceptions`, { auth: users.operator });

            expect(data.exceptions).to.have.length(1);
            expect(data.exceptions[0].reason).to.equal('Delayed at hub');
            expect(data.exceptions[0].resolvedAt).to.equal(null);
            expect(data.exceptionReason).to.equal('Delayed at hub');
        });

        it('reporting twice creates two history records', async () => {
            await call(101, 'reportException', { reason: 'First reason' }, users.operator);
            await call(101, 'resolveException', {}, users.operator);
            await call(101, 'reportException', { reason: 'Second reason' }, users.operator);

            const { data } = await GET(`${base}/Shipments(101)?$expand=exceptions`, { auth: users.operator });

            expect(data.exceptions).to.have.length(2);
            expect(data.exceptionReason).to.equal('Second reason');
        });

        it('resolving marks the open record as resolved', async () => {
            await call(101, 'reportException', { reason: 'Weather delay' }, users.operator);
            await call(101, 'resolveException', {}, users.operator);

            const { data } = await GET(`${base}/Shipments(101)?$expand=exceptions`, { auth: users.operator });

            expect(data.exceptions).to.have.length(1);
            expect(data.exceptions[0].resolvedAt).to.not.equal(null);
            expect(data.exceptions[0].resolvedBy).to.equal('operator');
            expect(data.exceptionReason).to.equal(null);
        });

        it('US viewer cannot read IN shipment history', async () => {
            await call(101, 'reportException', { reason: 'Delayed' }, users.operator);

            try {
                await GET(`${base}/Shipments(101)?$expand=exceptions`, { auth: users.usViewer });
                throw new Error('Expected request to fail');
            } catch (error) {
                if (!error.response) throw error;
                expect(error.response.status).to.equal(404);
            }
        });

        it('ShipmentExceptions cannot be created directly', async () => {
            try {
                await POST(`${base}/ShipmentExceptions`,
                    { shipment_ID: 101, reason: 'Manual insert attempt' },
                    { auth: users.manager }
                );
                throw new Error('Expected request to fail');
            } catch (error) {
                if (!error.response) throw error;
                expect(error.response.status).to.equal(405);
            }
        });
    });
}