import cds from '@sap/cds';

const test = cds.test(import.meta.dirname + '/..');
const { GET, POST, expect } = test;

// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------
const users = {
    viewer:   { username: 'viewer',    password: 'viewer123' },
    usViewer: { username: 'us.viewer', password: 'us123' },
    operator: { username: 'operator',  password: 'operator123' },
    manager:  { username: 'manager',   password: 'manager123' }
};

const base = '/odata/v4/shipment';

// Bound action URL: /Shipments(101)/ShipmentService.closeShipment
const action = (id, name) => `${base}/Shipments(${id})/ShipmentService.${name}`;

// Calls a bound action
const call = (id, name, body, user) =>
    POST(action(id, name), body, { auth: user });

// Expects a request to fail with one of the given status codes
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

describe('ShipmentService (bound actions)', () => {

    beforeEach(test.data.reset);

    // ---------------- REGION READ ----------------

    it('IN viewer sees only IN shipment', async () => {
        const { status, data } = await GET(`${base}/Shipments`, { auth: users.viewer });
        expect(status).to.equal(200);
        expect(data.value).to.have.length(1);
        expect(data.value[0]).to.include({ ID: 101, region: 'IN' });
    });

    it('US viewer sees only US shipment', async () => {
        const { status, data } = await GET(`${base}/Shipments`, { auth: users.usViewer });
        expect(status).to.equal(200);
        expect(data.value).to.have.length(1);
        expect(data.value[0]).to.include({ ID: 102, region: 'US' });
    });

    // ---------------- ROLE AUTHORIZATION ----------------

    it('viewer cannot assign carrier', async () => {
        await expectFail(
            call(101, 'assignCarrier', { carrierID: 1 }, users.viewer),
            [403]
        );
    });

    it('operator cannot close shipment', async () => {
        await expectFail(
            call(101, 'closeShipment', {}, users.operator),
            [403]
        );
    });

    // ---------------- ASSIGN CARRIER ----------------

    it('operator assigns an active carrier', async () => {
        const res = await call(101, 'assignCarrier', { carrierID: 1 }, users.operator);
        expect(res.status).to.equal(200);

        const { data } = await GET(`${base}/Shipments(101)`, { auth: users.operator });
        expect(data.carrier_ID).to.equal(1);
    });

    it('inactive carrier is rejected', async () => {
        await expectFail(
            call(101, 'assignCarrier', { carrierID: 3 }, users.operator),
            [409],
            'Carrier is inactive'
        );
    });

    it('unknown carrier is rejected', async () => {
        await expectFail(
            call(101, 'assignCarrier', { carrierID: 99999 }, users.operator),
            [404],
            'Carrier not found'
        );
    });

    // ---------------- REGION WRITE ----------------

    it('IN operator cannot assign carrier to US shipment', async () => {
        await expectFail(
            call(102, 'assignCarrier', { carrierID: 1 }, users.operator),
            [403, 404]
        );
    });

    it('IN operator cannot report exception on US shipment', async () => {
        await expectFail(
            call(102, 'reportException', { reason: 'Cross-region test' }, users.operator),
            [403, 404]
        );
    });

    it('IN manager cannot close US shipment', async () => {
        await expectFail(
            call(102, 'closeShipment', {}, users.manager),
            [403, 404]
        );
    });

    // ---------------- REPORT EXCEPTION ----------------

    it('operator reports an exception', async () => {
        const res = await call(101, 'reportException',
            { reason: 'Automated test exception' }, users.operator);
        expect(res.status).to.equal(200);

        const { data } = await GET(`${base}/Shipments(101)`, { auth: users.operator });
        expect(data.status).to.equal('Exception');
        expect(data.exceptionReason).to.equal('Automated test exception');
    });

    it('empty exception reason is rejected', async () => {
        await expectFail(
            call(101, 'reportException', { reason: '' }, users.operator),
            [400]
        );
    });

    // ---------------- CLOSE SHIPMENT ----------------

    it('manager closes a shipment', async () => {
        const res = await call(101, 'closeShipment', {}, users.manager);
        expect(res.status).to.equal(200);

        const { data } = await GET(`${base}/Shipments(101)`, { auth: users.manager });
        expect(data.status).to.equal('Closed');
    });

    it('closed shipment rejects carrier assignment', async () => {
        await call(101, 'closeShipment', {}, users.manager);
        await expectFail(
            call(101, 'assignCarrier', { carrierID: 1 }, users.operator),
            [409],
            'Closed shipments cannot be modified'
        );
    });

    it('closing twice fails', async () => {
        await call(101, 'closeShipment', {}, users.manager);
        await expectFail(
            call(101, 'closeShipment', {}, users.manager),
            [409],
            'Shipment is already closed'
        );
    });
});