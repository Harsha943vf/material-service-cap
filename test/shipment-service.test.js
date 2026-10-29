import cds from '@sap/cds';

const test = cds.test(import.meta.dirname + '/..');

const { GET, POST, expect } = test;

describe('ShipmentService', () => {

    beforeEach(test.data.reset);

    //
    // C8 - REGION-BASED ACCESS
    //

    it('IN viewer should see only IN shipment', async () => {
        const response = await GET(
            '/odata/v4/shipment/Shipments',
            {
                auth: {
                    username: 'viewer',
                    password: 'viewer123'
                }
            }
        );

        expect(response.status).to.equal(200);
        expect(response.data.value).to.have.length(1);

        expect(response.data.value[0].ID).to.equal(101);
        expect(response.data.value[0].region).to.equal('IN');
    });

    it('US viewer should see only US shipment', async () => {
        const response = await GET(
            '/odata/v4/shipment/Shipments',
            {
                auth: {
                    username: 'us.viewer',
                    password: 'us123'
                }
            }
        );

        expect(response.status).to.equal(200);
        expect(response.data.value).to.have.length(1);

        expect(response.data.value[0].ID).to.equal(102);
        expect(response.data.value[0].region).to.equal('US');
    });


    //
    // C8 - ROLE AUTHORIZATION
    //

    it('viewer should not be allowed to assign carrier', async () => {
        try {
            await POST(
                '/odata/v4/shipment/assignCarrier',
                {
                    shipmentID: 101,
                    carrierID: 1
                },
                {
                    auth: {
                        username: 'viewer',
                        password: 'viewer123'
                    }
                }
            );

            throw new Error('Expected request to fail');

        } catch (error) {
            expect(error.response.status).to.equal(403);
        }
    });


    //
    // C6 + C9 - ASSIGN ACTIVE CARRIER
    //

    it('operator should assign an active carrier', async () => {
        const response = await POST(
            '/odata/v4/shipment/assignCarrier',
            {
                shipmentID: 101,
                carrierID: 1
            },
            {
                auth: {
                    username: 'operator',
                    password: 'operator123'
                }
            }
        );

        expect(response.status).to.equal(200);

        const shipment = await GET(
            '/odata/v4/shipment/Shipments(101)',
            {
                auth: {
                    username: 'operator',
                    password: 'operator123'
                }
            }
        );

        expect(shipment.data.carrier_ID).to.equal(1);
    });


    //
    // C9 - INACTIVE CARRIER
    //

    it('operator should not assign an inactive carrier', async () => {
        try {
            await POST(
                '/odata/v4/shipment/assignCarrier',
                {
                    shipmentID: 101,
                    carrierID: 3
                },
                {
                    auth: {
                        username: 'operator',
                        password: 'operator123'
                    }
                }
            );

            throw new Error('Expected request to fail');

        } catch (error) {
            expect(error.response.status).to.equal(409);
            expect(error.response.data.error.message)
                .to.equal('Carrier is inactive');
        }
    });


    //
    // C6 - REPORT EXCEPTION
    //

    it('operator should report a shipment exception', async () => {
        const response = await POST(
            '/odata/v4/shipment/reportException',
            {
                shipmentID: 101,
                reason: 'Automated test exception'
            },
            {
                auth: {
                    username: 'operator',
                    password: 'operator123'
                }
            }
        );

        expect(response.status).to.equal(200);

        const shipment = await GET(
            '/odata/v4/shipment/Shipments(101)',
            {
                auth: {
                    username: 'operator',
                    password: 'operator123'
                }
            }
        );

        expect(shipment.data.status).to.equal('Exception');
        expect(shipment.data.exceptionReason)
            .to.equal('Automated test exception');
    });


    //
    // C8 - OPERATOR CANNOT CLOSE
    //

    it('operator should not be allowed to close a shipment', async () => {
        try {
            await POST(
                '/odata/v4/shipment/closeShipment',
                {
                    shipmentID: 101
                },
                {
                    auth: {
                        username: 'operator',
                        password: 'operator123'
                    }
                }
            );

            throw new Error('Expected request to fail');

        } catch (error) {
            expect(error.response.status).to.equal(403);
        }
    });


    //
    // C6 + C8 - MANAGER CLOSES SHIPMENT
    //

    it('manager should close a shipment', async () => {
        const response = await POST(
            '/odata/v4/shipment/closeShipment',
            {
                shipmentID: 101
            },
            {
                auth: {
                    username: 'manager',
                    password: 'manager123'
                }
            }
        );

        expect(response.status).to.equal(200);

        const shipment = await GET(
            '/odata/v4/shipment/Shipments(101)',
            {
                auth: {
                    username: 'manager',
                    password: 'manager123'
                }
            }
        );

        expect(shipment.data.status).to.equal('Closed');
    });


    //
    // C6 - CLOSED SHIPMENT PROTECTION
    //

    it('closed shipment should reject carrier assignment', async () => {

        await POST(
            '/odata/v4/shipment/closeShipment',
            {
                shipmentID: 101
            },
            {
                auth: {
                    username: 'manager',
                    password: 'manager123'
                }
            }
        );

        try {
            await POST(
                '/odata/v4/shipment/assignCarrier',
                {
                    shipmentID: 101,
                    carrierID: 1
                },
                {
                    auth: {
                        username: 'operator',
                        password: 'operator123'
                    }
                }
            );

            throw new Error('Expected request to fail');

        } catch (error) {
            expect(error.response.status).to.equal(409);
            expect(error.response.data.error.message)
                .to.equal('Closed shipments cannot be modified');
        }
    });


    //
    // C6 - REPEATED CLOSE
    //

    it('closing an already closed shipment should fail', async () => {

        await POST(
            '/odata/v4/shipment/closeShipment',
            {
                shipmentID: 101
            },
            {
                auth: {
                    username: 'manager',
                    password: 'manager123'
                }
            }
        );

        try {
            await POST(
                '/odata/v4/shipment/closeShipment',
                {
                    shipmentID: 101
                },
                {
                    auth: {
                        username: 'manager',
                        password: 'manager123'
                    }
                }
            );

            throw new Error('Expected request to fail');

        } catch (error) {
            expect(error.response.status).to.equal(409);
            expect(error.response.data.error.message)
                .to.equal('Shipment is already closed');
        }
    });
    it('IN operator should not assign carrier to US shipment', async () => {
    try {
        await POST(
            '/odata/v4/shipment/assignCarrier',
            {
                shipmentID: 102,
                carrierID: 1
            },
            {
                auth: {
                    username: 'operator',
                    password: 'operator123'
                }
            }
        );

        throw new Error('Expected request to fail');

    } catch (error) {
        expect(error.response.status).to.equal(403);
        expect(error.response.data.error.message)
            .to.equal('You are not authorized to modify this shipment');
    }
});


it('IN operator should not report exception for US shipment', async () => {
    try {
        await POST(
            '/odata/v4/shipment/reportException',
            {
                shipmentID: 102,
                reason: 'Cross-region test'
            },
            {
                auth: {
                    username: 'operator',
                    password: 'operator123'
                }
            }
        );

        throw new Error('Expected request to fail');

    } catch (error) {
        expect(error.response.status).to.equal(403);
        expect(error.response.data.error.message)
            .to.equal('You are not authorized to modify this shipment');
    }
});


it('IN manager should not close US shipment', async () => {
    try {
        await POST(
            '/odata/v4/shipment/closeShipment',
            {
                shipmentID: 102
            },
            {
                auth: {
                    username: 'manager',
                    password: 'manager123'
                }
            }
        );

        throw new Error('Expected request to fail');

    } catch (error) {
        expect(error.response.status).to.equal(403);
        expect(error.response.data.error.message)
            .to.equal('You are not authorized to modify this shipment');
    }
});

});