import { checkTransition, Status } from '../../srv/lib/shipment-state.js';

export default function (test) {
    const { GET, POST, expect } = test;

    const users = {
        viewer:   { username: 'viewer',   password: 'viewer123' },
        operator: { username: 'operator', password: 'operator123' },
        manager:  { username: 'manager',  password: 'manager123' }
    };

    const base = '/odata/v4/shipment';
    const call = (id, name, body, user) =>
        POST(`${base}/Shipments(${id})/ShipmentService.${name}`, body, { auth: user });
    const read = id => GET(`${base}/Shipments(${id})`, { auth: users.operator });

    async function expectFail(promise, statuses, message) {
        try {
            await promise;
            throw new Error('Expected request to fail');
        } catch (error) {
            if (!error.response) throw error;
            expect(statuses).to.include(error.response.status);
            if (message) {
                expect(error.response.data.error.message).to.equal(message);
            }
        }
    }

    // ---------------- UNIT: state machine rules ----------------
    describe('Shipment state machine (unit)', () => {

        it('allows Open → Closed', () => {
            const r = checkTransition('closeShipment', Status.Open);
            expect(r.allowed).to.equal(true);
            expect(r.to).to.equal(Status.Closed);
        });

        it('keeps status unchanged for assignCarrier', () => {
            const r = checkTransition('assignCarrier', Status.Exception);
            expect(r.allowed).to.equal(true);
            expect(r.to).to.equal(Status.Exception);
        });

        it('blocks every action on Closed', () => {
            for (const action of ['assignCarrier', 'reportException', 'resolveException', 'closeShipment']) {
                expect(checkTransition(action, Status.Closed).allowed).to.equal(false);
            }
        });

        it('rejects an unknown action', () => {
            expect(checkTransition('deleteShipment', Status.Open).allowed).to.equal(false);
        });
    });

    // ---------------- INTEGRATION: lifecycle via HTTP ----------------
    describe('Shipment lifecycle (E2)', () => {

        beforeEach(test.data.reset);

        it('Open → Exception → Open via resolveException', async () => {
            await call(101, 'reportException', { reason: 'Delayed' }, users.operator);

            const res = await call(101, 'resolveException', {}, users.operator);
            expect(res.status).to.equal(200);

            const { data } = await read(101);
            expect(data.status).to.equal('Open');
            expect(data.exceptionReason).to.equal(null);
        });

        it('resolving an Open shipment fails', async () => {
            await expectFail(
                call(101, 'resolveException', {}, users.operator),
                [409],
                'Only shipments in Exception status can be resolved'
            );
        });

        it('resolving a Closed shipment fails', async () => {
            await call(101, 'closeShipment', {}, users.manager);
            await expectFail(
                call(101, 'resolveException', {}, users.operator),
                [409],
                'Closed shipments cannot be modified'
            );
        });

        it('reporting an exception on a Closed shipment fails', async () => {
            await call(101, 'closeShipment', {}, users.manager);
            await expectFail(
                call(101, 'reportException', { reason: 'Too late' }, users.operator),
                [409],
                'Closed shipments cannot be modified'
            );
        });

        it('Exception → Closed is allowed', async () => {
            await call(101, 'reportException', { reason: 'Damaged' }, users.operator);

            const res = await call(101, 'closeShipment', {}, users.manager);
            expect(res.status).to.equal(200);

            const { data } = await read(101);
            expect(data.status).to.equal('Closed');
        });

        it('assignCarrier in Exception keeps status Exception', async () => {
            await call(101, 'reportException', { reason: 'Delayed' }, users.operator);
            await call(101, 'assignCarrier', { carrierID: 2 }, users.operator);

            const { data } = await read(101);
            expect(data.status).to.equal('Exception');
            expect(data.carrier_ID).to.equal(2);
        });

        it('reporting twice updates the reason', async () => {
            await call(101, 'reportException', { reason: 'First' }, users.operator);
            await call(101, 'reportException', { reason: 'Second' }, users.operator);

            const { data } = await read(101);
            expect(data.exceptionReason).to.equal('Second');
        });

        it('viewer cannot resolve an exception', async () => {
            await expectFail(
                call(101, 'resolveException', {}, users.viewer),
                [403]
            );
        });

        it('IN operator cannot resolve US shipment', async () => {
            await expectFail(
                call(102, 'resolveException', {}, users.operator),
                [403]
            );
        });
    });
}